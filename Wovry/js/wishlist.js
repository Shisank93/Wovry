import { db, auth } from './firebase-config.js';
import { doc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showMessage } from './utils.js';

const WISHLIST_KEY = 'wovry_wishlist';

// Get wishlist - from Firestore if logged in, localStorage otherwise
export async function getWishlist() {
    const user = auth.currentUser;
    if (user) {
        try {
            const snap = await getDocs(collection(db, `users/${user.uid}/wishlist`));
            return snap.docs.map(d => d.id);
        } catch (e) {
            console.error("Error fetching wishlist:", e);
            return getLocalWishlist();
        }
    }
    return getLocalWishlist();
}

function getLocalWishlist() {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
}

function saveLocalWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

export async function addToWishlist(productId) {
    const user = auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(db, `users/${user.uid}/wishlist`, productId), { addedAt: new Date() });
        } catch (e) { console.error(e); }
    } else {
        const list = getLocalWishlist();
        if (!list.includes(productId)) { list.push(productId); saveLocalWishlist(list); }
    }
    showMessage('Added to wishlist ❤️', 'success');
}

export async function removeFromWishlist(productId) {
    const user = auth.currentUser;
    if (user) {
        try {
            await deleteDoc(doc(db, `users/${user.uid}/wishlist`, productId));
        } catch (e) { console.error(e); }
    } else {
        const list = getLocalWishlist().filter(id => id !== productId);
        saveLocalWishlist(list);
    }
    showMessage('Removed from wishlist', 'success');
}

export async function toggleWishlist(productId) {
    const list = await getWishlist();
    if (list.includes(productId)) {
        await removeFromWishlist(productId);
        return false;
    } else {
        await addToWishlist(productId);
        return true;
    }
}

export async function isInWishlist(productId) {
    const list = await getWishlist();
    return list.includes(productId);
}
