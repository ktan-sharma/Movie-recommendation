// adminModal.js: Handles interactive modals for admin dashboard stats

export function setupStatCardModals() {
  // Modal HTML
  let modal = document.createElement('div');
  modal.id = 'statInfoModal';
  modal.className = 'stat-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="stat-modal-content">
      <span class="stat-modal-close">&times;</span>
      <div id="statModalContent"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close modal on click X or outside
  modal.querySelector('.stat-modal-close').onclick = () => (modal.style.display = 'none');
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  // Attach click listeners to all stat cards
  document.querySelectorAll('.stat-card .stat-footer a').forEach((btn, idx) => {
    btn.style.cursor = 'pointer';
    btn.onclick = (e) => {
      e.preventDefault();
      let content = '';
      switch(idx) {
        case 0: // Users
          content = `<h2>Total Users</h2><p>Shows the number of registered users. <br><br><button onclick=\"window.location.hash='users';document.querySelector('[data-tab=users]').click();document.getElementById('statInfoModal').style.display='none'\">View User List</button></p>`;
          break;
        case 1: // Movies
          content = `<h2>Total Movies</h2><p>Shows the number of movies in the database. <br><br><button onclick=\"window.location.hash='movies';document.querySelector('[data-tab=movies]').click();document.getElementById('statInfoModal').style.display='none'\">Manage Movies</button></p>`;
          break;
        case 2: // Reviews
          content = `<h2>Total Reviews</h2><p>Shows the number of reviews submitted by users. <br><br><button onclick=\"window.location.hash='reviews';document.querySelector('[data-tab=reviews]').click();document.getElementById('statInfoModal').style.display='none'\">See All Reviews</button></p>`;
          break;
      }
      document.getElementById('statModalContent').innerHTML = content;
      modal.style.display = 'block';
    };
  });
}

// Optional: Call this on DOMContentLoaded if not using modules
// setupStatCardModals();
