import { getCart, removeFromCart, updateQuantity, updateCartCount } from './cart.js';
import { formatPrice, showMessage } from './utils.js';

let isCartOpen = false;

export function initializeCartDrawer() {
    // 1. Inject the drawer HTML into the body if it doesn't exist
    if (!document.getElementById('cart-drawer')) {
        const drawerHtml = `
            <!-- Backdrop -->
            <div id="cart-backdrop" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity duration-300 opacity-0"></div>
            
            <!-- Drawer -->
            <div id="cart-drawer" class="fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 transform translate-x-full transition-transform duration-300 ease-in-out shadow-2xl flex flex-col">
                <!-- Header -->
                <div class="px-6 py-4 border-b flex justify-between items-center bg-brown-900 text-white">
                    <h2 class="text-xl font-bold font-playfair">Shopping Cart</h2>
                    <button id="close-cart-btn" class="text-white hover:text-gray-300 focus:outline-none">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Cart Items Container -->
                <div id="drawer-cart-items" class="flex-grow overflow-y-auto p-6 space-y-4">
                    <!-- Items injected here -->
                </div>
                
                <!-- Footer -->
                <div class="border-t p-6 bg-gray-50">
                    <div class="flex justify-between items-center mb-4 text-lg font-bold">
                        <span>Subtotal:</span>
                        <span id="drawer-cart-total">₹0.00</span>
                    </div>
                    <p class="text-sm text-gray-500 mb-4">Shipping and taxes calculated at checkout.</p>
                    <a href="checkout.html" class="block w-full btn-primary text-center py-3 rounded-lg font-semibold transition-colors">
                        Proceed to Checkout
                    </a>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', drawerHtml);
    }

    // 2. Attach Event Listeners
    const cartIcon = document.getElementById('cart-icon');
    const closeBtn = document.getElementById('close-cart-btn');
    const backdrop = document.getElementById('cart-backdrop');

    if (cartIcon) {
        // Prevent default navigation to cart.html
        cartIcon.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCartDrawer();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', toggleCartDrawer);
    }

    if (backdrop) {
        backdrop.addEventListener('click', toggleCartDrawer);
    }

    // 3. Delegate events for quantity changes and removal within the drawer
    const drawerCartItemsContainer = document.getElementById('drawer-cart-items');
    if (drawerCartItemsContainer) {
        drawerCartItemsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('drawer-cart-quantity')) {
                const productId = e.target.dataset.id;
                const newQuantity = e.target.value;
                updateQuantity(productId, newQuantity);
                renderCartDrawer(); // Re-render to update totals
                updateCartCount(); // Ensure global badge is synced
            }
        });

        drawerCartItemsContainer.addEventListener('click', (e) => {
            // Find closest button in case icon is clicked
            const btn = e.target.closest('.drawer-remove-btn');
            if (btn) {
                const productId = btn.dataset.id;
                removeFromCart(productId);
                renderCartDrawer();
                updateCartCount();
                showMessage('Item removed from cart.', 'success');
            }
        });
    }
}

export function toggleCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');

    if (!drawer || !backdrop) return;

    isCartOpen = !isCartOpen;

    if (isCartOpen) {
        renderCartDrawer(); // Render fresh content before opening
        backdrop.classList.remove('hidden');
        // Small delay to allow display:block to apply before animating opacity
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            drawer.classList.remove('translate-x-full');
        });
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
        backdrop.classList.add('opacity-0');
        drawer.classList.add('translate-x-full');

        // Wait for transition to finish before hiding
        setTimeout(() => {
            backdrop.classList.add('hidden');
        }, 300);
        document.body.style.overflow = '';
    }
}

export function renderCartDrawer() {
    const container = document.getElementById('drawer-cart-items');
    const totalElem = document.getElementById('drawer-cart-total');

    if (!container || !totalElem) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-shopping-bag text-6xl mb-4 text-gray-300"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        totalElem.textContent = formatPrice(0);
        return;
    }

    let subtotal = 0;
    const itemsHtml = cart.map(item => {
        subtotal += item.price * item.quantity;
        return `
            <div class="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                <img src="${item.imageUrl}" alt="${item.name}" class="w-20 h-24 object-cover rounded-md">
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <h4 class="font-semibold text-sm line-clamp-2">${item.name}</h4>
                        <p class="text-brown-900 font-medium text-sm mt-1">${formatPrice(item.price)}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center border rounded-md">
                             <input type="number" min="1" value="${item.quantity}" class="w-12 text-center text-sm py-1 focus:outline-none drawer-cart-quantity bg-transparent" data-id="${item.id}">
                        </div>
                        <button class="text-gray-400 hover:text-red-500 transition-colors drawer-remove-btn" data-id="${item.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = itemsHtml;
    totalElem.textContent = formatPrice(subtotal);
}
