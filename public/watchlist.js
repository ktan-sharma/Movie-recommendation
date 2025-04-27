import { API_KEY, BASE_URL } from './config.js';

export class WatchlistManager {
    constructor() {
        this.initializeWatchlist();
    }

    async initializeWatchlist() {
        if (window.location.pathname.includes('watchlist.html') || window.location.pathname.includes('profile.html')) {
            const [{ getAuth, onAuthStateChanged }, { doc, getDoc }, { db }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'),
                import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'),
                import('./firebase-config.js')
            ]);
            const auth = getAuth();
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.log('No user logged in');
                    this.renderWatchlist([]);
                    return;
                }
                const userDocRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    console.log('User document not found in Firestore');
                    this.renderWatchlist([]);
                    return;
                }
                const userData = userSnap.data();
                console.log('Fetched user data from Firestore:', userData);
                await this.renderWatchlist(userData.watchlist || []);
            });
        }
    }


    // RenderWatchlist now takes watchlist array directly
    async renderWatchlist(watchlistArr = []) {
        const container = document.getElementById('watchlistContainer') || document.getElementById('watchlist');
        if (!container) return;
        if (!watchlistArr.length) {
            container.innerHTML = '<div class="empty-watchlist">Your watchlist is empty</div>';
            return;
        }
        container.innerHTML = '<div class="loading">Loading watchlist...</div>';
        const movies = await Promise.all(
            watchlistArr.map(async tmdbId => {
                try {
                    const response = await fetch(`${BASE_URL}movie/${tmdbId}?api_key=${API_KEY}`);
                    return await response.json();
                } catch (e) {
                    console.error('TMDB fetch error:', e);
                    return null;
                }
            })
        );
        container.innerHTML = movies.filter(Boolean).map(movie => `
            <div class="watchlist-item" data-id="${movie.id}">
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" class="watchlist-poster">
                <div class="watchlist-info">
                    <h3>${movie.title}</h3>
                    <p class="year">${movie.release_date ? movie.release_date.substring(0, 4) : ''}</p>
                    <div class="ratings-container">
                        <div class="imdb-rating">
                            <span class="rating-label">TMDB:</span>
                            <span class="rating-value">★ ${(movie.vote_average / 2).toFixed(1)}</span>
                        </div>
                    </div>
                    <button class="remove-watchlist" onclick="watchlistManager.removeFromWatchlist('${movie.id}')">
                        Remove from Watchlist
                    </button>
                </div>
            </div>
        `).join('');
    }


    // isInWatchlist, addToWatchlist, removeFromWatchlist, getCurrentUser, and saveCurrentUser are obsolete and removed. All actions should use Firestore directly.

    async fetchWatchlistMovies() {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.watchlist?.length) return [];

        const movies = await Promise.all(
            currentUser.watchlist.map(async (movie) => {
                const response = await fetch(`${BASE_URL}movie/${movie.id}?api_key=${API_KEY}`);
                const data = await response.json();
                return data && (data.id || data.Response === "True") ? { ...data, userRating: movie.userRating } : null;
            })
        );
        return movies.filter(movie => movie);
    }


}

export const watchlistManager = new WatchlistManager();

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('watchlist.html') || window.location.pathname.includes('profile.html')) {
        watchlistManager.initializeWatchlist();
    }
});

window.watchlistManager = watchlistManager;