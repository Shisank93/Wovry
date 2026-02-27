import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatPrice, showMessage } from './utils.js';

const STATUS_ORDER = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STATUS_PROGRESS = { 'Pending': 12.5, 'Processing': 37.5, 'Shipped': 62.5, 'Delivered': 100 };
const STATUS_COLORS = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Processing': 'bg-blue-100 text-blue-800',
    'Shipped': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
};

export function initializeOrderTracking() {
    const trackBtn = document.getElementById('track-order-btn');
    const input = document.getElementById('track-order-id');

    if (!trackBtn || !input) return;

    trackBtn.addEventListener('click', () => searchOrder(input.value.trim()));

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchOrder(input.value.trim());
    });
}

async function searchOrder(orderId) {
    const errorElem = document.getElementById('track-error');
    const resultElem = document.getElementById('track-result');

    if (!orderId) {
        errorElem.textContent = 'Please enter an order ID.';
        errorElem.classList.remove('hidden');
        resultElem.classList.add('hidden');
        return;
    }

    errorElem.classList.add('hidden');

    try {
        // Try finding by orderId field first
        const q = query(collection(db, "orders"), where("orderId", "==", orderId));
        let snap = await getDocs(q);

        // If not found, try by document ID
        if (snap.empty) {
            const docRef = doc(db, "orders", orderId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                renderOrderResult({ id: docSnap.id, ...docSnap.data() });
                return;
            }
        } else {
            const orderDoc = snap.docs[0];
            renderOrderResult({ id: orderDoc.id, ...orderDoc.data() });
            return;
        }

        // Not found
        errorElem.textContent = 'Order not found. Please check your order ID and try again.';
        errorElem.classList.remove('hidden');
        resultElem.classList.add('hidden');

    } catch (err) {
        console.error("Error tracking order:", err);
        errorElem.textContent = 'Something went wrong. Please try again later.';
        errorElem.classList.remove('hidden');
    }
}

function renderOrderResult(order) {
    const resultElem = document.getElementById('track-result');
    resultElem.classList.remove('hidden');

    const status = order.status || 'Pending';
    const displayId = order.orderId || `KP-${order.id.slice(0, 8).toUpperCase()}`;

    // Order ID & Status badge
    document.getElementById('result-order-id').textContent = displayId;
    const badge = document.getElementById('result-status-badge');
    badge.textContent = status;
    badge.className = `px-4 py-2 rounded-full text-sm font-bold ${STATUS_COLORS[status] || STATUS_COLORS['Pending']}`;

    // Progress bar & steps
    const statusIdx = STATUS_ORDER.indexOf(status);
    const progress = STATUS_PROGRESS[status] || 0;
    document.getElementById('progress-bar').style.width = `${status === 'Cancelled' ? 0 : progress}%`;

    STATUS_ORDER.forEach((s, i) => {
        const stepDiv = document.getElementById(`step-${s.toLowerCase()}`);
        if (stepDiv) {
            const circle = stepDiv.querySelector('div');
            if (status === 'Cancelled') {
                circle.classList.remove('bg-amber-600');
                circle.classList.add('bg-gray-300');
            } else if (i <= statusIdx) {
                circle.classList.remove('bg-gray-300');
                circle.classList.add('bg-amber-600');
            } else {
                circle.classList.remove('bg-amber-600');
                circle.classList.add('bg-gray-300');
            }
        }
    });

    // Customer details
    document.getElementById('result-customer').textContent = order.name || 'N/A';
    document.getElementById('result-email').textContent = order.email || 'N/A';
    document.getElementById('result-payment').textContent = (order.paymentMethod || 'stripe').toUpperCase();

    const date = order.createdAt?.toDate?.() || (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date());
    document.getElementById('result-date').textContent = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    // Items
    const itemsElem = document.getElementById('result-items');
    itemsElem.innerHTML = (order.items || []).map(item => `
        <div class="flex justify-between items-center text-sm py-1">
            <span>${item.name} <span class="text-gray-400">× ${item.quantity}</span></span>
            <span class="font-medium">${formatPrice(item.price * item.quantity)}</span>
        </div>
    `).join('');

    // Total
    document.getElementById('result-total').textContent = formatPrice(order.total || 0);

    // Scroll to results
    resultElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
