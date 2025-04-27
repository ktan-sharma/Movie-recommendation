import { API_KEY, BASE_URL } from './config.js';

export class MustWatchManager {
    constructor() {
        this.movies = [];
        this.filteredMovies = [];
        this.genreMap = {};
        this.initialize();
    }

    async initialize() {
        await this.loadGenres();
        await this.loadMovies();
        this.setupFilters();
        this.setupSearch();
        this.renderMovies();
    }

    async loadGenres() {
        // Fetch TMDB genres and build a map from id to name
        try {
            const response = await fetch(`${BASE_URL}genre/movie/list?api_key=${API_KEY}&language=en-US`);
            const data = await response.json();
            if (data.genres) {
                this.genreMap = {};
                data.genres.forEach(g => {
                    this.genreMap[g.id] = g.name;
                });
            }
        } catch (e) {
            console.error('Failed to fetch genres', e);
        }
    }

    async loadMovies() {
        const movieIds = [
            // Top 25 Classic Films
            'tt0111161', // The Shawshank Redemption
            'tt0068646', // The Godfather
            'tt0071562', // The Godfather Part II
            'tt0468569', // The Dark Knight
            'tt0050083', // 12 Angry Men
            'tt0108052', // Schindler's List
            'tt0110912', // Pulp Fiction
            'tt0167260', // The Lord of the Rings: The Return of the King
            'tt0060196', // The Good, the Bad and the Ugly
            'tt0120737', // The Lord of the Rings: The Fellowship of the Ring
            'tt0109830', // Forrest Gump
            'tt0137523', // Fight Club
            'tt0080684', // Star Wars: Episode V - The Empire Strikes Back
            'tt0133093', // The Matrix
            'tt0099685', // Goodfellas
            'tt0073486', // One Flew Over the Cuckoo's Nest
            'tt0047478', // Seven Samurai
            'tt0114369', // Se7en
            'tt0102926', // The Silence of the Lambs
            'tt0038650', // It's a Wonderful Life
            'tt0076759', // Star Wars: Episode IV - A New Hope
            'tt0120815', // Saving Private Ryan
            'tt0317248', // City of God
            'tt0118799', // Life Is Beautiful
            'tt0245429', // Spirited Away

            // Next 25 Essential Films
            'tt0064116', // Once Upon a Time in the West
            'tt0047396', // Rear Window
            'tt0816692', // Interstellar
            'tt0120689', // The Green Mile
            'tt0021749', // City Lights
            'tt0054215', // Psycho
            'tt0103064', // Terminator 2: Judgment Day
            'tt0110357', // The Lion King
            'tt0027977', // Modern Times
            'tt0253474', // The Pianist
            'tt0114814', // The Usual Suspects
            'tt0172495', // Gladiator
            'tt0407887', // The Departed
            'tt0088763', // Back to the Future
            'tt0208092', // Memento
            'tt0078788', // Apocalypse Now
            'tt0082971', // Raiders of the Lost Ark
            'tt0032553', // The Great Dictator
            'tt0097576', // Cinema Paradiso
            'tt0043014', // Sunset Boulevard
            'tt0057012', // Dr. Strangelove
            'tt0040522', // Bicycle Thieves
            'tt0081505', // The Shining
            'tt0119698', // Princess Mononoke
            'tt0051201', // Witness for the Prosecution

            // More Classic & Modern Masterpieces
            'tt0095327', // Grave of the Fireflies
            'tt1375666', // Inception
            'tt0169547', // American Beauty
            'tt0364569', // Oldboy
            'tt0090605', // Aliens
            'tt0086190', // Star Wars: Episode VI
            'tt0087843', // Once Upon a Time in America
            'tt0082096', // Das Boot
            'tt0114709', // Toy Story
            'tt0052357', // Vertigo
            'tt0091251', // Come and See
            'tt0033467', // Citizen Kane
            'tt0053125', // North by Northwest
            'tt0105236', // Reservoir Dogs
            'tt0066921', // A Clockwork Orange
            'tt0022100', // M
            'tt0211915', // Amélie
            'tt0086879', // Amadeus
            'tt0056172', // Lawrence of Arabia
            'tt0180093', // Requiem for a Dream
            'tt0119217', // Good Will Hunting
            'tt0059578', // For a Few Dollars More
            'tt0053604', // The Apartment
            'tt0045152', // Singin' in the Rain
            'tt0075314', // Taxi Driver

            // Final 25 Must-Watch Films
            'tt0112573', // Braveheart
            'tt0120586', // American History X
            'tt0056592', // To Kill a Mockingbird
            'tt0093058', // Full Metal Jacket
            'tt0040897', // The Treasure of the Sierra Madre
            'tt0071853', // Monty Python and the Holy Grail
            'tt0055031', // Judgment at Nuremberg
            'tt0372784', // Batman Begins
            'tt0105695', // Unforgiven
            'tt0363163', // Downfall
            'tt0095016', // Die Hard
            'tt0086250', // Scarface
            'tt0071315', // Chinatown
            'tt0208092', // Snatch
            'tt0435761', // Toy Story 3
            'tt0062622', // 2001: A Space Odyssey
            'tt0052618', // Ben-Hur
            'tt0118715', // The Big Lebowski
            'tt0361748', // Inglourious Basterds
            'tt0119488', // L.A. Confidential
            'tt0097576', // Indiana Jones and the Last Crusade
            'tt0042876', // Rashomon
            'tt0055630', // Yojimbo
            'tt0086190', // Return of the Jedi
            'tt0041959'  // The Third Man
        ];

        try {
            const loadingSpinner = document.querySelector('.loading-spinner');
            loadingSpinner.classList.add('active');

            this.movies = await Promise.all(
                movieIds.map(async (id, index) => {
                    const tmdbFindUrl = `${BASE_URL}find/${id}?api_key=${API_KEY}&language=en-US&external_source=imdb_id`;
                    const response = await fetch(tmdbFindUrl);
                    const data = await response.json();
                    let movie = {};
                    if (data && data.movie_results && data.movie_results.length > 0) {
                        const m = data.movie_results[0];
                        // Convert genre_ids to genre names
                        let genreNames = '';
                        if (m.genre_ids && Array.isArray(m.genre_ids)) {
                            genreNames = m.genre_ids.map(gid => this.genreMap[gid] || gid).join(', ');
                        }
                        movie = {
                            imdbID: m.imdb_id || id, // always set imdbID for linking
                            id: id,
                            Title: m.title,
                            Plot: m.overview,
                            Poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'placeholder.jpg',
                            Year: m.release_date ? m.release_date.split('-')[0] : '',
                            Genre: genreNames,
                            Director: '',
                            Actors: '',
                            rank: index + 1
                        };
                    } else {
                        movie = {
                            imdbID: id,
                            id: id,
                            Title: 'Unknown',
                            Plot: '',
                            Poster: 'placeholder.jpg',
                            Year: '',
                            Genre: '',
                            Director: '',
                            Actors: '',
                            rank: index + 1
                        };
                    }
                    return movie;
                })
            );

            this.filteredMovies = [...this.movies];
            this.populateFilters();
        } catch (error) {
            console.error('Error loading movies:', error);
        } finally {
            document.querySelector('.loading-spinner').classList.remove('active');
        }
    }

