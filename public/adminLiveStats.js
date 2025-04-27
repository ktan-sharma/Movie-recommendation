// adminLiveStats.js
// Fetch and update live stats for admin dashboard (users, reviews) from Firestore
import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

export async function updateAdminLiveStats() {
    try {
        // Users count
        const usersSnap = await getDocs(collection(db, 'users'));
        const userCount = usersSnap.docs.length;
        console.log('[adminLiveStats] User docs:', usersSnap.docs.map(d=>d.id));
        // Reviews count
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const reviewCount = reviewsSnap.docs.length;
        console.log('[adminLiveStats] Review docs:', reviewsSnap.docs.map(d=>d.id));

        // Update stat cards
        const statUsers = document.getElementById('statUsers');
        if (statUsers) statUsers.textContent = userCount;
        const statReviews = document.getElementById('statReviews');
        if (statReviews) statReviews.textContent = reviewCount;

        // Optionally, update the overview tab if it renders counts directly (robustness)
        const overview = document.getElementById('overview');
        if (overview) {
            // Try to update numbers in the overview if present
            const userStat = overview.querySelector('.stat-card .stat-value#statUsers');
            if (userStat) userStat.textContent = userCount;
            const reviewStat = overview.querySelector('.stat-card .stat-value#statReviews');
            if (reviewStat) reviewStat.textContent = reviewCount;
        }
    } catch (e) {
        console.error('Error loading live stats:', e);
    }
}


// Optionally, auto-update every X seconds (uncomment below to enable polling)
// setInterval(updateAdminLiveStats, 15000); // every 15 seconds
