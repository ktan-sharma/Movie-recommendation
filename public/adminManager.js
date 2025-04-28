console.log('[adminManager.js] Loaded');
export class AdminManager {
    constructor() {
        console.log('[AdminManager] Constructor called');
        this.adminCredentials = {
            'shivam': 'allmighty',
            'ketan': 'ketan2004'
        };
        this.moviesData = {
            trending: [],
            popular: [],
            topRated: []
        };
        this.initialize();
        // Ensure settings tab controls are initialized on page load
        this.setupSettingsTab();
    }

    initialize() {
        this.setupLoginForm();
        this.setupLogout();
        this.setupTabNavigation();
        
        // Check if admin is already logged in
        const loggedInAdmin = localStorage.getItem('adminLoggedIn');
        if (loggedInAdmin) {
            this.showDashboard(loggedInAdmin);
        }
    }

    setupLoginForm() {
        const loginForm = document.getElementById('adminLoginForm');
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('adminUsername').value.toLowerCase();
            const password = document.getElementById('adminPassword').value;
            
            if (this.validateAdmin(username, password)) {
                localStorage.setItem('adminLoggedIn', username);
                this.showDashboard(username);
            } else {
                document.getElementById('adminLoginError').textContent = 
                    'Invalid username or password';
            }
        });
    }

    validateAdmin(username, password) {
        return this.adminCredentials[username] === password;
    }

    setupLogout() {
        const logoutBtn = document.getElementById('adminLogoutBtn');
        logoutBtn?.addEventListener('click', () => {
            localStorage.removeItem('adminLoggedIn');
            this.hideDashboard();
        });
    }

    setupTabNavigation() {
        const menuItems = document.querySelectorAll('.admin-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items and tabs
                menuItems.forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.admin-tab').forEach(tab => 
                    tab.classList.remove('active'));
                
                // Add active class to clicked item and corresponding tab
                item.classList.add('active');
                const tabId = item.dataset.tab;
                document.getElementById(tabId)?.classList.add('active');
            });
        });
        this.setupUserTab();
        this.setupMoviesTab();
        this.setupReviewsTab();
        this.setupReportsTab();
        this.setupSettingsTab();
    }

    setupUserTab() {
        const userTab = document.getElementById('users');
        if (!userTab) return;

        const searchInput = document.getElementById('userSearch');
        const filterSelect = document.getElementById('userFilter');

        searchInput?.addEventListener('input', () => this.filterUsers());
        filterSelect?.addEventListener('change', () => this.filterUsers());

        this.loadUsers();
    }

    async loadUsers() {
        const usersGrid = document.getElementById('usersGrid');
        if (!usersGrid) return;

        try {
            // Get users from Firestore
            usersGrid.innerHTML = '<div class="loading-spinner">Loading users...</div>';
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
            const { db } = await import('./firebase-config.js');
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (usersList.length === 0) {
                usersGrid.innerHTML = '<div class="empty-message">No users found.</div>';
                return;
            }

            usersGrid.innerHTML = usersList.map(user => this.createUserCard(user)).join('');
            this.setupUserActions();
        } catch (error) {
            console.error('Error loading users:', error);
            usersGrid.innerHTML = '<div class="error-message">Error loading users</div>';
        }
    }

    createUserCard(user) {
        const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || (user.email ? user.email[0].toUpperCase() : 'U');
        return `
            <div class="user-card" data-email="${user.email || ''}">
                <div class="user-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <h3>${user.name || 'User'}</h3>
                        <div class="user-email">${user.email || user.id}</div>
                        <div class="user-id">UID: ${user.id}</div>
                    </div>
                </div>
            </div>
        `;
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase();
        const filterValue = document.getElementById('userFilter')?.value;
        const userCards = document.querySelectorAll('.user-card');

        userCards.forEach(card => {
            const userName = card.querySelector('.user-info h3').textContent.toLowerCase();
            const userEmail = card.querySelector('.user-email').textContent.toLowerCase();
            const matches = userName.includes(searchTerm) || userEmail.includes(searchTerm);
            
            card.style.display = matches ? 'block' : 'none';
        });
    }

    setupUserActions() {
        document.querySelectorAll('.user-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('button').title;
                const userCard = e.target.closest('.user-card');
                const userEmail = userCard.dataset.email;

                switch(action) {
                    case 'Edit User':
                        this.editUser(userEmail);
                        break;
                    case 'Delete User':
                        this.deleteUser(userEmail);
                        break;
                    case 'Reset Password':
                        this.resetUserPassword(userEmail);
                        break;
                }
            });
        });
    }

    editUser(email) {
        // Implement user editing functionality
        console.log('Edit user:', email);
    }

    deleteUser(email) {
        if (confirm('Are you sure you want to delete this user?')) {
            const users = JSON.parse(localStorage.getItem('users')) || {};
            delete users[email];
            localStorage.setItem('users', JSON.stringify(users));
            this.loadUsers();
        }
    }

    resetUserPassword(email) {
        // Implement password reset functionality
        console.log('Reset password for:', email);
    }

    showDashboard(username) {
        console.log('[AdminManager] showDashboard called');
        document.getElementById('adminLoginContainer').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        
        // Remove any existing theme classes
        document.body.classList.remove('shivam-theme', 'ketan-theme');
        // Add theme class based on admin
        document.body.classList.add(`${username}-theme`);
        
        this.loadDashboardData(username);
        // Ensure settings tab controls are initialized after dashboard is shown
        this.setupSettingsTab();
    }

    hideDashboard() {
        document.getElementById('adminLoginContainer').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        document.body.classList.remove('shivam-theme', 'ketan-theme');
    }

    async loadDashboardData() {
        // Load overview data
        const overview = document.getElementById('overview');
        if (overview) {
            // Only inject the stat cards if they do not already exist (prevents overwriting live stats)
            if (!overview.querySelector('#statUsers') || !overview.querySelector('#statReviews')) {
                overview.innerHTML = `
                    <h2 class="dashboard-title"><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h2>
                    <div class="stat-cards-row">
                        <div class="stat-card stat-blue">
                            <div class="stat-card-header">
                                <span class="stat-icon"><i class="fas fa-users"></i></span>
                                <span class="stat-label">Total Users</span>
                            </div>
                            <div class="stat-value" id="statUsers">0</div>
                        </div>
                        <div class="stat-card stat-green">
                            <div class="stat-card-header">
                                <span class="stat-icon"><i class="fas fa-film"></i></span>
                                <span class="stat-label">Total Movies</span>
                            </div>
                            <div class="stat-value" id="statMovies">100+</div>
                        </div>
                        <div class="stat-card stat-yellow">
                            <div class="stat-card-header">
                                <span class="stat-icon"><i class="fas fa-star"></i></span>
                                <span class="stat-label">Total Reviews</span>
                            </div>
                            <div class="stat-value" id="statReviews">0</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    getTotalUsers() {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        return Object.keys(users).length;
    }

    getTotalMovies() {
        // Implement movie counting logic
        return '100+';
    }

    getTotalReviews() {
        // Implement review counting logic
        return '0';
    }

    setupMoviesTab() {
        const moviesGrid = document.getElementById('moviesGrid');
        if (!moviesGrid) return;

        this.loadMovies();

        const movieSearch = document.getElementById('movieSearch');
        const movieFilter = document.getElementById('movieFilter');

        movieSearch?.addEventListener('input', () => this.filterMovies());
        movieFilter?.addEventListener('change', () => this.filterMovies());

        // Add Movie Modal
        const addMovieBtn = document.getElementById('addMovieBtn');
        const addEditMovieModal = document.getElementById('addEditMovieModal');
        const closeAddEditMovie = document.getElementById('closeAddEditMovie');
        const addEditMovieForm = document.getElementById('addEditMovieForm');
        const addEditMovieTitle = document.getElementById('addEditMovieTitle');

        addMovieBtn.onclick = () => {
            addEditMovieTitle.textContent = 'Add Movie';
            addEditMovieForm.reset();
            document.getElementById('movieId').value = '';
            addEditMovieModal.style.display = 'block';
        };
        closeAddEditMovie.onclick = () => {
            addEditMovieModal.style.display = 'none';
        };
        window.onclick = (e) => {
            if (e.target === addEditMovieModal) addEditMovieModal.style.display = 'none';
        };

        // Handle Add/Edit Movie Form Submit
        addEditMovieForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('movieId').value;
            const title = document.getElementById('movieTitle').value;
            const year = document.getElementById('movieYear').value;
            const imdbID = document.getElementById('movieImdbId').value;
            const imdbRating = document.getElementById('movieImdbRating').value;
            const poster = document.getElementById('moviePoster').value;
            const movieObj = {
                imdbID,
                Title: title,
                Year: year,
                imdbRating,
                Poster: poster || 'img/placeholder.jpg',
            };
            if (id) {
                // Edit
                this.moviesData.popular = this.moviesData.popular.map(m => m.imdbID === id ? movieObj : m);
            } else {
                // Add
                this.moviesData.popular.push(movieObj);
            }
            this.renderMovies(this.moviesData.popular);
            addEditMovieModal.style.display = 'none';
        };

        // Delegate Edit/Delete buttons
        moviesGrid.onclick = (e) => {
            const card = e.target.closest('.movie-card');
            if (!card) return;
            const imdbID = card.getAttribute('data-id');
            if (e.target.closest('.fa-edit')) {
                // Edit Movie
                const movie = this.moviesData.popular.find(m => m.imdbID === imdbID);
                if (movie) {
                    addEditMovieTitle.textContent = 'Edit Movie';
                    document.getElementById('movieId').value = movie.imdbID;
                    document.getElementById('movieTitle').value = movie.Title;
                    document.getElementById('movieYear').value = movie.Year;
                    document.getElementById('movieImdbId').value = movie.imdbID;
                    document.getElementById('movieImdbRating').value = movie.imdbRating;
                    document.getElementById('moviePoster').value = movie.Poster;
                    addEditMovieModal.style.display = 'block';
                }
            } else if (e.target.closest('.fa-trash')) {
                // Delete Movie
                if (confirm('Are you sure you want to remove this movie?')) {
                    this.moviesData.popular = this.moviesData.popular.filter(m => m.imdbID !== imdbID);
                    this.renderMovies(this.moviesData.popular);
                }
            }
        };
    }

    async loadMovies() {
        const moviesGrid = document.getElementById('moviesGrid');
        if (!moviesGrid) return;

        try {
            moviesGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading movies...</div>';
            
            // Get movies from config.js TOP_100_IMDB_MOVIES
            const { TOP_100_IMDB_MOVIES, API_KEY, BASE_URL } = await import('./config.js');
            
            const movies = await Promise.all(
                TOP_100_IMDB_MOVIES.slice(0, 20).map(async id => {
                    try {
                        const response = await fetch(`${BASE_URL}movie/${id}?api_key=${API_KEY}`);
                        if (!response.ok) return null;
                        const data = await response.json();
                        // Map TMDB fields to expected fields
                        return {
                            imdbID: data.imdb_id || id,
                            Title: data.title || data.original_title || 'Unknown',
                            Year: (data.release_date || '').slice(0, 4),
                            imdbRating: data.vote_average ? (data.vote_average/2).toFixed(1) : 'N/A',
                            Poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'img/placeholder.jpg',
                        };
                    } catch (e) {
                        return null;
                    }
                })
            );

            this.moviesData.popular = movies.filter(movie => movie !== null);
            this.renderMovies(this.moviesData.popular);
        } catch (error) {
            console.error('Error loading movies:', error);
            moviesGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading movies: ${error.message}</p>
                    <button onclick="this.loadMovies()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>`;
        }
    }

    renderMovies(movies) {
        const moviesGrid = document.getElementById('moviesGrid');
        if (!moviesGrid) return;

        moviesGrid.innerHTML = movies.map(movie => `
            <div class="movie-card" data-id="${movie.imdbID}">
                <img src="${movie.Poster}" alt="${movie.Title}" class="movie-poster" 
                    onerror="this.src='img/placeholder.jpg'">
                <div class="movie-info">
                    <h3>${movie.Title}</h3>
                    <div class="movie-meta">
                        <span>${movie.Year}</span>
                        <span class="rating">
                            <i class="fas fa-star"></i> ${movie.imdbRating}
                        </span>
                    </div>
                    <div class="movie-actions">
                        <button class="action-btn" onclick="editMovie('${movie.imdbID}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="removeMovie('${movie.imdbID}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterMovies() {
        const searchTerm = document.getElementById('movieSearch')?.value.toLowerCase();
        const filterValue = document.getElementById('movieFilter')?.value;
        
        let filteredMovies = this.moviesData[filterValue] || this.moviesData.popular;
        
        if (searchTerm) {
            filteredMovies = filteredMovies.filter(movie => 
                movie.Title.toLowerCase().includes(searchTerm) ||
                movie.Year.includes(searchTerm)
            );
        }
        
        this.renderMovies(filteredMovies);
    }

    editMovie(movieId) {
        // Implement movie editing functionality
        console.log('Edit movie:', movieId);
    }

    removeMovie(movieId) {
        if (confirm('Are you sure you want to remove this movie?')) {
            this.moviesData.popular = this.moviesData.popular.filter(
                movie => movie.imdbID !== movieId
            );
            this.renderMovies(this.moviesData.popular);
        }
    }

    setupReviewsTab() {
        const reviewsGrid = document.getElementById('reviewsGrid');
        if (!reviewsGrid) return;

        this.loadReviews();

        const reviewSearch = document.getElementById('reviewSearch');
        const reviewFilter = document.getElementById('reviewFilter');

        reviewSearch?.addEventListener('input', () => this.filterReviews());
        reviewFilter?.addEventListener('change', () => this.filterReviews());

        // Setup settings tab when it's loaded
        const settingsTab = document.getElementById('settings');
        if (settingsTab) {
            const observer = new MutationObserver(() => {
                if (settingsTab.classList.contains('active')) {
                    this.setupSettingsTab();
                }
            });
            observer.observe(settingsTab, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async loadReviews() {
        const reviewsGrid = document.getElementById('reviewsGrid');
        if (!reviewsGrid) return;

        try {
            reviewsGrid.innerHTML = '<div class="loading-spinner">Loading reviews...</div>';
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
            const { db } = await import('./firebase-config.js');
            const reviewsSnap = await getDocs(collection(db, 'reviews'));
            const reviewsList = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (reviewsList.length === 0) {
                reviewsGrid.innerHTML = '<div class="empty-message">No reviews found.</div>';
                return;
            }

            reviewsGrid.innerHTML = reviewsList.map(review => this.createReviewCard(review)).join('');
        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsGrid.innerHTML = '<div class="error-message">Error loading reviews</div>';
        }
    }

    createReviewCard(review) {
        // We'll use placeholders and asynchronously update the card with movie title and user name
        const cardId = `review-card-${review.id}`;
        const movieTitle = review.movieTitle || 'Loading...';
        const userName = review.userName || review.userEmail || review.userId || 'Loading...';
        setTimeout(async () => {
            // Fetch movie title if missing
            if (!review.movieTitle && review.movieId) {
                try {
                    const { fetchMovieDetails } = await import('./movieData.js');
                    const movie = await fetchMovieDetails(review.movieId);
                    if (movie && movie.Title) {
                        const el = document.querySelector(`#${cardId} .review-movie`);
                        if (el) el.textContent = movie.Title;
                    }
                } catch (e) { /* ignore */ }
            }
            // Fetch user name if missing
            if (!review.userName && review.userId) {
                try {
                    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
                    const { db } = await import('./firebase-config.js');
                    const userDoc = await getDoc(doc(db, 'users', review.userId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const el = document.querySelector(`#${cardId} .review-user`);
                        if (el) el.textContent = userData.name || userData.displayName || userData.email || review.userId;
                    }
                } catch (e) { /* ignore */ }
            }
        }, 0);
        // Add delete button for admin
        setTimeout(() => {
            const btn = document.querySelector(`#${cardId} .review-delete-btn`);
            if (btn) {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Are you sure you want to delete this review?')) return;
                    try {
                        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
                        const { db } = await import('./firebase-config.js');
                        await deleteDoc(doc(db, 'reviews', review.id));
                        // Refresh reviews
                        this.loadReviews();
                    } catch (err) {
                        alert('Failed to delete review.');
                        console.error('Delete review error:', err);
                    }
                });
            }
        }, 0);
        return `
            <div class="review-card" id="${cardId}" data-id="${review.id}">
                <div class="review-header">
                    <span class="review-movie">${movieTitle}</span>
                    <span class="review-rating">${review.rating !== undefined ? `⭐ ${review.rating}` : ''}</span>
                    <button class="review-delete-btn" title="Delete Review" style="float:right;background:none;border:none;color:#e74c3c;font-size:1.2rem;cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
                <div class="review-body">
                    <p class="review-text">${review.text || review.reviewText || ''}</p>
                </div>
                <div class="review-footer">
                    <span class="review-user">${userName}</span>
                </div>
            </div>
        `;
    }

    setupSettingsTab() {
        const passwordBtn = document.getElementById('adminChangePasswordBtn');
        const passwordInput = document.getElementById('adminChangePassword');
        if (passwordBtn && passwordInput) {
            passwordBtn.onclick = () => {
                if (!passwordInput.value) return alert('Enter a new password.');
                // TODO: Implement real password change logic
                alert('Password changed! (mock)');
                passwordInput.value = '';
            };
        }

        // Populate delete user dropdown
        const deleteUserSelect = document.getElementById('deleteUserSelect');
        const deleteUserBtn = document.getElementById('deleteUserBtn');
        if (deleteUserSelect) {
            import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js').then(async firestore => {
                try {
                    const { db } = await import('./firebase-config.js');
                    const usersSnap = await firestore.getDocs(firestore.collection(db, 'users'));
                    deleteUserSelect.innerHTML = '<option value="">Select User...</option>';
                    let found = false;
                    usersSnap.forEach(doc => {
                        const data = doc.data();
                        const label = `${data.displayName || data.name || data.email || doc.id} (${doc.id})`;
                        const option = document.createElement('option');
                        option.value = doc.id;
                        option.textContent = label;
                        deleteUserSelect.appendChild(option);
                        found = true;
                    });
                    if (!found) {
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = 'No users found';
                        deleteUserSelect.appendChild(option);
                    }
                } catch (err) {
                    console.error('Failed to fetch users:', err);
                    deleteUserSelect.innerHTML = '<option value="">Error loading users</option>';
                }
            });
        }
        if (deleteUserBtn && deleteUserSelect) {
            deleteUserBtn.onclick = async () => {
                const userId = deleteUserSelect.value;
                if (!userId) return alert('Please select a user to delete.');
                if (!confirm('Are you sure you want to delete this user account?')) return;
                try {
                    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
                    const { db } = await import('./firebase-config.js');
                    await deleteDoc(doc(db, 'users', userId));
                    alert('User deleted successfully!');
                    // Remove from dropdown
                    deleteUserSelect.querySelector(`option[value="${userId}"]`).remove();
                } catch (err) {
                    alert('Failed to delete user.');
                    console.error('Delete user error:', err);
                }
            };
        }
        const exportBtn = document.getElementById('exportDataBtn');
