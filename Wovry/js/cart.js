import { showMessage, formatPrice } from './utils.js';

export function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

export function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

export function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElem = document.getElementById('cart-count');
    if (cartCountElem) {
        cartCountElem.textContent = count;
    }
}

export function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }
    saveCart(cart);
    showMessage(`${product.name} added to cart!`, 'success');
}

export function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
}

export function updateQuantity(productId, newQuantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity = parseInt(newQuantity);
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart(cart);
        }
    }
}

export function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotalElem = document.getElementById('subtotal-price');
    const cartTotalElem = document.getElementById('total-price');

    if (!cartItemsContainer) return;
    const cart = getCart();
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="p-8 text-center text-gray-600">Your cart is empty.</p>`;
        if (cartSubtotalElem) cartSubtotalElem.textContent = formatPrice(0);
        if (cartTotalElem) cartTotalElem.textContent = formatPrice(0);
        return;
    }

    let subtotal = 0;
    const itemsHtml = cart.map(item => {
        subtotal += item.price * item.quantity;
        return `
            <div class="flex items-center gap-4 p-4 border-b border-gray-200 last:border-b-0">
                <img src="${item.imageUrl}" alt="${item.name}" class="w-24 h-24 object-cover rounded-lg">
                <div class="flex-grow">
                    <h3 class="font-semibold">${item.name}</h3>
                    <p class="text-gray-600">${formatPrice(item.price)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <input type="number" min="1" value="${item.quantity}" class="w-16 p-2 border border-gray-300 rounded-lg text-center cart-quantity" data-id="${item.id}">
                </div>
                <div class="flex-shrink-0">
                    <button class="text-red-500 hover:text-red-700 remove-from-cart-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartItemsContainer.innerHTML = itemsHtml;
    if (cartSubtotalElem) cartSubtotalElem.textContent = formatPrice(subtotal);
    if (cartTotalElem) cartTotalElem.textContent = formatPrice(subtotal);
}
