// tvshow.js - Handles fetching and rendering TV show sections for tvshow.html
const API_KEY = '5e338db773fdec4213f2c68748ff8d36';
const BASE_URL = 'https://api.themoviedb.org/3/';

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch TV show categories in parallel
    const endpoints = {
        trending: `${BASE_URL}trending/tv/week?api_key=${API_KEY}&language=en-US`,
        topRated: `${BASE_URL}tv/top_rated?api_key=${API_KEY}&language=en-US`,
        recent: `${BASE_URL}tv/on_the_air?api_key=${API_KEY}&language=en-US`
    };
    try {
        const [trending, topRated, recent] = await Promise.all([
            fetch(endpoints.trending).then(r => r.json()),
            fetch(endpoints.topRated).then(r => r.json()),
            fetch(endpoints.recent).then(r => r.json())
        ]);
        showTvShowSections({
            trending: trending.results || [],
            topRated: topRated.results || [],
            recent: recent.results || []
        });
    } catch (err) {
        showTvShowSections({ trending: [], topRated: [], recent: [] });
    }
});

function showTvShowSections(tvData) {
    // Render each section
    renderTvShowRow(tvData.trending, 'trendingTvShows');
    renderTvShowRow(tvData.topRated, 'topRatedTvShows');
    renderTvShowRow(tvData.recent, 'recentTvShows');
    setupTvSliderButtons();
}

function renderTvShowRow(shows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    shows.forEach(item => {
        const title = item.name;
        const year = (item.first_air_date || '').split('-')[0];
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/240x360?text=No+Image';
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${poster}" alt="${title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/240x360?text=No+Image'">
            <div class="movie-info">
                <h3>${title}</h3>
                <p>${year || ''}</p>
            </div>
        `;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `tvdetails.html?id=${item.id}`;
        });
        container.appendChild(card);
    });
}

function setupTvSliderButtons() {
    // Add scrolling for left/right buttons
    document.querySelectorAll('.scroll-btn').forEach(btn => {
        btn.onclick = function() {
            const targetId = btn.getAttribute('data-target');
            const row = document.getElementById(targetId);
            if (!row) return;
            const scrollAmount = 320;
            if (btn.classList.contains('scroll-left')) {
                row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        };
    });
}
