import { submitReview, fetchReviews } from './review.js';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tvId = urlParams.get('id');
    let selectedRating = 0;
    const stars = document.querySelectorAll('#starRating .star');
    const reviewText = document.getElementById('reviewText');
    const submitBtn = document.getElementById('submitReviewBtn');
    const reviewMsg = document.getElementById('reviewMessage');
    const reviewsContainer = document.getElementById('reviewsContainer');

    function highlightStars(rating) {
        stars.forEach(star => {
            star.classList.toggle('selected', parseInt(star.dataset.value) <= rating);
        });
    }
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.value)));
        star.addEventListener('mouseleave', () => highlightStars(selectedRating));
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            highlightStars(selectedRating);
        });
    });

    async function loadReviews() {
        reviewsContainer.innerHTML = '<div class="loading">Loading reviews...</div>';
        try {
            const reviews = await fetchReviews(tvId);
            if (!reviews.length) {
                reviewsContainer.innerHTML = '<div class="error">No reviews yet.</div>';
                return;
            }
            reviewsContainer.innerHTML = reviews.map(r => `
                <div class="review">
                    <div class="review-header">
                        <span class="review-user">${r.userName || 'Anonymous'}</span>
                        <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                    </div>
                    <div class="review-body">${r.reviewText}</div>
                    <div class="review-date">${r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString() : ''}</div>
                </div>
            `).join('');
        } catch (err) {
            reviewsContainer.innerHTML = '<div class="error">Failed to load reviews.</div>';
        }
    }

    submitBtn.addEventListener('click', async () => {
        if (!selectedRating) {
            reviewMsg.textContent = 'Please select a rating.';
            return;
        }
        if (!reviewText.value.trim()) {
            reviewMsg.textContent = 'Please write a review.';
            return;
        }
        submitBtn.disabled = true;
        reviewMsg.textContent = 'Submitting...';
        try {
            await submitReview(tvId, selectedRating, reviewText.value.trim());
            reviewMsg.textContent = 'Review submitted!';
            reviewText.value = '';
            selectedRating = 0;
            highlightStars(0);
            await loadReviews();
        } catch (err) {
            reviewMsg.textContent = err.message || 'Failed to submit review.';
        }
        submitBtn.disabled = false;
    });

    highlightStars(0);
    loadReviews();
});
