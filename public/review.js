// review.js
// Handles posting and displaying reviews with star ratings for movies
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, getDocs, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function submitReview(movieId, rating, reviewText) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('You must be logged in to post a review.');
    const review = {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous',
        rating,
        reviewText,
        createdAt: Timestamp.now()
    };
    const reviewsCol = collection(db, 'reviews');
    await addDoc(reviewsCol, { ...review, movieId });
}

export async function fetchReviews(movieId) {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('movieId', '==', movieId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}
