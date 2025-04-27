import { API_KEY, BASE_URL } from './config.js';
import { watchlistManager } from './watchlist.js';

export class SliderManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentSlide = 0;
        this.autoPlayInterval = null;
        this.totalSlides = 0;
    }

    async initialize() {
        try {
            const movies = await this.fetchFeaturedMovies();
            if (!movies.length) {
                this.showError('No featured movies available');
                return;
            }
            this.totalSlides = movies.length;
            this.render(movies);
            this.setupControls();
            this.startAutoPlay();
        } catch (error) {
            this.showError('Failed to load featured movies');
            console.error('Error initializing slider:', error);
        }
    }

    async fetchFeaturedMovies() {
        const featuredIds = [
            '278', '238', '155', '122', '550' // TMDB IDs
        ];

        const movies = await Promise.all(
            featuredIds.map(async id => {
                const response = await fetch(`${BASE_URL}movie/${id}?api_key=${API_KEY}&language=en-US`);
                const data = await response.json();
                if (data && !data.status_code) {
                    return {
                        imdbID: data.imdb_id,
                        id: data.id,
                        Title: data.title,
                        Poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
                        Year: data.release_date ? data.release_date.split('-')[0] : '',
                        imdbRating: data.vote_average ? (data.vote_average / 2).toFixed(1) : 'N/A', // TMDB rates out of 10
                        Genre: data.genres && data.genres.length ? data.genres.map(g => g.name).join(', ') : '',
                        Runtime: data.runtime ? `${data.runtime} min` : 'N/A',
                        Plot: data.overview,
                        Director: '', // TMDB needs extra call for credits
                        Writer: '', // TMDB needs extra call for credits
                        Actors: '', // TMDB needs extra call for credits
                    };
                }
                return null;
            })
        );

        return movies.filter(movie => movie);
    }

    render(movies) {
        const mainSliderContent = movies.map((movie, index) => {
            // Format the rating to prevent $[1=i] error
            const rating = movie.imdbRating && movie.imdbRating !== 'N/A' 
                ? Number(movie.imdbRating).toFixed(1) 
                : 'N/A';

            return `
                <div class="slider-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="slide-backdrop">
                        <img src="${movie.Poster}" alt="${movie.Title}" class="slide-image">
                    </div>
                    <div class="slide-overlay"></div>
                    <div class="slide-content">
                        <h2>${movie.Title}</h2>
                        <div class="slide-meta">
                            <span class="year">${movie.Year}</span>
                            ${rating !== 'N/A' ? `<span class="rating">★ ${rating}</span>` : ''}
                            ${movie.Runtime ? `<span class="runtime">${movie.Runtime}</span>` : ''}
                        </div>
                        <p class="plot">${movie.Plot || 'No plot available.'}</p>
                        <div class="slide-actions">
                            <button class="view-more" onclick="window.location.href='movie.html?id=${movie.imdbID}'">
                                View Details
                            </button>
                            <button class="add-watchlist" data-movie-id="${movie.imdbID}" onclick="watchlistManager.addToWatchlist({id: '${movie.imdbID}', Title: '${movie.Title}', Poster: '${movie.Poster}', Year: '${movie.Year}', imdbRating: '${movie.imdbRating}'})">+ Watchlist</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const dots = movies.map((_, index) => `
            <button class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
        `).join('');

        this.container.innerHTML = `
            <div class="slider-container">
                ${mainSliderContent}
                <button class="slider-nav prev" aria-label="Previous slide">❮</button>
                <button class="slider-nav next" aria-label="Next slide">❯</button>
                <div class="slider-dots">${dots}</div>
            </div>
        `;
    }

    setupControls() {
        const prevButton = this.container.querySelector('.prev');
        const nextButton = this.container.querySelector('.next');
        const dots = this.container.querySelectorAll('.dot');

        prevButton.addEventListener('click', () => this.prevSlide());
        nextButton.addEventListener('click', () => this.nextSlide());
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.goToSlide(index);
            });
        });

        this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.container.addEventListener('mouseleave', () => this.startAutoPlay());
    }

    goToSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;

        const slides = this.container.querySelectorAll('.slider-slide');
        const dots = this.container.querySelectorAll('.dot');

        slides[this.currentSlide].classList.remove('active');
        dots[this.currentSlide].classList.remove('active');

        this.currentSlide = index;

        slides[this.currentSlide].classList.add('active');
        dots[this.currentSlide].classList.add('active');
    }

    nextSlide() {
        this.goToSlide((this.currentSlide + 1) % this.totalSlides);
    }

    prevSlide() {
        this.goToSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides);
    }

    startAutoPlay() {
        this.pauseAutoPlay();
        this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
    }

    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="slider-error">
                <p>${message}</p>
            </div>
        `;
    }
}