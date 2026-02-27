import { initializeAuth } from './auth.js';
import { updateCartCount, addToCart, removeFromCart, updateQuantity, renderCart, getCart } from './cart.js';
import { fetchFeaturedProducts, fetchProducts } from './shop.js';
import { showMessage, formatPrice } from './utils.js';
import { db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeCartDrawer, toggleCartDrawer } from './drawer.js';
import { initProductDetailPage } from './product-detail.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Authentication and update UI based on user state
    initializeAuth((user) => {
        // If on user profile page, load user data
        const profileDetails = document.getElementById('profile-details');
        const orderHistory = document.getElementById('order-history');

        if (profileDetails && orderHistory) {
            if (user) {
                profileDetails.innerHTML = `
                     <p class="text-xl font-bold">Welcome, ${user.displayName || user.email}!</p>
                     <p class="text-gray-600">Email: ${user.email}</p>
                 `;
                fetchOrderHistory(user.uid);
            } else {
                profileDetails.innerHTML = `<p class="text-center text-gray-600">Please log in to view your profile.</p>`;
                orderHistory.innerHTML = '';
            }
        }
    });

    // 2. Initialize Cart count on all pages
    updateCartCount();

    // 2.5 Initialize Sliding Cart Drawer
    initializeCartDrawer();

    // 2.6 WhatsApp Floating Button (global)
    if (!document.getElementById('whatsapp-float')) {
        const wa = document.createElement('a');
        wa.id = 'whatsapp-float';
        wa.href = 'https://wa.me/919389480953?text=Hi!%20I%20have%20a%20question%20about%20Knit%20%26%20Purl%20products.';
        wa.target = '_blank';
        wa.rel = 'noopener noreferrer';
        wa.innerHTML = '<i class="fab fa-whatsapp text-3xl"></i>';
        wa.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;width:60px;height:60px;border-radius:50%;background:#25D366;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform 0.3s;';
        wa.onmouseenter = () => wa.style.transform = 'scale(1.1)';
        wa.onmouseleave = () => wa.style.transform = 'scale(1)';
        document.body.appendChild(wa);
    }

    // 3. Dark Mode Toggle setup
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    const applyDarkMode = (isDark) => {
        if (isDark) {
            body.classList.add('dark');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            body.classList.remove('dark');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    };

    if (localStorage.getItem('darkMode') === 'true') {
        applyDarkMode(true);
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isDarkMode = body.classList.toggle('dark');
            localStorage.setItem('darkMode', isDarkMode);
            applyDarkMode(isDarkMode);
        });
    }

    // 4. Global Event Listeners for Cart Actions (Add to cart buttons are dynamicaly rendered)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = e.target.dataset.productId;
            if (!productId) return;
            // Fetch product via shop js to get entire product object before adding to cart
            import('./firebase-config.js').then(async ({ db }) => {
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                try {
                    const docRef = doc(db, "products", productId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        addToCart({ id: docSnap.id, ...docSnap.data() });
                        toggleCartDrawer(); // Open drawer when item added
                    } else {
                        showMessage('Error: Could not find product.', 'error');
                    }
                } catch (err) {
                    showMessage('There was an issue adding the item to your cart.', 'error');
                }
            });
        }
    });

    // --- Page Specific Initialization ---

    // Homepage
    const featuredProductsGrid = document.getElementById('featured-products-grid');
    if (featuredProductsGrid) {
        fetchFeaturedProducts();
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('newsletter-email').value;
                try {
                    await addDoc(collection(db, "newsletterSubscribers"), {
                        email: email,
                        subscribedAt: new Date()
                    });
                    showMessage('Thank you for subscribing!', 'success');
                    newsletterForm.reset();
                } catch (e) {
                    console.error("Error adding document: ", e);
                    showMessage('Subscription failed. Please try again.', 'error');
                }
            });
        }
    }

    // Shop Page (Grid of products)
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        // The filtering logic remains somewhat complex, keep it bound to the page logic or extract to shop.js later
        import('./shop-page.js').then(module => module.initializeShopPage());
    }

    // Single Product Page
    const productDetailsSection = document.getElementById('product-details-section');
    if (productDetailsSection) {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        if (productId) {
            initProductDetailPage(productId);
        }
    }

    // Cart Page
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        renderCart();

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('cart-quantity')) {
                const productId = e.target.dataset.id;
                const newQuantity = e.target.value;
                updateQuantity(productId, newQuantity);
                renderCart();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-from-cart-btn')) {
                const productId = e.target.dataset.id;
                removeFromCart(productId);
                renderCart();
                showMessage('Item removed from cart.', 'success');
            }
        });
    }

    // Checkout Page
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        import('./checkout.js').then(module => module.initializeCheckout());
    }

    // Auth Page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        import('./auth-page.js').then(module => module.initializeAuthPage());
    }

    // Order Tracking Page
    const trackOrderBtn = document.getElementById('track-order-btn');
    if (trackOrderBtn) {
        import('./order-tracking.js').then(module => module.initializeOrderTracking());
    }

    // Contact Page
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await addDoc(collection(db, "contactMessages"), {
                    name: document.getElementById('contact-name').value,
                    email: document.getElementById('contact-email').value,
                    subject: document.getElementById('contact-subject')?.value || '',
                    message: document.getElementById('contact-message').value,
                    createdAt: new Date(),
                });
                showMessage('Message sent! We\'ll get back to you soon.', 'success');
                contactForm.reset();
            } catch (err) {
                console.error('Error sending contact message:', err);
                showMessage('Failed to send message. Please try again.', 'error');
            }
        });
    }
});

async function fetchOrderHistory(userId) {
    const orderHistory = document.getElementById('order-history');
    if (!orderHistory) return;
    try {
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            orderHistory.innerHTML = "<p>You have not placed any orders yet.</p>";
            return;
        }
        let ordersHtml = '';
        querySnapshot.forEach(doc => {
            const order = doc.data();
            const itemsHtml = order.items.map(item => `<li class="text-sm text-gray-600">${item.name} x ${item.quantity}</li>`).join('');
            ordersHtml += `
                <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
                    <p class="font-semibold text-gray-800">Order ID: ${doc.id}</p>
                    <p class="text-gray-600 text-sm mb-2">Total: ${formatPrice(order.total)}</p>
                    <p class="text-gray-600 text-sm">Status: ${order.status}</p>
                    <ul class="list-disc ml-5 mt-2">
                        ${itemsHtml}
                    </ul>
                </div>
            `;
        });
        orderHistory.innerHTML = ordersHtml;
    } catch (e) {
        console.error("Error fetching order history: ", e);
    }
}

function renderOrderSummary() {
    const orderSummaryItems = document.getElementById('order-summary-items');
    const summarySubtotalElem = document.getElementById('summary-subtotal');
    const summaryTotalElem = document.getElementById('summary-total');

    if (!orderSummaryItems) return;
    const cart = getCart();
    let subtotal = 0;
    const itemsHtml = cart.map(item => {
        subtotal += item.price * item.quantity;
        return `
            <div class="flex justify-between items-center py-2">
                <span>${item.name} x ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
        `;
    }).join('');

    orderSummaryItems.innerHTML = itemsHtml;
    if (summarySubtotalElem) summarySubtotalElem.textContent = formatPrice(subtotal);
    if (summaryTotalElem) summaryTotalElem.textContent = formatPrice(subtotal);
}

