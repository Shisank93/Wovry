import { getCart, saveCart } from './cart.js';
import { formatPrice, showMessage } from './utils.js';
import { auth, db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { applyCoupon, calculateShipping } from './coupon.js';

let currentDiscount = 0;
let currentShipping = 0;

export function initializeCheckout() {
    const checkoutForm = document.getElementById('checkout-form');
    if (!checkoutForm) return;

    // Render initial order summary
    updateOrderSummary();

    // Coupon apply
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    applyCouponBtn?.addEventListener('click', () => {
        const code = document.getElementById('coupon-input').value;
        const cart = getCart();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const result = applyCoupon(code, subtotal);

        const msgElem = document.getElementById('coupon-message');
        msgElem.textContent = result.message;
        msgElem.classList.remove('hidden');
        msgElem.className = `text-sm mt-1 ${result.valid ? 'text-green-600' : 'text-red-500'}`;

        if (result.valid) {
            currentDiscount = result.discount;
            document.getElementById('discount-row')?.classList.remove('hidden');
        } else {
            currentDiscount = 0;
            document.getElementById('discount-row')?.classList.add('hidden');
        }
        updateOrderSummary();
    });

    // Stripe setup
    const stripe = typeof Stripe !== 'undefined'
        ? Stripe('pk_test_51S4ivf4E7X4cBFilWAYYwnuT0VAYCJJ43WIPPaxe6I5Y52ldDwmVHh2Tv11WzTcPOhjwV4kzY06vHGkG9Gpy4vzF00S0E46ukd')
        : null;

    // Form Submit
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const cart = getCart();

        if (cart.length === 0) {
            showMessage('Your cart is empty!', 'error');
            return;
        }

        const customerInfo = {
            userId: user ? user.uid : null,
            name: document.getElementById('checkout-name').value,
            email: document.getElementById('checkout-email').value,
            phone: document.getElementById('checkout-phone').value,
            address: document.getElementById('checkout-address').value,
            city: document.getElementById('checkout-city').value,
            state: document.getElementById('checkout-state').value,
            zip: document.getElementById('checkout-zip').value,
        };

        // Basic validation
        if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'stripe';
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal - currentDiscount + currentShipping;

        const checkoutButton = checkoutForm.querySelector('button[type="submit"]');
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Processing...';

        try {
            if (paymentMethod === 'cod') {
                // Generate unique order ID
                const orderId = 'KP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

                // Cash on Delivery - save order directly to Firestore
                await addDoc(collection(db, "orders"), {
                    orderId,
                    ...customerInfo,
                    items: cart,
                    subtotal,
                    discount: currentDiscount,
                    shipping: currentShipping,
                    total,
                    paymentMethod: 'cod',
                    paymentStatus: 'Pending',
                    status: 'Pending',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                saveCart([]); // Clear cart
                showMessage(`Order ${orderId} placed! You will pay ₹${total} on delivery.`, 'success');
                // Store orderId in sessionStorage for success page
                sessionStorage.setItem('lastOrderId', orderId);
                setTimeout(() => { window.location.href = 'payment-success.html'; }, 2500);

            } else if (paymentMethod === 'razorpay') {
                // Razorpay placeholder
                showMessage('Razorpay integration coming soon! Please use Card or COD for now.', 'error');

            } else {
                // Stripe
                if (!stripe) {
                    showMessage('Payment system not loaded. Please refresh and try again.', 'error');
                    return;
                }

                const functionUrl = 'https://us-central1-wovry-1873f.cloudfunctions.net/createCheckoutSession';
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: cart, customerInfo, discount: currentDiscount }),
                });

                if (!response.ok) throw new Error('Failed to create checkout session.');
                const session = await response.json();
                const { error } = await stripe.redirectToCheckout({ sessionId: session.id });
                if (error) {
                    console.error('Stripe redirect error:', error);
                    showMessage(error.message, 'error');
                }
            }
        } catch (error) {
            console.error('Error during checkout:', error);
            showMessage('Failed to proceed. Please try again.', 'error');
        } finally {
            checkoutButton.disabled = false;
            checkoutButton.textContent = 'Proceed to Payment';
        }
    });
}

function updateOrderSummary() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = calculateShipping(subtotal);
    currentShipping = shipping.cost;
    const total = subtotal - currentDiscount + currentShipping;

    const subtotalElem = document.getElementById('summary-subtotal');
    const discountElem = document.getElementById('summary-discount');
    const shippingElem = document.getElementById('summary-shipping');
    const shippingMsg = document.getElementById('shipping-message');
    const totalElem = document.getElementById('summary-total');
    const itemsElem = document.getElementById('order-summary-items');

    if (subtotalElem) subtotalElem.textContent = formatPrice(subtotal);
    if (discountElem) discountElem.textContent = `-${formatPrice(currentDiscount)}`;
    if (shippingElem) shippingElem.textContent = shipping.cost === 0 ? 'FREE' : formatPrice(shipping.cost);
    if (shippingMsg) shippingMsg.textContent = shipping.message;
    if (totalElem) totalElem.textContent = formatPrice(total);

    if (itemsElem) {
        itemsElem.innerHTML = cart.map(item => `
            <div class="flex justify-between items-center py-2">
                <div class="flex items-center gap-3">
                    <img src="${item.imageUrl}" alt="${item.name}" class="w-12 h-12 object-cover rounded">
                    <div>
                        <p class="text-sm font-medium">${item.name}</p>
                        <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
                    </div>
                </div>
                <span class="text-sm font-semibold">${formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');
    }
}
