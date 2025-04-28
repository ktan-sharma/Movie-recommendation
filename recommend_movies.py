import firebase_admin
from firebase_admin import credentials, firestore
import requests
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import numpy as np

# --- CONFIG ---

def tmdb_to_imdb(tmdb_id):
    """
    Given a TMDB movie ID (as string or int), return the corresponding IMDB ID.
    """
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US"
    r = requests.get(url)
    data = r.json()
    return data.get("imdb_id")

SERVICE_ACCOUNT_PATH = 'flickpick-23118-firebase-adminsdk-fbsvc-4747d58b26.json'
TMDB_API_KEY = '5e338db773fdec4213f2c68748ff8d36'  # <-- Your TMDB API key

# --- FIREBASE INIT ---
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- FETCH REVIEWS FROM FIRESTORE ---
def get_all_reviews():
    reviews_ref = db.collection('reviews')
    return [doc.to_dict() for doc in reviews_ref.stream()]

def get_movie_metadata(movie_id):
    # Only support TMDB IDs (accepts 'tmdb:123' or '123')
    if movie_id.startswith('tmdb:'):
        tmdb_id = movie_id.split(':')[1]
    else:
        tmdb_id = movie_id
    tmdb_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US"
    r = requests.get(tmdb_url)
    data = r.json()
    if data.get('genres') and data.get('overview'):
        genres = ', '.join([g['name'] for g in data['genres']])
        return {
            'id': movie_id,
            'title': data.get('title', ''),
            'genres': genres,
            'plot': data.get('overview', ''),
            'poster_path': data.get('poster_path', ''),  # Always include poster_path for frontend
        }
    return None

# --- MAIN RECOMMENDATION LOGIC ---
def build_recommendations():
    print('Fetching reviews...')
    reviews = get_all_reviews()
    user_reviews = {}
    for review in reviews:
        user_reviews.setdefault(review['userId'], []).append(review)

    print('Fetching movie metadata...')
    movie_ids = set(r['movieId'] for r in reviews)
    movie_metadata = {}
    for mid in tqdm(movie_ids):
        meta = get_movie_metadata(mid)
        if meta and (meta['genres'].strip() or meta['plot'].strip()):
            movie_metadata[mid] = meta
        else:
            print(f'WARN: No metadata for movie {mid}')

    print('Building feature matrix...')
    base_movie_texts = []
    movie_id_list = []
    for mid, meta in movie_metadata.items():
        text = f"{meta['genres']} {meta['plot']}"
        base_movie_texts.append(text)
        movie_id_list.append(mid)

    print('DEBUG: movie_metadata:', movie_metadata)
    print('DEBUG: movie_texts:', base_movie_texts)

    if not base_movie_texts:
        print('ERROR: No movie metadata found. Check your movie IDs and OMDb/TMDB API keys.')
        return

    vectorizer = TfidfVectorizer(stop_words='english')
    base_X = vectorizer.fit_transform(base_movie_texts)

    print('Computing recommendations for each user...')
    # --- Get ALL users ---
    user_docs = db.collection('users').stream()
    user_ids = [doc.id for doc in user_docs]
    print(f'Found {len(user_ids)} users.')
    for user_id in user_ids:
        print(f'Processing user: {user_id}')
        try:
            generate_recommendations_for_user(user_id, movie_id_list, base_movie_texts, base_X, vectorizer, movie_metadata, user_reviews)
        except Exception as e:
            print(f'Error processing user {user_id}: {e}')

