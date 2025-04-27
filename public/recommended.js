import { API_KEY, BASE_URL } from './config.js';
import { db } from './firebase-config.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

async function loadRecommendedSection() {
    const recommendationsSection = document.getElementById('popularMovies');
    if (!recommendationsSection) return;
    // Show loading state only (no default movies)
    recommendationsSection.innerHTML = '<div class="loading">Loading recommendations...</div>';
    try {
        const auth = getAuth();
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                recommendationsSection.innerHTML = '<p class="empty-message">Sign in to get personalized recommendations!</p>';
                return;
            }
            // Fetch recommendations from Python backend API
            const apiUrl = `http://127.0.0.1:5000/api/recommendations?user_id=${user.uid}`;
            const apiRes = await fetch(apiUrl);
            const apiData = await apiRes.json();
            let movieIds = apiData.recommendations || [];
            if (!movieIds.length) {
                recommendationsSection.innerHTML = '<p class="empty-message">No recommendations found. Complete your preferences survey or rate more movies!</p>';
                return;
            }
            // Fetch full TMDB movie details for each recommended movie ID
            recommendationsSection.innerHTML = '';
            let movies = await Promise.all(movieIds.slice(0, 36).map(async (movieId) => {
                try {
                    const url = `${BASE_URL}movie/${movieId}?api_key=${API_KEY}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (!data || !data.title) return null;
                    return {
                        id: data.id,
                        title: data.title,
                        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
                        year: data.release_date ? data.release_date.split('-')[0] : '',
                        genres: data.genres && data.genres.length ? data.genres.map(g => g.name) : [],
                        rating: data.vote_average ? (data.vote_average / 2).toFixed(1) : 'N/A',
                    };
                } catch (err) {
                    return null;
                }
            }));
            movies = movies.filter(m => m);
            if (!movies.length) {
                recommendationsSection.innerHTML = '<p class="empty-message">No recommendations found. Complete your preferences survey or rate more movies!</p>';
                return;
            }
            recommendationsSection.innerHTML = movies.map(movie => `
                <div class="movie-card" data-movie-id="${movie.id}">
                    <img src="${movie.poster}" alt="${movie.title}" />
                    <div class="movie-info">
                        <h3>${movie.title}</h3>
                        <p>${movie.year} | ${movie.genres.join(', ')}</p>
                        <p>Rating: ${movie.rating}</p>
                    </div>
                </div>
            `).join('');
            Array.from(recommendationsSection.querySelectorAll('.movie-card')).forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.movieId;
                    window.location.href = `movie.html?id=${id}`;
                });
            });
        });
    } catch (err) {
        recommendationsSection.innerHTML = '<p class="empty-message">Failed to load recommendations.</p>';
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', loadRecommendedSection);
