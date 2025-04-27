import { API_KEY, BASE_URL } from './config.js';

export const POPULAR_MOVIES = [
    '278', '238', '155', '122', '550' // TMDB IDs
];

export const TOP_100_IMDB_MOVIES = [
    // Use the same list as defined in config.js
    '278', '238', '155', '122', '550',
    '12', '13', '14', '15', '16',
    '17', '18', '19', '20', '21',
    '22', '23', '24', '25', '26',
    '27', '28', '29', '30', '31',
    '32', '33', '34', '35', '36',
    '37', '38', '39', '40', '41',
    '42', '43', '44', '45', '46',
    '47', '48', '49', '50', '51',
    '52', '53', '54', '55', '56',
    '57', '58', '59', '60', '61',
    '62', '63', '64', '65', '66',
    '67', '68', '69', '70', '71',
    '72', '73', '74', '75', '76',
    '77', '78', '79', '80', '81',
    '82', '83', '84', '85', '86',
    '87', '88', '89', '90', '91',
    '92', '93', '94', '95', '96',
    '97', '98', '99', '100'
];

export const TOP_100_MOVIES = TOP_100_IMDB_MOVIES; // Alias for consistency with existing code

export async function fetchMovieDetails(movieId) {
    let movie = null;
    if (/^\d+$/.test(movieId)) {
        // Numeric: TMDB ID
        try {
            const response = await fetch(`${BASE_URL}movie/${movieId}?api_key=${API_KEY}&language=en-US&append_to_response=credits`);
            const data = await response.json();
            if (data && !data.status_code) {
                movie = {
                    imdbID: data.imdb_id,
                    id: data.id,
                    Title: data.title,
                    Poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
                    Year: data.release_date ? data.release_date.split('-')[0] : '',
                    imdbRating: data.vote_average ? (data.vote_average / 2).toFixed(1) : 'N/A',
                    Genre: data.genres && data.genres.length ? data.genres.map(g => g.name).join(', ') : '',
                    Runtime: data.runtime ? `${data.runtime} min` : 'N/A',
                    Plot: data.overview,
                    Director: data.credits && data.credits.crew ? data.credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ') : '',
                    Writer: data.credits && data.credits.crew ? data.credits.crew.filter(c => c.job === 'Writer' || c.department === 'Writing').map(c => c.name).join(', ') : '',
                    Actors: data.credits && data.credits.cast ? data.credits.cast.slice(0, 5).map(a => a.name).join(', ') : '',
                    Released: data.release_date || '',
                    Country: data.production_countries && data.production_countries.length ? data.production_countries.map(c => c.name).join(', ') : '',
                    Language: data.spoken_languages && data.spoken_languages.length ? data.spoken_languages.map(l => l.english_name).join(', ') : '',
                    Awards: '',
                    BoxOffice: data.revenue ? `$${data.revenue.toLocaleString()}` : 'N/A',
                };
            }
        } catch (error) {
            console.error(`Error fetching movie ${movieId}:`, error);
            return null;
        }
    } else if (movieId.startsWith('tt')) {
        // IMDB ID: use /find
        try {
            const findUrl = `${BASE_URL}find/${movieId}?api_key=${API_KEY}&language=en-US&external_source=imdb_id`;
            const findRes = await fetch(findUrl);
            const findData = await findRes.json();
            if (findData && findData.movie_results && findData.movie_results.length > 0) {
                const tmdbId = findData.movie_results[0].id;
                const response = await fetch(`${BASE_URL}movie/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=credits`);
                const data = await response.json();
                if (data && !data.status_code) {
                    movie = {
                        imdbID: data.imdb_id,
                        id: data.id,
                        Title: data.title,
                        Poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
                        Year: data.release_date ? data.release_date.split('-')[0] : '',
                        imdbRating: data.vote_average ? (data.vote_average / 2).toFixed(1) : 'N/A',
                        Genre: data.genres && data.genres.length ? data.genres.map(g => g.name).join(', ') : '',
                        Runtime: data.runtime ? `${data.runtime} min` : 'N/A',
                        Plot: data.overview,
                        Director: data.credits && data.credits.crew ? data.credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ') : '',
                        Writer: data.credits && data.credits.crew ? data.credits.crew.filter(c => c.job === 'Writer' || c.department === 'Writing').map(c => c.name).join(', ') : '',
                        Actors: data.credits && data.credits.cast ? data.credits.cast.slice(0, 5).map(a => a.name).join(', ') : '',
                        Released: data.release_date || '',
                        Country: data.production_countries && data.production_countries.length ? data.production_countries.map(c => c.name).join(', ') : '',
                        Language: data.spoken_languages && data.spoken_languages.length ? data.spoken_languages.map(l => l.english_name).join(', ') : '',
                        Awards: '',
                        BoxOffice: data.revenue ? `$${data.revenue.toLocaleString()}` : 'N/A',
                    };
                }
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error fetching movie ${movieId}:`, error);
            return null;
        }
    }
    return movie;
}

export async function loadPopularMovies(start = 0, count = 10) {
    const selectedIds = POPULAR_MOVIES.slice(start, start + count);
    const movies = await Promise.all(selectedIds.map(id => fetchMovieDetails(id)));
    return movies.filter(movie => movie);
}

export async function loadTopMovies(start = 0, count = 10) {
    const selectedIds = TOP_100_IMDB_MOVIES.slice(start, start + count);
    const movies = await Promise.all(selectedIds.map(id => fetchMovieDetails(id)));
    return movies.filter(movie => movie);
}