def generate_recommendations_for_user(user_id, movie_id_list, base_movie_texts, base_X, vectorizer, movie_metadata, user_reviews):
    movie_texts = list(base_movie_texts)
    X = base_X
    user_doc_ref = db.collection('users').document(user_id)
    user_doc = user_doc_ref.get()
    print(f'User {user_id} doc: {user_doc.to_dict() if user_doc.exists else None}')
    print(f'User {user_id} reviews: {user_reviews.get(user_id, [])}')
    user_dict = user_doc.to_dict() if user_doc.exists else {}
    prefs = user_dict.get('preferences', {})
    genres = prefs.get('genres', [])
    language = prefs.get('language', 'en')
    watchlist = user_dict.get('watchlist', [])

    tmdb_genre_map = {
        'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35, 'Crime': 80, 'Documentary': 99,
        'Drama': 18, 'Family': 10751, 'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
        'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878, 'TV Movie': 10770, 'Thriller': 53,
        'War': 10752, 'Western': 37
    }
    genre_ids = [str(tmdb_genre_map[g]) for g in genres if g in tmdb_genre_map]

    # Use reviews specific to this user
    reviews = user_reviews.get(user_id, [])
    liked_movies = [r['movieId'] for r in reviews if r.get('rating', 0) >= 4]
    for wid in watchlist:
        if wid not in liked_movies and wid in movie_id_list:
            liked_movies.append(wid)

    def to_tmdb_id(mid):
        # If already a TMDB ID (all digits), return as is
        if str(mid).isdigit():
            return str(mid)
        # If IMDb ID, convert
        if str(mid).startswith('tt'):
            find_url = f"https://api.themoviedb.org/3/find/{mid}?api_key={TMDB_API_KEY}&language=en-US&external_source=imdb_id"
            r = requests.get(find_url)
            data = r.json()
            if data.get('movie_results') and len(data['movie_results']) > 0:
                return str(data['movie_results'][0]['id'])
        return None

    # Convert liked_movies to TMDB IDs for ML
    liked_movies_tmdb = [to_tmdb_id(mid) for mid in liked_movies]
    liked_movies_tmdb = [mid for mid in liked_movies_tmdb if mid and mid in movie_id_list]

    # --- Preference-based expansion ---
    if genre_ids:
        extra_tmdb_ids = set()
        for page in range(1, 4):
            tmdb_url = f"https://api.themoviedb.org/3/discover/movie?api_key={TMDB_API_KEY}&with_genres={','.join(genre_ids)}&language={language}&sort_by=popularity.desc&page={page}"
            resp = requests.get(tmdb_url)
            data = resp.json()
            results = data.get('results', [])
            for m in results:
                extra_tmdb_ids.add(str(m['id']))
        for tmdb_id in extra_tmdb_ids:
            if tmdb_id not in movie_metadata:
                meta = get_movie_metadata(tmdb_id)
                if meta and (meta['genres'].strip() or meta['plot'].strip()):
                    movie_metadata[tmdb_id] = meta
                    movie_id_list.append(tmdb_id)
                    movie_texts.append(f"{meta['genres']} {meta['plot']}")
        # After expanding, rebuild the feature matrix for this user
        X = vectorizer.fit_transform(movie_texts)

    # --- ML-based scores ---
    ml_scores = None
    liked_indices = [movie_id_list.index(mid) for mid in liked_movies_tmdb if mid in movie_id_list]
    if liked_indices:
        user_vec = np.asarray(X[liked_indices].mean(axis=0)).reshape(1, -1)
        ml_scores = cosine_similarity(user_vec, X).flatten()
        for idx in liked_indices:
            ml_scores[idx] = -1
        # --- Preference-based expansion ---
        if genre_ids:
            extra_tmdb_ids = set()
            for page in range(1, 4):
                tmdb_url = f"https://api.themoviedb.org/3/discover/movie?api_key={TMDB_API_KEY}&with_genres={','.join(genre_ids)}&language={language}&sort_by=popularity.desc&page={page}"
                resp = requests.get(tmdb_url)
                data = resp.json()
                results = data.get('results', [])
                for m in results:
                    extra_tmdb_ids.add(str(m['id']))
            for tmdb_id in extra_tmdb_ids:
                if tmdb_id not in movie_metadata:
                    meta = get_movie_metadata(tmdb_id)
                    if meta and (meta['genres'].strip() or meta['plot'].strip()):
                        movie_metadata[tmdb_id] = meta
                        movie_id_list.append(tmdb_id)
                        movie_texts.append(f"{meta['genres']} {meta['plot']}")
            # After expanding, rebuild the feature matrix for this user
            X = vectorizer.fit_transform(movie_texts)

        # --- ML-based scores ---
        ml_scores = None
        liked_indices = [movie_id_list.index(mid) for mid in liked_movies_tmdb if mid in movie_id_list]
        if liked_indices:
            user_vec = np.asarray(X[liked_indices].mean(axis=0)).reshape(1, -1)
            ml_scores = cosine_similarity(user_vec, X).flatten()
            for idx in liked_indices:
                ml_scores[idx] = -1

        # --- Preference-based scores ---
        pref_scores = None
        if genre_ids:
            pref_scores = np.zeros(len(movie_id_list))
            for i, mid in enumerate(movie_id_list):
                meta = movie_metadata[mid]
                # Score 1.0 if genre matches, 0.0 otherwise (could be improved with partial match)
                if any(g in meta['genres'] for g in genres):
                    pref_scores[i] += 1.0
                # Bonus if language matches (not always available in meta)
                # (Assume language is not available in meta, so skip for now)

        # --- Watchlist-only fallback: if no ratings but has watchlist ---
        watchlist_scores = None
        if not liked_indices and watchlist:
            watchlist_scores = np.zeros(len(movie_id_list))
            for i, mid in enumerate(movie_id_list):
                if mid in watchlist:
                    watchlist_scores[i] += 1.0

        # --- Blending ---
        def all_tmdb_ids(id_list):
            # Convert all IDs in id_list to TMDB IDs and filter out any that fail
            tmdb_ids = [to_tmdb_id(mid) for mid in id_list]
            return [mid for mid in tmdb_ids if mid]

        if ml_scores is not None and pref_scores is not None:
            # Normalize both
            ml_norm = (ml_scores - np.min(ml_scores)) / (np.ptp(ml_scores) + 1e-8)
            pref_norm = (pref_scores - np.min(pref_scores)) / (np.ptp(pref_scores) + 1e-8) if np.ptp(pref_scores) > 0 else pref_scores
            blend = 0.6 * ml_norm + 0.4 * pref_norm
            for idx in liked_indices:
                blend[idx] = -1
            top_indices = blend.argsort()[-10:][::-1]
            recommended_ids = [movie_id_list[i] for i in top_indices]
            recommended_ids = all_tmdb_ids(recommended_ids)
            print(f'Writing recommendations for user {user_id}: {recommended_ids}')
            db.collection('recommendations').document(user_id).set({'movieIds': recommended_ids})
            print(f'Blended recommendations for user {user_id}: {recommended_ids}')
        elif ml_scores is not None:
            top_indices = ml_scores.argsort()[-10:][::-1]
            recommended_ids = [movie_id_list[i] for i in top_indices]
            recommended_ids = all_tmdb_ids(recommended_ids)
            print(f'Writing recommendations for user {user_id}: {recommended_ids}')
            db.collection('recommendations').document(user_id).set({'movieIds': recommended_ids})
            print(f'ML-only recommendations for user {user_id}: {recommended_ids}')
        elif pref_scores is not None:
            top_indices = pref_scores.argsort()[-10:][::-1]
            recommended_ids = [movie_id_list[i] for i in top_indices if pref_scores[i] > 0][:10]
            recommended_ids = all_tmdb_ids(recommended_ids)
            print(f'Writing recommendations for user {user_id}: {recommended_ids}')
            db.collection('recommendations').document(user_id).set({'movieIds': recommended_ids})
            print(f'Preference-only recommendations for user {user_id}: {recommended_ids}')
        elif watchlist_scores is not None:
            top_indices = watchlist_scores.argsort()[-10:][::-1]
            recommended_ids = [movie_id_list[i] for i in top_indices if watchlist_scores[i] > 0][:10]
            recommended_ids = all_tmdb_ids(recommended_ids)
            print(f'Writing recommendations for user {user_id}: {recommended_ids}')
            db.collection('recommendations').document(user_id).set({'movieIds': recommended_ids})
            print(f'Watchlist-only recommendations for user {user_id}: {recommended_ids}')
        else:
            print(f'No recommendations possible for user {user_id} (no ratings, watchlist, or preferences).')

