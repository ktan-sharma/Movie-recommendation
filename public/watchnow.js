// watchnow.js
// This script handles embedding the YouTube trailer and showing streaming sites from TMDB for the selected movie.

const urlParams = new URLSearchParams(window.location.search);
const imdbID = urlParams.get('imdb');
const title = urlParams.get('title');
const tmdbAPIKey = '5e338db773fdec4213f2c68748ff8d36';

// Helper: Get TMDB movie ID from IMDb ID
async function fetchTMDBIdFromIMDb(imdbID) {
    const url = `https://api.themoviedb.org/3/find/${imdbID}?api_key=${tmdbAPIKey}&external_source=imdb_id`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.movie_results && data.movie_results.length > 0) {
        return data.movie_results[0].id;
    }
    return null;
}

// Fetch streaming providers from TMDB
async function fetchStreamingProviders(tmdbID) {
    const url = `https://api.themoviedb.org/3/movie/${tmdbID}/watch/providers?api_key=${tmdbAPIKey}`;
    const res = await fetch(url);
    return res.json();
}

// Fetch YouTube trailer embed via search
async function fetchYouTubeTrailer(title) {
    const query = encodeURIComponent(`${title} official trailer`);
    return `https://www.youtube.com/embed?listType=search&list=${query}`;
}

document.getElementById('movie-title').textContent = title || 'Movie';

const ytApiKey = 'AIzaSyBfm4DvMFdqy5YaLPRqFwV2FPG1SiY9b00';

// Search YouTube Data API for embeddable trailer
async function fetchEmbeddableYouTubeTrailer(title) {
    const query = encodeURIComponent(`${title} official trailer`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${query}&key=${ytApiKey}&maxResults=5`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
        // Check embeddable status for each video
        for (const item of data.items) {
            const videoId = item.id.videoId;
            // Get video details to check embeddable
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${ytApiKey}`;
            const detailsRes = await fetch(detailsUrl);
            const detailsData = await detailsRes.json();
            if (detailsData.items && detailsData.items.length > 0 && detailsData.items[0].status.embeddable) {
                return {
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    watchUrl: `https://www.youtube.com/watch?v=${videoId}`
                };
            }
        }
    }
    return null;
}

// Fetch YouTube trailer from TMDB videos endpoint
async function fetchYouTubeTrailerFromTMDB(tmdbID, fallbackTitle) {
    const url = `https://api.themoviedb.org/3/movie/${tmdbID}/videos?api_key=${tmdbAPIKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        // Prefer 'Trailer' type, 'YouTube' site
        const trailer = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                        data.results.find(v => v.site === 'YouTube');
        if (trailer) {
            return {
                embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
                watchUrl: `https://www.youtube.com/watch?v=${trailer.key}`
            };
        }
    }
    // Fallback: YouTube search embed (may not work)
    const query = encodeURIComponent(`${fallbackTitle} official trailer`);
    return {
        embedUrl: `https://www.youtube.com/embed?listType=search&list=${query}`,
        watchUrl: `https://www.youtube.com/results?search_query=${query}`
    };
}

function embedYouTubeTrailer(ytEmbedUrl, ytWatchUrl) {
    const container = document.getElementById('yt-trailer');
    container.innerHTML = `
        <iframe id="yt-iframe" width="700" height="400" src="${ytEmbedUrl}" frameborder="0" allowfullscreen></iframe>
    `;
    // Fallback after a short delay if video is unavailable
    setTimeout(() => {
        const iframe = document.getElementById('yt-iframe');
        // Can't reliably detect error due to cross-origin, so always offer fallback link
        if (iframe) {
            container.innerHTML += `<div style="margin-top:1rem;"><button onclick="window.open('${ytWatchUrl}', '_blank')" class="movie-details-btn">Watch Trailer on YouTube</button></div>`;
        }
    }, 3500);
}

async function showTrailerAndStreaming() {
    if (!imdbID || !title) {
        document.getElementById('yt-trailer').innerHTML = '<p>Movie info missing.</p>';
        return;
    }
    // Get TMDB movie ID
    const tmdbID = await fetchTMDBIdFromIMDb(imdbID);
    let trailerInfo = null;
    // Try YouTube Data API first
    trailerInfo = await fetchEmbeddableYouTubeTrailer(title);
    // If not found, fallback to TMDB
    if (!trailerInfo && tmdbID) {
        trailerInfo = await fetchYouTubeTrailerFromTMDB(tmdbID, title);
    }
    if (trailerInfo) {
        embedYouTubeTrailer(trailerInfo.embedUrl, trailerInfo.watchUrl);
    } else {
        document.getElementById('yt-trailer').innerHTML = '<p>No trailer found.</p>';
    }

    let streamingHtml = '';
    if (tmdbID) {
        const providersData = await fetchStreamingProviders(tmdbID);
        let providers = null;
        // Prefer India, then US, then any
        if (providersData.results && (providersData.results.IN || providersData.results.US)) {
            providers = providersData.results.IN || providersData.results.US;
        } else if (providersData.results) {
            // fallback: pick any country
            const keys = Object.keys(providersData.results);
            if (keys.length > 0) providers = providersData.results[keys[0]];
        }
        if (providers && providers.flatrate && providers.flatrate.length > 0) {
            streamingHtml += providers.flatrate.map(site => {
                // Always use hardcoded provider homepage
                const providerLinks = {
                    'Amazon Prime Video': 'https://www.primevideo.com/',
                    'JioHotstar': 'https://www.hotstar.com/',
                    'Netflix': 'https://www.netflix.com/',
                    'Disney Plus': 'https://www.disneyplus.com/',
                    'Hulu': 'https://www.hulu.com/',
                    'Apple TV Plus': 'https://tv.apple.com/',
                    'HBO Max': 'https://www.max.com/'
                };
                const providerUrl = providerLinks[site.provider_name] || '#';
                return `<li><a href="${providerUrl}" target="_blank" style="text-decoration:none;color:inherit;"><img src="https://image.tmdb.org/t/p/w45${site.logo_path}" alt="${site.provider_name}" style="vertical-align:middle;"> ${site.provider_name}</a></li>`;
            }).join('');
        } else {
            streamingHtml += '<li>No streaming providers found for this region.</li>';
        }
    } else {
        streamingHtml += '<li>Could not find this movie on TMDB.</li>';
    }
    document.getElementById('streaming-list').innerHTML = streamingHtml;
}

showTrailerAndStreaming();
