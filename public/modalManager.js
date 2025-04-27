export class ModalManager {
    constructor() {
        this.loginModal = document.getElementById('loginModal');
        this.verificationModal = document.getElementById('verificationModal');
        this.setupEventListeners();
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
    }

    showVerificationModal() {
        if (this.verificationModal) {
            this.verificationModal.style.display = 'flex';
            this.loginModal.style.display = 'none';
        }
    }

    hideVerificationModal() {
        const verificationModal = document.getElementById('verificationModal');
        if (verificationModal) {
            verificationModal.style.display = 'none';
        }
    }

    hideAllModals() {
        if (this.loginModal) this.loginModal.style.display = 'none';
        if (this.verificationModal) this.verificationModal.style.display = 'none';
    }

    setupEventListeners() {
        // Close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideAllModals());
        });

        // Cancel verification button
        const cancelVerification = document.getElementById('cancelVerification');
        if (cancelVerification) {
            cancelVerification.addEventListener('click', () => {
                this.showLoginModal();
            });
        }

        // Close on outside click
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // View profile button
        const viewProfileBtn = document.querySelector('[data-action="viewProfile"]');
        if (viewProfileBtn) {
            viewProfileBtn.addEventListener('click', () => {
                window.location.href = 'profile1.html';
            });
        }

        // Update profile navigation
        const profileLinks = document.querySelectorAll('a[href="profile1.html"]');
        profileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (currentUser) {
                    window.location.href = 'profile1.html';
                }
                // If not logged in, do nothing (no modal)

            });
        });
    }
}