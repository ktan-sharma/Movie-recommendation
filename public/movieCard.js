import { watchlistManager } from './watchlist.js';
import { RatingManager } from './rating.js';

export class MovieCardManager {
    static createMovieCard(movie) {
        if (!movie) return null;

        // Format the rating to handle missing or invalid values
        const rating = movie.imdbRating && movie.imdbRating !== 'N/A' 
            ? parseFloat(movie.imdbRating).toFixed(1) 
            : 'N/A';

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.imdbID || movie.id;

        const movieData = {
            id: movie.imdbID || movie.id,
            title: movie.Title || '',
            year: movie.Year || '',
            rating: rating,
            poster: movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'placeholder.jpg',
            genres: Array.isArray(movie.Genre) ? movie.Genre : (typeof movie.Genre === 'string' && movie.Genre.length > 0 ? movie.Genre.split(', ') : [])
        };

        card.innerHTML = `
            <img src="${movieData.poster}" 
                 alt="${movieData.title}" 
                 class="movie-poster"
                 onerror="this.src='images/placeholder.jpg'">
            <div class="movie-info">
                <h3>${movieData.title}</h3>
                <div class="movie-meta">
                    <span class="year">${movieData.year}</span>
                    ${movieData.rating !== 'N/A' ? `<span class="rating">★ ${movieData.rating}</span>` : ''}
                </div>
                <div class="movie-tags">
                    ${movieData.genres.map(genre => `<span class="movie-tag">${genre}</span>`).join('')}
                </div>
                <button class="rate-movie-btn">Rate Movie</button>
            </div>
        `;

        card.addEventListener('click', () => {
            if (movieData.id) {
                window.location.href = `movie.html?id=${movieData.id}`;
            }
        });

        return card;
    }

    static populateGrid(container, movies) {
        if (!container || !movies) return;

        container.innerHTML = '';
        movies.forEach(movie => {
            const card = this.createMovieCard(movie);
            if (card) container.appendChild(card);
        });

        if (!movies.length) {
            container.innerHTML = '<div class="no-movies">No movies available</div>';
        }
    }
}

const ratingManager = new RatingManager();

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('rate-movie-btn')) {
        e.preventDefault();
        const movieId = e.target.closest('.movie-card').dataset.movieId;
        ratingManager.showRatingModal(movieId);
    }
});

window.MovieCardManager = MovieCardManager;

export class MovieCard {
    constructor(movie) {
        this.movie = movie;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const movieCard = document.querySelector(`[data-movie-id="${this.movie.imdbID}"]`);
        if (movieCard) {
            movieCard.addEventListener('click', () => this.showMovieDetails());
        }
    }

    async showMovieDetails() {
        try {
            const { API_KEY, BASE_URL } = await import('./config.js');
            const response = await fetch(`${BASE_URL}?i=${this.movie.imdbID}&apikey=${API_KEY}&plot=full`);
            const movieData = await response.json();

            if (movieData.Response === 'True') {
                this.displayMovieModal(movieData);
            } else {
                throw new Error('Failed to load movie details');
            }
        } catch (error) {
            console.error('Error loading movie details:', error);
            alert('Failed to load movie details. Please try again.');
        }
    }

    displayMovieModal(movieData) {
        const modal = document.createElement('div');
        modal.className = 'movie-modal modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="movie-detail-container">
                    <div class="movie-poster">
                        <img src="${movieData.Poster}" alt="${movieData.Title}" 
                            onerror="this.src='img/placeholder.jpg'">
                    </div>
                    <div class="movie-info">
                        <h2>${movieData.Title} (${movieData.Year})</h2>
                        <div class="movie-meta">
                            <span>${movieData.Runtime}</span> | 
                            <span>${movieData.Genre}</span> | 
                            <span>${movieData.Rated}</span>
                        </div>
                        <div class="movie-rating">
                            <span class="imdb-rating">
                                <i class="fas fa-star"></i> ${movieData.imdbRating}/10
                            </span>
                            <span class="votes">${movieData.imdbVotes} votes</span>
                        </div>
                        <p class="plot">${movieData.Plot}</p>
                        <div class="movie-details">
                            <p><strong>Director:</strong> ${movieData.Director}</p>
                            <p><strong>Writers:</strong> ${movieData.Writer}</p>
                            <p><strong>Stars:</strong> ${movieData.Actors}</p>
                        </div>
                        <div class="movie-actions">
                            <button class="action-btn add-watchlist">
                                <i class="fas fa-plus"></i> Add to Watchlist
                            </button>
                            <button class="action-btn rate-movie">
                                <i class="fas fa-star"></i> Rate Movie
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Close button handler
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}