import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCo0ODEyojQn8X5YQzM8fFcxcfuSSvT68A",
    authDomain: "wovry-1873f.firebaseapp.com",
    projectId: "wovry-1873f",
    storageBucket: "wovry-1873f.firebasestorage.app",
    messagingSenderId: "777775474897",
    appId: "1:777775474897:web:318ca67905d29202753df0",
    measurementId: "G-3NF7DYCHL4"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
