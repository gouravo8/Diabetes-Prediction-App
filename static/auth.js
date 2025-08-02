import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCowxZFnmgcDkHNwwnahw4Tvat0IgAyQ-Y",
    authDomain: "diabetes-prediction-f0a3b.firebaseapp.com",
    projectId: "diabetes-prediction-f0a3b",
    storageBucket: "diabetes-prediction-f0a3b.firebasestorage.app",
    messagingSenderId: "717769556705",
    appId: "1:717769556705:web:990820cd33dd6feae92da0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Get UI elements
const authModal = document.getElementById('authModal');
const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignupLink');
const showLoginLink = document.getElementById('showLoginLink');
const modalBackdrop = document.getElementById('modalBackdrop');

/**
 * Custom function to display a message box instead of using alert().
 * @param {string} message The message to display.
 * @param {string} type The type of message ('info', 'success', 'error').
 */
function displayMessageBox(message, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box', type);
    messageBox.innerHTML = `<p>${message}</p><button class="close-message">&times;</button>`;
    document.body.appendChild(messageBox);

    messageBox.querySelector('.close-message').addEventListener('click', () => {
        messageBox.remove();
    });

    if (type !== 'error') {
        setTimeout(() => {
            messageBox.remove();
        }, 5000);
    }
}

// --- Event Listeners for UI ---
if (authButton) {
    authButton.addEventListener('click', () => {
        modalBackdrop.classList.remove('hidden');
        authModal.classList.remove('hidden');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            displayMessageBox('You have been logged out.', 'success');
        } catch (error) {
            console.error("Error signing out:", error);
            displayMessageBox(`Error signing out: ${error.message}`, 'error');
        }
    });
}

if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });
}

if (authModal) {
    authModal.querySelector('.close-btn').addEventListener('click', () => {
        modalBackdrop.classList.add('hidden');
        authModal.classList.add('hidden');
    });
}

if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
        modalBackdrop.classList.add('hidden');
        authModal.classList.add('hidden');
    });
}


// --- Firebase Authentication Functions ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.loginEmail.value;
        const password = loginForm.loginPassword.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            displayMessageBox('Login successful!', 'success');
            modalBackdrop.classList.add('hidden');
            authModal.classList.add('hidden');
        } catch (error) {
            displayMessageBox(`Login failed: ${error.message}`, 'error');
            console.error('Login error:', error);
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            displayMessageBox('Sign up successful! You are now logged in.', 'success');
            modalBackdrop.classList.add('hidden');
            authModal.classList.add('hidden');
        } catch (error) {
            displayMessageBox(`Sign up failed: ${error.message}`, 'error');
            console.error('Sign up error:', error);
        }
    });
}

export { app, auth, db };
