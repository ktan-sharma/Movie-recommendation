import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { API_KEY, BASE_URL } from './config.js';

class ProfileManager {
    constructor() {
        this.currentUser = null; // Will be set after fetching from Firestore
        this.init();
    }

    async init() {
        // Listen for Firebase Auth state changes
        const auth = getAuth();
        import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        this.currentUser = userDocSnap.data();
                    } else {
                        this.currentUser = null;
                    }
                } else {
                    this.currentUser = null;
                }
                this.setupTabs();
                this.loadUserProfile();
                this.loadWatchlist();
                this.loadRatings();
                this.setupProfilePicUpload();
                this.setupEditName();
            });
        });
    }

    setupEditName() {
        const editBtn = document.getElementById('editNameBtn');
        const editArea = document.getElementById('editNameArea');
        const nameDisplay = document.getElementById('profileName');
        const input = document.getElementById('editNameInput');
        const saveBtn = document.getElementById('saveNameBtn');
        const cancelBtn = document.getElementById('cancelNameBtn');

        if (!editBtn || !editArea || !nameDisplay || !input || !saveBtn || !cancelBtn) return;

        editBtn.addEventListener('click', () => {
            editArea.style.display = 'flex';
            input.value = this.currentUser.name;
            nameDisplay.parentElement.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            editArea.style.display = 'none';
            nameDisplay.parentElement.style.display = 'flex';
        });

        saveBtn.addEventListener('click', async () => {
            const newName = input.value.trim();
            if (!newName || newName.length < 2) {
                alert('Username must be at least 2 characters.');
                return;
            }
            // Save to Firestore using Firestore SDK
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                try {
                    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
                    await updateDoc(userDocRef, { name: newName });
                    this.currentUser.name = newName;
                } catch (e) { alert('Could not update username in database.'); }
            }
            nameDisplay.textContent = newName;
            editArea.style.display = 'none';
            nameDisplay.parentElement.style.display = 'flex';
        });
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panels = document.querySelectorAll('.tab-panel');
                panels.forEach(panel => panel.classList.remove('active'));
                
                const targetPanel = document.getElementById(tab.dataset.tab);
                targetPanel.classList.add('active');
            });
        });
    }

    loadUserProfile() {
        if (!this.currentUser) {
            document.querySelector('.profile-page').innerHTML = '<div class="not-logged-in-message" style="padding:2rem;text-align:center;font-size:1.3rem;">Please log in to view your profile.</div>';
            return;
        }

        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        document.getElementById('memberSince').textContent = new Date(this.currentUser.createdAt).toLocaleDateString();
        
        // Use remote avatar if no profilePicture, skip local fallback to avoid 404
        const remoteFallback = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.currentUser.name || 'User') + '&background=random&format=png';
        const profilePic = this.currentUser.profilePicture ? this.currentUser.profilePicture : remoteFallback;
        const largeProfilePicElem = document.getElementById('largeProfilePic');
        const profilePictureElem = document.getElementById('profilePicture');
        largeProfilePicElem.src = profilePic;
        profilePictureElem.src = profilePic;

    }

    async loadWatchlist() {
        if (!this.currentUser) return;
        const watchlistGrid = document.getElementById('watchlistGrid');
        if (!this.currentUser.watchlist || !this.currentUser.watchlist.length) {
            watchlistGrid.innerHTML = '<p class="empty-message">Your watchlist is empty</p>';
            return;
        }

        // Load watchlist movies from TMDB (with credits)
        const movies = await Promise.all(
            this.currentUser.watchlist.map(async tmdbId => {
                // Fetch main details
                const response = await fetch(`${BASE_URL}movie/${tmdbId}?api_key=${API_KEY}`);
                const movie = await response.json();
                // Fetch credits (director, cast, etc.)
                const creditsRes = await fetch(`${BASE_URL}movie/${tmdbId}/credits?api_key=${API_KEY}`);
                const credits = await creditsRes.json();
                movie.credits = credits;
                return movie;
            })
        );

        watchlistGrid.innerHTML = movies.map(movie => this.createMovieCard({
            Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
            Title: movie.title,
            Year: movie.release_date ? movie.release_date.split('-')[0] : '',
            imdbRating: movie.vote_average ? (movie.vote_average / 2).toFixed(1) : 'N/A',
            Runtime: movie.runtime ? `${movie.runtime} min` : 'N/A',
            Genre: movie.genres && movie.genres.length ? movie.genres.map(g => g.name).join(', ') : '',
            Director: movie.credits && movie.credits.crew ? movie.credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ') : '',
            Writer: movie.credits && movie.credits.crew ? movie.credits.crew.filter(c => c.job === 'Writer' || c.department === 'Writing').map(c => c.name).join(', ') : '',
            Actors: movie.credits && movie.credits.cast ? movie.credits.cast.slice(0, 5).map(a => a.name).join(', ') : '',
            tmdbId: movie.id
        })).join('');
    }

    async loadRatings() {
        if (!this.currentUser) return;
        const ratingsGrid = document.getElementById('ratingsGrid');
        ratingsGrid.innerHTML = '<div class="loading">Loading your reviews...</div>';
        // Fetch user's reviews from Firestore
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            ratingsGrid.innerHTML = '<p class="empty-message">You must be logged in to view your reviews.</p>';
            return;
        }
        const reviewsCol = collection(db, 'reviews');
        const q = query(reviewsCol, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const reviews = snapshot.docs.map(doc => doc.data());
        if (!reviews.length) {
            ratingsGrid.innerHTML = '<p class="empty-message">You haven\'t written any reviews yet</p>';
            return;
        }
        // Fetch movie titles for each review (using OMDb or TMDB as appropriate)
        const reviewCards = await Promise.all(reviews.map(async review => {
            let movieTitle = review.movieId;
            let poster = '';
            let year = '';
            // Try OMDb first (for IMDb ids)
            let movieInfo;
            try {
                const omdbRes = await fetch(`https://www.omdbapi.com/?i=${review.movieId}&apikey=${API_KEY}`);
                movieInfo = await omdbRes.json();
                if (movieInfo && movieInfo.Title) {
                    movieTitle = movieInfo.Title;
                    poster = movieInfo.Poster;
                    year = movieInfo.Year;
                }
            } catch {}
            // If OMDb fails, try TMDB (for TMDB ids)
            if (!movieInfo || movieInfo.Response === 'False') {
                try {
                    const tmdbRes = await fetch(`${BASE_URL}movie/${review.movieId}?api_key=${API_KEY}`);
                    const tmdbInfo = await tmdbRes.json();
                    if (tmdbInfo && tmdbInfo.title) {
                        movieTitle = tmdbInfo.title;
                        poster = tmdbInfo.poster_path ? `https://image.tmdb.org/t/p/w200${tmdbInfo.poster_path}` : '';
                        year = tmdbInfo.release_date ? tmdbInfo.release_date.split('-')[0] : '';
                    }
                } catch {}
            }
            return `
                <div class="review">
                    <div class="review-header">
                        <img src="${poster || 'https://via.placeholder.com/50x75?text=No+Image'}" alt="${movieTitle}" style="width:38px;height:56px;border-radius:6px;margin-right:0.7rem;object-fit:cover;box-shadow:0 1px 4px #0006;">
                        <div>
                            <span class="review-user">${movieTitle}</span> <span style="color:#aaa;font-size:0.95em;">${year}</span><br>
                            <span class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                            <span class="review-date">${review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleString() : ''}</span>
                        </div>
                    </div>
                    <div class="review-body">${review.reviewText}</div>
                </div>
            `;
        }));
        ratingsGrid.innerHTML = reviewCards.join('');
        // Make each review card clickable to go to the movie details page
        Array.from(ratingsGrid.querySelectorAll('.review')).forEach((el, idx) => {
            el.addEventListener('click', () => {
                const review = reviews[idx];
                if (review && review.movieId) {
                    window.location.href = `movie.html?id=${review.movieId}`;
                }
            });
        });
    }

    createMovieCard(movie, showRating = false) {
        return `
            <div class="movie-card">
                <img src="${movie.Poster}" alt="${movie.Title}">
                <div class="movie-info">
                    <h3>${movie.Title}</h3>
                    <p>${movie.Year}</p>
                    ${showRating ? `<p class="user-rating">Your Rating: ${movie.userRating}/10</p>` : ''}
                </div>
            </div>
        `;
    }

    setupProfilePicUpload() {
        const profilePicture = document.getElementById('profilePicture');
        const largeProfilePic = document.getElementById('largeProfilePic');
        let profilePicInput = document.getElementById('profilePicInput');
        if (!profilePicInput) {
            profilePicInput = document.createElement('input');
            profilePicInput.type = 'file';
            profilePicInput.accept = 'image/*';
            profilePicInput.style.display = 'none';
            profilePicInput.id = 'profilePicInput';
            document.body.appendChild(profilePicInput);
        }
        const changePicBtn = document.getElementById('changePicBtn');
        // Remove any stray/duplicate largeProfilePicInput
        const strayLargeInput = document.getElementById('largeProfilePicInput');
        if (strayLargeInput) strayLargeInput.remove();
        // Handler for updating both images and Firestore
        profilePicInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (profilePicture) profilePicture.src = ev.target.result;
                    if (largeProfilePic) largeProfilePic.src = ev.target.result;
                    if (this.currentUser) {
                        const auth = getAuth();
                        const user = auth.currentUser;
                        if (user) {
                            const userDocRef = doc(db, 'users', user.uid);
                            import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js').then(({ updateDoc }) => {
                                updateDoc(userDocRef, { profilePicture: ev.target.result });
                            });
                            this.currentUser.profilePicture = ev.target.result;
// Update localStorage for navbar sync
const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
currentUser.profilePicture = ev.target.result;
localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        // Clicking any of these triggers the same input
        if (changePicBtn) changePicBtn.addEventListener('click', () => profilePicInput.click());
        if (profilePicture) profilePicture.addEventListener('click', () => profilePicInput.click());
        if (largeProfilePic) largeProfilePic.addEventListener('click', () => profilePicInput.click());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});