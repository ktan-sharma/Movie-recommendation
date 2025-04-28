// tvdetails.js - Fetch and render TV show details for tvdetails.html
const API_KEY = '5e338db773fdec4213f2c68748ff8d36';
const BASE_URL = 'https://api.themoviedb.org/3/';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const tvId = params.get('id');
    const main = document.getElementById('tvDetailsMain');
    if (!tvId) {
        main.innerHTML = '<div class="error-message">No TV show ID provided.</div>';
        return;
    }
    try {
        // Fetch main TV show details
        const res = await fetch(`${BASE_URL}tv/${tvId}?api_key=${API_KEY}&language=en-US`);
        if (!res.ok) throw new Error('Failed to fetch TV show details');
        const tv = await res.json();
        renderTvDetails(tv);
    } catch (err) {
        main.innerHTML = `<div class="error-message">${err.message || 'Failed to load TV show details.'}</div>`;
    }
});

function renderTvDetails(tv) {
    const main = document.getElementById('tvDetailsMain');
    const poster = tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image';
    const genres = tv.genres && tv.genres.length ? tv.genres.map(g => g.name).join(', ') : 'N/A';
    const creators = tv.created_by && tv.created_by.length ? tv.created_by.map(c => c.name).join(', ') : 'N/A';
    const firstAir = tv.first_air_date || 'N/A';
    const lastAir = tv.last_air_date || 'N/A';
    const rating = tv.vote_average ? tv.vote_average.toFixed(1) : 'N/A';
    const tagline = tv.tagline ? `<p class='tagline'>${tv.tagline}</p>` : '';
    main.innerHTML = `
    <div class="movie-details-card">
        <div class="movie-content">
            <div class="movie-poster-col">
                <img src="${poster}" alt="${tv.name}" class="movie-details-poster" />
            </div>
            <div class="movie-info-col">
                <h1 class="movie-details-title">${tv.name}</h1>
                ${tagline}
                <div class="movie-details-meta">
                    <span class="movie-details-year">${firstAir.split('-')[0]}</span>
                    <span class="movie-details-genres">${genres}</span>
                    <span class="movie-details-runtime">Seasons: ${tv.number_of_seasons || 'N/A'} | Episodes: ${tv.number_of_episodes || 'N/A'}</span>
                </div>
                <div class="movie-details-rating">
                    <span class="star-icon">★</span> <span class="rating-value">${rating}</span>
                </div>
                <p class="movie-details-overview">${tv.overview || 'No overview available.'}</p>
                <div class="movie-details-crew">
                    <b>Created by:</b> ${creators}
                </div>
                <div class="movie-details-air">
                    <b>First Air:</b> ${firstAir} &nbsp; <b>Last Air:</b> ${lastAir}
                </div>
                <div class="movie-details-actions">
                    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(tv.name + ' trailer')}" target="_blank" class="hero-btn play"><i class="fas fa-play"></i> Watch Trailer</a>
                </div>
            </div>
        </div>
    </div>
    `;
}
