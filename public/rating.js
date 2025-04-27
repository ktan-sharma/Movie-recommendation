export class RatingManager {
    constructor() {
        this.modal = document.getElementById('ratingModal');
        this.stars = document.querySelectorAll('.stars i');
        this.ratingValue = document.querySelector('.rating-value');
        this.submitButton = document.getElementById('submitRating');
        this.currentMovieId = null;
        this.setupEventListeners();
    }

    showRatingModal(movieId) {
        this.currentMovieId = movieId;
        this.modal.style.display = 'flex';
        this.resetStars();
    }

    hideRatingModal() {
        this.modal.style.display = 'none';
        this.resetStars();
    }

    resetStars() {
        this.stars.forEach(star => star.classList.remove('active'));
        this.ratingValue.textContent = '0';
    }

    setupEventListeners() {
        // Star rating hover and click
        this.stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.dataset.rating;
                this.setRating(rating);
            });
        });

        // Submit rating
        this.submitButton.addEventListener('click', () => {
            const rating = parseInt(this.ratingValue.textContent);
            if (rating > 0) {
                this.saveRating(rating);
            }
        });

        // Close modal
        const closeBtn = this.modal.querySelector('.close');
        closeBtn.addEventListener('click', () => this.hideRatingModal());

        // Close on outside click
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hideRatingModal();
            }
        });
    }

    setRating(rating) {
        this.stars.forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            star.classList.toggle('active', starRating <= rating);
        });
        this.ratingValue.textContent = rating;
    }

    async saveRating(rating) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                alert('Please login to rate movies');
                return;
            }

            // Save rating to user's ratings
            if (!currentUser.ratings) currentUser.ratings = {};
            currentUser.ratings[this.currentMovieId] = rating;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Update users in localStorage
            const users = JSON.parse(localStorage.getItem('users'));
            users[currentUser.email] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));

            this.hideRatingModal();
            alert('Rating saved successfully!');
        } catch (error) {
            console.error('Error saving rating:', error);
            alert('Failed to save rating. Please try again.');
        }
    }
}