console.log('Export button found:', !!exportBtn, exportBtn);
if (exportBtn) {
    exportBtn.onclick = async () => {
        console.log('[Export CSV] Button clicked');
        try {
            // Dynamically import Firestore
            const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
            const { db } = await import('./firebase-config.js');

            // Fetch users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('[Export CSV] Users:', users);

            // Fetch reviews
            let reviews = [];
            try {
                const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
                reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                // If no reviews collection, skip
                reviews = [];
            }
            console.log('[Export CSV] Reviews:', reviews);

            // Convert to CSV
            const usersCsv = arrayToCsv(users, 'Users');
            const reviewsCsv = arrayToCsv(reviews, 'Reviews');
            const blob = new Blob([
                usersCsv + '\n\n' + reviewsCsv
            ], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flickpick_export_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            console.log('[Export CSV] Triggering download', a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        } catch (err) {
            alert('Failed to export data.');
            console.error('[Export CSV] Export error:', err);
        }
    };
}

// Helper to convert array of objects to CSV
function arrayToCsv(arr, sectionName) {
    if (!arr.length) return `${sectionName}: No data`;
    const keys = Object.keys(arr[0]);
    const header = sectionName + '\n' + keys.join(',');
    const rows = arr.map(obj => keys.map(k => JSON.stringify(obj[k] ?? '')).join(','));
    return [header, ...rows].join('\n');
}
    }

    setupReportsTab() {
        const reportsContainer = document.getElementById('reportsContainer');
        if (!reportsContainer) return;

        this.loadReports();

        const reportType = document.getElementById('reportType');
        const exportBtn = document.getElementById('exportReport');

        reportType?.addEventListener('change', () => this.loadReports());
        exportBtn?.addEventListener('click', () => this.exportReport());
    }

    async loadReports() {
        const reportsContainer = document.getElementById('reportsContainer');
        if (!reportsContainer) return;

        const reportType = document.getElementById('reportType')?.value || 'daily';
        
        try {
            const reportData = await this.generateReport(reportType);
            this.renderReport(reportData);
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsContainer.innerHTML = '<div class="error-message">Error generating report</div>';
        }
    }

    async generateReport(type) {
        // Implement report generation logic
        return {
            type,
            data: {
                userCount: this.getTotalUsers(),
                movieCount: 100,
                reviewCount: 0
            }
        };
    }

    exportReport() {
        // Implement report export logic
        console.log('Exporting report...');
        alert('Report exported successfully!');
    }

    setupSettingsTab() {
        const generalForm = document.getElementById('generalSettingsForm');
        const apiForm = document.getElementById('apiSettingsForm');

        generalForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGeneralSettings();
        });

        apiForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApiSettings();
        });

        this.loadSettings();
    }

    loadSettings() {
        const siteName = document.getElementById('siteName');
        const contactEmail = document.getElementById('contactEmail');
        const apiKey = document.getElementById('apiKey');
        const apiBaseUrl = document.getElementById('apiBaseUrl');

        // Load saved settings from localStorage
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        
        if (siteName) siteName.value = settings.siteName || 'FLICKPICK';
        if (contactEmail) contactEmail.value = settings.contactEmail || '';
        if (apiKey) apiKey.value = settings.apiKey || '';
        if (apiBaseUrl) apiBaseUrl.value = settings.apiBaseUrl || '';
    }

    saveGeneralSettings() {
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        settings.siteName = document.getElementById('siteName')?.value;
        settings.contactEmail = document.getElementById('contactEmail')?.value;
        
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        alert('General settings saved successfully!');
    }

    saveApiSettings() {
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        settings.apiKey = document.getElementById('apiKey')?.value;
        settings.apiBaseUrl = document.getElementById('apiBaseUrl')?.value;
        
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        alert('API settings updated successfully!');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminManager();
});
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminManager();
});