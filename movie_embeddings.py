from sentence_transformers import SentenceTransformer
import numpy as np
import pickle

MODEL_NAME = 'all-MiniLM-L6-v2'

class MovieEmbeddingManager:
    def __init__(self, model_name=MODEL_NAME):
        self.model = SentenceTransformer(model_name)
        self.movie_embeddings = {}  # {movie_id: embedding (np.ndarray)}
        self.movie_texts = {}      # {movie_id: text}

    def add_movie(self, movie_id, text):
        self.movie_texts[movie_id] = text

    def compute_all_embeddings(self):
        movie_ids = list(self.movie_texts.keys())
        texts = [self.movie_texts[mid] for mid in movie_ids]
        if not texts:
            return
        embeddings = self.model.encode(texts, show_progress_bar=True)
        for i, mid in enumerate(movie_ids):
            self.movie_embeddings[mid] = embeddings[i]

    def get_embedding(self, movie_id):
        return self.movie_embeddings.get(movie_id)

    def save(self, path):
        with open(path, 'wb') as f:
            pickle.dump((self.movie_embeddings, self.movie_texts), f)

    def load(self, path):
        with open(path, 'rb') as f:
            self.movie_embeddings, self.movie_texts = pickle.load(f)

    def get_all_movie_ids(self):
        return list(self.movie_embeddings.keys())

    def get_all_embeddings(self):
        return np.array([self.movie_embeddings[mid] for mid in self.get_all_movie_ids()])

# Usage:
# mgr = MovieEmbeddingManager()
# mgr.add_movie(movie_id, text)
# mgr.compute_all_embeddings()
# mgr.save('embeddings.pkl')
# mgr.load('embeddings.pkl')