# --- API-friendly function ---
def get_recommendations_api(user_id):
    print('Fetching reviews...')
    reviews = get_all_reviews()
    user_reviews = {}
    for review in reviews:
        user_reviews.setdefault(review['userId'], []).append(review)

    print('Fetching movie metadata...')
    movie_ids = set(r['movieId'] for r in reviews)
    movie_metadata = {}
    for mid in tqdm(movie_ids):
        meta = get_movie_metadata(mid)
        if meta and (meta['genres'].strip() or meta['plot'].strip()):
            movie_metadata[mid] = meta
        else:
            print(f'WARN: No metadata for movie {mid}')

    print('Building feature matrix...')
    base_movie_texts = []
    movie_id_list = []
    for mid, meta in movie_metadata.items():
        text = f"{meta['genres']} {meta['plot']}"
        base_movie_texts.append(text)
        movie_id_list.append(mid)

    print('DEBUG: movie_metadata:', movie_metadata)
    print('DEBUG: movie_texts:', base_movie_texts)

    if not base_movie_texts:
        print('ERROR: No movie metadata found. Check your movie IDs and OMDb/TMDB API keys.')
        return []

    vectorizer = TfidfVectorizer(stop_words='english')
    base_X = vectorizer.fit_transform(base_movie_texts)

    # --- Fetch user preferences (survey) ---
    user_doc_ref = db.collection('users').document(user_id)
    user_doc = user_doc_ref.get()
    user_dict = user_doc.to_dict() if user_doc.exists else {}
    prefs = user_dict.get('preferences', {})
    genres = prefs.get('genres', [])
    language = prefs.get('language', 'en')

    # --- Map user's watchlist TMDB IDs to IMDB IDs ---
    watchlist_tmdb_ids = user_dict.get('watchlist', [])
    watchlist_imdb_ids = []
    for tmdb_id in watchlist_tmdb_ids:
        imdb_id = tmdb_to_imdb(tmdb_id)
        if imdb_id:
            watchlist_imdb_ids.append(imdb_id)
    print(f"[DEBUG] User {user_id} watchlist TMDB IDs: {watchlist_tmdb_ids}")
    print(f"[DEBUG] User {user_id} mapped IMDB IDs: {watchlist_imdb_ids}")
    # Now use watchlist_imdb_ids for embedding-based recommendations!
    # --- Debug output for preferences and fallback logic ---
    print(f"[DEBUG] User {user_id} preferences: genres={genres}, language={language}")
    user_has_reviews = bool(user_reviews.get(user_id))
    user_has_watchlist = bool(user_dict.get('watchlist'))
    print(f"[DEBUG] User {user_id} has_reviews={user_has_reviews}, has_watchlist={user_has_watchlist}")

    # --- Embedding-based Recommendations (if user has watchlist or reviews) ---
    import os
    from movie_embeddings import MovieEmbeddingManager
    from sklearn.metrics.pairwise import cosine_similarity

    all_movie_texts = {}
    for mid, meta in movie_metadata.items():
        text = f"{meta['genres']} {meta['plot']}"
        all_movie_texts[mid] = text
    emb_path = 'movie_embeddings.pkl'
    mgr = MovieEmbeddingManager()
    # Load or compute embeddings
    if os.path.exists(emb_path):
        mgr.load(emb_path)
    else:
        for mid, text in all_movie_texts.items():
            mgr.add_movie(mid, text)
        mgr.compute_all_embeddings()
        mgr.save(emb_path)

    # Build user profile embedding from watchlist (or reviews if desired)
    user_profile_embs = []
    watchlist = [str(wid) for wid in user_dict.get('watchlist', [])]
    print(f"[DEBUG] Watchlist IDs (as strings): {watchlist}")
    print(f"[DEBUG] All embedding keys: {mgr.get_all_movie_ids()}")

    # Map TMDB IDs in watchlist to IMDB IDs using TMDB API
    mapped_watchlist = []
    for wid in watchlist:
        if wid.startswith('tt'):
            mapped_watchlist.append(wid)
        else:
            # Assume TMDB ID, fetch IMDB ID
            tmdb_url = f"https://api.themoviedb.org/3/movie/{wid}?api_key={TMDB_API_KEY}&language=en-US"
            resp = requests.get(tmdb_url)
            data = resp.json()
            imdb_id = data.get('imdb_id')
            if imdb_id:
                mapped_watchlist.append(imdb_id)
            else:
                print(f"[DEBUG] Could not map TMDB ID {wid} to IMDB ID")
    print(f"[DEBUG] Mapped watchlist (IMDB IDs): {mapped_watchlist}")

    for wid in mapped_watchlist:
        emb = mgr.get_embedding(wid)
        if emb is not None:
            user_profile_embs.append(emb)
        else:
            print(f"[DEBUG] No embedding found for watchlist movie ID: {wid}")
    # Optionally add rated/liked movies here
    # for review in user_reviews.get(user_id, []):
    #     emb = mgr.get_embedding(review['movieId'])
    #     if emb is not None:
    #         user_profile_embs.append(emb)
    recs = []
    if user_profile_embs:
        user_vec = np.mean(user_profile_embs, axis=0, keepdims=True)
        all_ids = mgr.get_all_movie_ids()
        all_embs = mgr.get_all_embeddings()
        sims = cosine_similarity(user_vec, all_embs)[0]
        # Recommend top-N most similar movies not in watchlist
        for idx in np.argsort(sims)[::-1]:
            rec_id = all_ids[idx]
            if rec_id not in mapped_watchlist:
                recs.append(rec_id)
            if len(recs) >= 20:
                break
        print(f"[DEBUG] Embedding-based recommendations for user {user_id}: {recs}")
    # If no embedding-based recs, fall back to preference-based
    if not recs and genres:
        print(f"[DEBUG] Falling back to preference-based recommendations for user {user_id}")
        tmdb_genre_map = {
            'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35, 'Crime': 80, 'Documentary': 99,
            'Drama': 18, 'Family': 10751, 'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
            'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878, 'TV Movie': 10770, 'Thriller': 53,
            'War': 10752, 'Western': 37
        }
        genre_ids = [str(tmdb_genre_map[g]) for g in genres if g in tmdb_genre_map]
        rec_ids = set()
        for genre_id in genre_ids:
            for page in range(1, 4):
                tmdb_url = f"https://api.themoviedb.org/3/discover/movie?api_key={TMDB_API_KEY}&with_genres={genre_id}&language=en-US&with_original_language={language}&sort_by=popularity.desc&page={page}"
                resp = requests.get(tmdb_url)
                data = resp.json()
                results = data.get('results', [])
                for m in results:
                    rec_ids.add(str(m['id']))
                if len(rec_ids) >= 36:
                    break
            if len(rec_ids) >= 36:
                break
        recs = list(rec_ids)[:36]
    if recs:
        return recs

    # --- Fallback: Recommend by survey preference if no reviews or watchlist ---
    if (not user_has_reviews and not user_has_watchlist) and genres:
        print(f"[DEBUG] Using survey-based fallback for user {user_id}")
        # Use TMDB API to fetch popular movies by preferred genre/language
        tmdb_genre_map = {
            'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35, 'Crime': 80, 'Documentary': 99,
            'Drama': 18, 'Family': 10751, 'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
            'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878, 'TV Movie': 10770, 'Thriller': 53,
            'War': 10752, 'Western': 37
        }
        genre_ids = [str(tmdb_genre_map[g]) for g in genres if g in tmdb_genre_map]
        rec_ids = set()
        for genre_id in genre_ids:
            for page in range(1, 4):
                tmdb_url = f"https://api.themoviedb.org/3/discover/movie?api_key={TMDB_API_KEY}&with_genres={genre_id}&language=en-US&with_original_language={language}&sort_by=popularity.desc&page={page}"
                resp = requests.get(tmdb_url)
                data = resp.json()
                results = data.get('results', [])
                for m in results:
                    rec_ids.add(str(m['id']))
                if len(rec_ids) >= 36:
                    break
            if len(rec_ids) >= 36:
                break
        return list(rec_ids)[:36]

    # Now call the original function, but do NOT write to Firestore, just return the recommendations
    recommended_ids = []
    def collect_recommendations(user_id, movie_id_list, base_movie_texts, base_X, vectorizer, movie_metadata, user_reviews):
        class DummyDoc:
            def set(self, data):
                nonlocal recommended_ids
                recommended_ids = data.get('movieIds', [])
        class DummyCollection:
            def document(self, _):
                return DummyDoc()
        orig_collection = db.collection
        db.collection = lambda name: DummyCollection() if name == 'recommendations' else orig_collection(name)
        try:
            generate_recommendations_for_user(user_id, movie_id_list, base_movie_texts, base_X, vectorizer, movie_metadata, user_reviews)
        finally:
            db.collection = orig_collection
        return recommended_ids
    return collect_recommendations(user_id, movie_id_list, base_movie_texts, base_X, vectorizer, movie_metadata, user_reviews)

if __name__ == '__main__':
    build_recommendations()
    print('Done!')
