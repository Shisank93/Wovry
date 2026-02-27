import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showMessage } from './utils.js';

// Pages that require authentication
const PROTECTED_PAGES = ['profile.html', 'checkout.html'];
const ADMIN_PAGES = ['admin.html'];
const ADMIN_EMAILS = ['shisankyadav3@gmail.com']; // Add admin emails here

export function initializeAuth(onUserAuthChanged) {
    onAuthStateChanged(auth, async (user) => {
        if (onUserAuthChanged) {
            onUserAuthChanged(user);
        }

        const currentPage = window.location.pathname.split('/').pop();

        // Route Guard: redirect unauthenticated users from protected pages
        if (!user && PROTECTED_PAGES.includes(currentPage)) {
            showMessage('Please log in to access this page.', 'error');
            setTimeout(() => { window.location.href = 'auth.html'; }, 1500);
            return;
        }

        // Admin Guard: redirect non-admin users from admin pages
        if (ADMIN_PAGES.includes(currentPage)) {
            const adminContent = document.getElementById('admin-content');
            const notAuthorized = document.getElementById('admin-not-authorized');
            if (!user || !ADMIN_EMAILS.includes(user.email)) {
                if (adminContent) adminContent.classList.add('hidden');
                if (notAuthorized) notAuthorized.classList.remove('hidden');
            } else {
                if (adminContent) adminContent.classList.remove('hidden');
                if (notAuthorized) notAuthorized.classList.add('hidden');
                // Dynamically load admin module
                import('./admin.js').then(module => module.initializeAdmin());
            }
        }

        // Update nav links based on auth state
        const profileLink = document.getElementById('profile-link');
        const loginLink = document.getElementById('login-link');

        if (profileLink && loginLink) {
            if (user) {
                profileLink.textContent = 'Account';
                profileLink.href = 'profile.html';
                loginLink.href = 'profile.html';
            } else {
                profileLink.textContent = 'Login';
                profileLink.href = 'auth.html';
                loginLink.href = 'auth.html';
            }
        }
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showMessage('You have been logged out.', 'success');
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } catch (e) {
                console.error("Error logging out: ", e);
            }
        });
    }
}
