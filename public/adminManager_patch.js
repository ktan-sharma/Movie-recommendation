// Patch for AdminManager: dispatch custom event after dashboard is shown
import { AdminManager } from './adminManager.js';

class PatchedAdminManager extends AdminManager {
    constructor(...args) {
        super(...args);
        console.log('[PatchedAdminManager] Constructor called');
    }
    // Only patch showDashboard, do NOT override constructor or setupSettingsTab
    showDashboard(username) {
        super.showDashboard(username);
        // Dispatch event for live stats update (external handler)
        document.dispatchEvent(new CustomEvent('admin-dashboard-shown'));
    }
}

// Replace the global instance if needed
window.AdminManager = PatchedAdminManager;

document.addEventListener('DOMContentLoaded', () => {
    new PatchedAdminManager();
});