    setupFilters() {
        const genreFilter = document.getElementById('genreFilter');
        const decadeFilter = document.getElementById('decadeFilter');
        const sortBy = document.getElementById('sortBy');

        [genreFilter, decadeFilter, sortBy].forEach(filter => {
            filter.addEventListener('change', () => this.applyFilters());
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('movieSearch');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filteredMovies = this.movies.filter(movie => 
                movie.Title.toLowerCase().includes(searchTerm) ||
                movie.Director.toLowerCase().includes(searchTerm) ||
                movie.Actors.toLowerCase().includes(searchTerm)
            );
            this.renderMovies();
        });
    }

    populateFilters() {
        // Populate genre filter
        const genres = new Set();
        this.movies.forEach(movie => {
            movie.Genre.split(', ').forEach(genre => genres.add(genre));
        });

        const genreFilter = document.getElementById('genreFilter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        // Populate decade filter
        const decades = new Set();
        this.movies.forEach(movie => {
            const decade = Math.floor(parseInt(movie.Year) / 10) * 10;
            decades.add(decade);
        });

        const decadeFilter = document.getElementById('decadeFilter');
        Array.from(decades).sort().forEach(decade => {
            const option = document.createElement('option');
            option.value = decade;
            option.textContent = `${decade}s`;
            decadeFilter.appendChild(option);
        });
    }

    renderMovies() {
        const container = document.getElementById('moviesGrid');
        container.innerHTML = this.filteredMovies.map(movie => {
            return `
                <div class="movie-card" data-id="${movie.imdbID}">
                    <div class="movie-rank">${movie.rank}</div>
                    <a href="movie.html?id=${movie.imdbID}">
                        <img src="${movie.Poster}" alt="${movie.Title}" 
                            onerror="this.src='placeholder.jpg'">
                        <div class="movie-info">
                            <h3>${movie.Title}</h3>
                            <p>${movie.Year} • ${movie.imdbRating ? movie.imdbRating : ''}/10</p>
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    }

    applyFilters() {
        const genreFilter = document.getElementById('genreFilter').value;
        const decadeFilter = document.getElementById('decadeFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        let filtered = [...this.movies];

        // Filter by genre
        if (genreFilter) {
            filtered = filtered.filter(movie =>
                movie.Genre && movie.Genre.split(', ').includes(genreFilter)
            );
        }

        // Filter by decade
        if (decadeFilter) {
            filtered = filtered.filter(movie => {
                if (!movie.Year) return false;
                const year = parseInt(movie.Year);
                return Math.floor(year / 10) * 10 === parseInt(decadeFilter);
            });
        }

        // Sort
        switch (sortBy) {
            case 'rank':
                filtered.sort((a, b) => a.rank - b.rank);
                break;
            case 'year':
                filtered.sort((a, b) => (b.Year || 0) - (a.Year || 0));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
                break;
            case 'title':
                filtered.sort((a, b) => a.Title.localeCompare(b.Title));
                break;
        }

        this.filteredMovies = filtered;
        this.renderMovies();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MustWatchManager();
});