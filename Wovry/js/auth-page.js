import { auth } from './firebase-config.js';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showMessage } from './utils.js';

export function initializeAuthPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authToggleBtn = document.getElementById('auth-toggle');
    const authTitle = document.getElementById('auth-title');
    const googleAuthBtn = document.getElementById('google-auth-btn');

    if (!loginForm || !signupForm) return;

    let isLoginMode = true;

    // Toggle between Login and Signup
    authToggleBtn?.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            authTitle.textContent = 'Log In';
            authToggleBtn.textContent = 'Switch to Sign Up';
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            authTitle.textContent = 'Sign Up';
            authToggleBtn.textContent = 'Switch to Log In';
        }
    });

    // Login with Email/Password
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Login error:", error);
            showMessage(getAuthErrorMessage(error.code), 'error');
        }
    });

    // Sign Up with Email/Password
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Account created! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Signup error:", error);
            showMessage(getAuthErrorMessage(error.code), 'error');
        }
    });

    // Google Login
    googleAuthBtn?.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Google auth error:", error);
            showMessage(getAuthErrorMessage(error.code), 'error');
        }
    });
}

function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use': return 'This email is already registered.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/popup-closed-by-user': return 'Login was cancelled.';
        default: return 'An error occurred. Please try again.';
    }
}
