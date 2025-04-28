class AuthManager {
    constructor() {
        // Removed localStorage-based user state. User state is managed via Firebase Auth and Firestore only.
        this.currentUser = null;
        this.initializeAuth();
    }

    initializeAuth() {
        this.setupLoginModal();
        this.setupEventListeners();
        this.setupProfileDropdown();
        this.updateUI();
        // Hide register button when logged in
        import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js').then(({ getAuth, onAuthStateChanged }) => {
            const auth = getAuth();
            const registerBtn = document.getElementById('registerBtn');
            onAuthStateChanged(auth, (user) => {
                if (registerBtn) {
                    registerBtn.style.display = user ? 'none' : '';
                }
            });
        });
    }

    setupLoginModal() {
        const modalHtml = `
            <div id="loginModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <div id="loginSection">
                        <h2>Login</h2>
                        <form id="loginForm">
                            <div class="form-group">
                                <input type="email" id="loginEmail" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="loginPassword" placeholder="Password" required>
                            </div>
                            <button type="submit" class="auth-button">Login</button>
                        </form>
                        <p>Don't have an account? <a href="#" id="showRegister">Register</a></p>
                    </div>
                    <div id="registerSection" style="display: none;">
                        <h2>Register</h2>
                        <form id="registerForm">
                            <div class="form-group">
                                <input type="text" id="registerName" placeholder="Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" id="registerEmail" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="registerPassword" placeholder="Password" required>
                            </div>
                            <button type="submit" class="auth-button">Register</button>
                        </form>
                        <p>Already have an account? <a href="#" id="showLogin">Login</a></p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    setupEventListeners() {
        const modal = document.getElementById('loginModal');
        const loginBtn = document.getElementById('loginBtn');
        const closeBtn = document.querySelector('.close');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');

        // Login button click handler
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                window.location.href = 'register.html';
            });
        }

        // Close button click handler
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Show register form
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
        });

        // Show login form
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        });

        // Login form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password);
        });

        // Register form submission
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            this.register(name, email, password);
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    setupProfileDropdown() {
        const profileHtml = `
            <div class="user-profile" style="display: none;">
                <div class="profile-container">
                    <a href="profile1.html" class="profile-link">
                        <div class="profile-icon">
                            <span class="profile-initials"></span>
                        </div>
                    </a>
                    <div class="profile-dropdown">
                        <a href="#" class="profile-menu-item" id="myProfileBtn">
                            <i class="fas fa-user"></i>
                            My Profile
                        </a>
                        <a href="watchlist.html" class="profile-menu-item">
                            <i class="fas fa-list"></i>
                            My Watchlist
                        </a>
                        <div class="profile-menu-divider"></div>
                        <div class="profile-menu-item" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert profile HTML after the login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.insertAdjacentHTML('afterend', profileHtml);
        }

        // Setup profile dropdown event listeners
        const profileContainer = document.querySelector('.profile-container');
        const profileDropdown = document.querySelector('.profile-dropdown');
        const logoutBtn = document.getElementById('logoutBtn');
        const myProfileBtn = document.getElementById('myProfileBtn');

        if (profileContainer) {
            // Show dropdown on hover
            profileContainer.addEventListener('mouseenter', () => {
                if (profileDropdown) {
                    profileDropdown.style.display = 'block';
                }
            });

            // Hide dropdown when mouse leaves
            profileContainer.addEventListener('mouseleave', () => {
                if (profileDropdown) {
                    profileDropdown.style.display = 'none';
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
                if (profileDropdown) {
                    profileDropdown.style.display = 'none';
                }
            });
        }

        if (myProfileBtn) {
            myProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'profile1.html';
            });
        }
    }

    async login(email, password) {
        try {
            const user = await window.firebaseLoginUser(email, password);
            this.currentUser = await window.firebaseGetUserInfo(user.uid);
            this.updateUI();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('loginForm').reset();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async register(name, email, password) {
        try {
            const user = await window.firebaseRegisterUser(name, email, password);
            this.currentUser = await window.firebaseGetUserInfo(user.uid);
            this.updateUI();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerForm').reset();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async logout() {
        try {
            await window.firebaseLogoutUser();
            this.currentUser = null;
            this.updateUI();
        } catch (error) {
            console.error('Firebase logout error:', error);
        }
    }

    updateUI() {
    console.log('[updateUI] Called. currentUser:', this.currentUser);
        const loginBtn = document.getElementById('loginBtn');
        const profileIcon = document.getElementById('profileIcon');
        const profileInitials = document.getElementById('navbarProfileInitials');
        const profileDropdown = document.getElementById('profileDropdown');

        if (this.currentUser) {
            // Hide login button
            if (loginBtn) loginBtn.style.display = 'none';
            // Show profile icon and initials
            if (profileIcon) profileIcon.style.display = 'inline-block';
            if (profileInitials) {
                // --- PROFILE IMAGE/INITIALS LOGIC ---
                const navbarProfileImage = document.getElementById('navbarProfileImage');
                const navbarProfileInitials = document.getElementById('navbarProfileInitials');
                if (navbarProfileImage && navbarProfileInitials) {
                    let profilePic = this.currentUser.profilePicture;
                    if (!profilePic) {
                        // Fallback to remote avatar
                        profilePic = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.currentUser.name || 'User') + '&background=random&format=png';
                    }
                    // Show image if available, else initials
                    if (this.currentUser.profilePicture) {
                        navbarProfileImage.src = profilePic;
                        navbarProfileImage.style.display = 'inline-block';
                        navbarProfileInitials.style.display = 'none';
                    } else {
                        navbarProfileImage.style.display = 'none';
                        // Show initials
                        let initials = '';
                        if (this.currentUser.name) {
                            initials = this.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        }
                        navbarProfileInitials.textContent = initials || 'U';
                        navbarProfileInitials.style.display = 'flex';
                    }
                }
            }
            // Hide dropdown by default
            if (profileDropdown) profileDropdown.style.display = 'none';
        } else {
            // Show login button
            if (loginBtn) loginBtn.style.display = 'block';
            // Hide profile icon, initials, and dropdown
            if (profileIcon) profileIcon.style.display = 'none';
            if (profileInitials) profileInitials.style.display = 'none';
            if (profileDropdown) profileDropdown.style.display = 'none';
        }

        // Add dropdown toggle logic (only once)
        if (profileIcon && profileDropdown && !profileIcon.hasAttribute('data-listener')) {
            profileIcon.setAttribute('data-listener', 'true');
            profileIcon.addEventListener('click', () => {
                if (profileDropdown.style.display === 'block') {
                    profileDropdown.style.display = 'none';
                } else {
                    profileDropdown.style.display = 'block';
                }
            });
            // Optional: Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && e.target !== profileIcon) {
                    profileDropdown.style.display = 'none';
                }
            });
        }
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const modalContent = document.querySelector('.modal-content');
        const existingError = modalContent.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        modalContent.insertBefore(errorDiv, modalContent.firstChild);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// Import firebase modules
import { registerUser as firebaseRegisterUser, loginUser as firebaseLoginUser, logoutUser as firebaseLogoutUser, getUserInfo as firebaseGetUserInfo, onUserStateChanged as firebaseOnUserStateChanged } from './firebase-auth.js';

// Expose firebase auth methods globally for use in AuthManager methods
window.firebaseRegisterUser = firebaseRegisterUser;
window.firebaseLoginUser = firebaseLoginUser;
window.firebaseLogoutUser = firebaseLogoutUser;
window.firebaseGetUserInfo = firebaseGetUserInfo;
window.firebaseOnUserStateChanged = firebaseOnUserStateChanged;

export const userManager = new AuthManager();

// Listen to Firebase auth state changes and update AuthManager accordingly
import { ensureUserDocExists } from './firebase-auth.js';

firebaseOnUserStateChanged(async (user) => {
    console.log('[AuthStateChanged] Fired. User:', user);
    if (user) {
        // Ensure user doc exists in Firestore and load it
        userManager.currentUser = await ensureUserDocExists(user);
        console.log('[AuthStateChanged] currentUser:', userManager.currentUser);
    } else {
        userManager.currentUser = null;
        console.log('[AuthStateChanged] No user, set currentUser to null');
    }
    userManager.updateUI();
});