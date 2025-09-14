// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, where, limit, startAfter, addDoc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCo0ODEyojQn8X5YQzM8fFcxcfuSSvT68A",
    authDomain: "wovry-1873f.firebaseapp.com",
    projectId: "wovry-1873f",
    storageBucket: "wovry-1873f.firebasestorage.app",
    messagingSenderId: "777775474897",
    appId: "1:777775474897:web:318ca67905d29202753df0",
    measurementId: "G-3NF7DYCHL4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// --- Global Variables ---
let lastVisible = null;
const productsPerPage = 9;
const ADMIN_UID = "QHnSW6f3BjZqJ13Hkw35fgg5AcJ2";

// --- DOM Elements ---
const productGrid = document.getElementById('product-grid');
const featuredProductsGrid = document.getElementById('featured-products-grid');
const cartCountElem = document.getElementById('cart-count');
const newsletterForm = document.getElementById('newsletter-form');
const productDetailsSection = document.getElementById('product-details-section');
const cartItemsContainer = document.getElementById('cart-items');
const cartSubtotalElem = document.getElementById('subtotal-price');
const cartTotalElem = document.getElementById('total-price');
const checkoutForm = document.getElementById('checkout-form');
const orderSummaryItems = document.getElementById('order-summary-items');
const summarySubtotalElem = document.getElementById('summary-subtotal');
const summaryTotalElem = document.getElementById('summary-total');
const profileDetails = document.getElementById('profile-details');
const orderHistory = document.getElementById('order-history');
const adminContent = document.getElementById('admin-content');
const adminAuthMessage = document.getElementById('admin-not-authorized');
const productForm = document.getElementById('product-form');
const productListContainer = document.getElementById('product-list');
const orderListContainer = document.getElementById('order-list');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authToggleBtn = document.getElementById('auth-toggle');
const authTitle = document.getElementById('auth-title');
const authMessage = document.getElementById('auth-message');
const googleAuthBtn = document.getElementById('google-auth-btn');

// --- Helper Functions ---
function formatPrice(price) {
    return `₹${price.toFixed(2)}`;
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    if (cartCountElem) {
        cartCountElem.textContent = count;
    }
}

function showMessage(message, type = 'success') {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `mt-4 p-3 text-sm text-center rounded-lg ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
    authMessage.classList.remove('hidden');
    setTimeout(() => authMessage.classList.add('hidden'), 5000);
}

function createProductCard(product) {
    return `
    <div class="product-card bg-white rounded-lg shadow-lg overflow-hidden group">
        <a href="product.html?id=${product.id}">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105">
        </a>
        <div class="p-6">
            <h3 class="text-xl font-bold mb-2">${product.name}</h3>
            <p class="text-gray-600 mb-2">${product.description}</p>
            <p class="text-2xl font-semibold text-brown-900 mb-4">${formatPrice(product.price)}</p>
            <button class="btn-primary w-full py-3 rounded-md transition-all add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        </div>
    </div>
    `;
}

// --- Firebase Data Fetching ---

// Fetch products for the shop page with pagination
async function fetchProducts(options = {}) {
    const { category, priceRange, sortBy, limitCount = productsPerPage, startAfterDoc = null } = options;

    try {
        let q = collection(db, "products");
        if (category && category !== 'all') {
            q = query(q, where("category", "==", category));
        }
        if (priceRange) {
            q = query(q, where("price", "<=", priceRange));
        }
        if (sortBy === 'newest') {
            q = query(q, orderBy("createdAt", "desc"));
        } else if (sortBy === 'price-asc') {
            q = query(q, orderBy("price", "asc"));
        } else if (sortBy === 'price-desc') {
            q = query(q, orderBy("price", "desc"));
        }
        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }
        q = query(q, limit(limitCount));
        
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        return products;
    } catch (e) {
        console.error("Error fetching documents: ", e);
        return [];
    }
}

// Fetch featured products for the homepage
async function fetchFeaturedProducts() {
    if (!featuredProductsGrid) return;
    try {
        const q = query(collection(db, "products"), where("isFeatured", "==", true), limit(4));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        featuredProductsGrid.innerHTML = products.map(createProductCard).join('');
    } catch (e) {
        console.error("Error fetching featured products: ", e);
    }
}

// Fetch a single product for the product details page
async function fetchProduct(productId) {
    if (!productDetailsSection) return;
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const product = { id: docSnap.id, ...docSnap.data() };
            renderProductDetails(product);
        } else {
            productDetailsSection.innerHTML = "<p>Product not found.</p>";
        }
    } catch (e) {
        console.error("Error fetching product: ", e);
        productDetailsSection.innerHTML = "<p>Error loading product details.</p>";
    }
}

// Fetch related products for product page
async function fetchRelatedProducts(category, currentProductId) {
    if (!document.getElementById('related-products-grid')) return;
    try {
        const q = query(collection(db, "products"), where("category", "==", category), where("id", "!=", currentProductId), limit(4));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        document.getElementById('related-products-grid').innerHTML = products.map(createProductCard).join('');
    } catch (e) {
        console.error("Error fetching related products: ", e);
    }
}

// Fetch order history for profile page
async function fetchOrderHistory(userId) {
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

// Fetch all products for the admin dashboard
async function fetchAllProducts() {
    if (!productListContainer) return;
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let productsHtml = '';
        querySnapshot.forEach(doc => {
            const product = doc.data();
            productsHtml += `
                <div class="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                    <div class="flex-grow">
                        <h4 class="font-semibold">${product.name}</h4>
                        <p class="text-sm text-gray-600">${formatPrice(product.price)} | Category: ${product.category}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="py-2 px-4 rounded-md text-sm bg-yellow-500 text-white edit-btn" data-id="${doc.id}">Edit</button>
                        <button class="py-2 px-4 rounded-md text-sm bg-red-500 text-white delete-btn" data-id="${doc.id}">Delete</button>
                    </div>
                </div>
            `;
        });
        productListContainer.innerHTML = productsHtml;
    } catch (e) {
        console.error("Error fetching all products: ", e);
    }
}

// Fetch all orders for the admin dashboard
async function fetchAllOrders() {
    if (!orderListContainer) return;
    try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        if (querySnapshot.empty) {
            orderListContainer.innerHTML = "<p>No orders to display.</p>";
            return;
        }
        let ordersHtml = '';
        querySnapshot.forEach(doc => {
            const order = doc.data();
            const itemsHtml = order.items.map(item => `<li class="text-sm text-gray-600">${item.name} x ${item.quantity}</li>`).join('');
            ordersHtml += `
                <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
                    <p class="font-semibold text-gray-800">Order ID: ${doc.id}</p>
                    <p class="text-gray-600 text-sm">Customer: ${order.customerInfo.name} (${order.customerInfo.email})</p>
                    <p class="text-gray-600 text-sm">Total: ${formatPrice(order.total)}</p>
                    <ul class="list-disc ml-5 mt-2">
                        ${itemsHtml}
                    </ul>
                </div>
            `;
        });
        orderListContainer.innerHTML = ordersHtml;
    } catch (e) {
        console.error("Error fetching all orders: ", e);
    }
}

// --- Cart Management Functions ---
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(product, quantity = 1) {
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

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
}

function updateQuantity(productId, newQuantity) {
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

function renderCart() {
    if (!cartItemsContainer) return;
    const cart = getCart();
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="p-8 text-center text-gray-600">Your cart is empty.</p>`;
        cartSubtotalElem.textContent = formatPrice(0);
        cartTotalElem.textContent = formatPrice(0);
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
    cartSubtotalElem.textContent = formatPrice(subtotal);
    cartTotalElem.textContent = formatPrice(subtotal);
}

function renderOrderSummary() {
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
    summarySubtotalElem.textContent = formatPrice(subtotal);
    summaryTotalElem.textContent = formatPrice(subtotal);
}

// --- Dark Mode Toggle ---
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

// --- Global Event Listeners ---
document.addEventListener('click', async (e) => {
    if (e.target.id === 'dark-mode-toggle' || e.target.parentElement.id === 'dark-mode-toggle') {
        const isDarkMode = body.classList.toggle('dark');
        localStorage.setItem('darkMode', isDarkMode);
        applyDarkMode(isDarkMode);
    }

    if (e.target.classList.contains('add-to-cart-btn')) {
        const productId = e.target.dataset.productId;
        if (!productId) return;

        try {
            const docRef = doc(db, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const product = { id: docSnap.id, ...docSnap.data() };
                addToCart(product);
            } else {
                console.error("Attempted to add a product that does not exist:", productId);
                showMessage('Error: Could not find product.', 'error');
            }
        } catch (err) {
            console.error("Error fetching product to add to cart:", err);
            showMessage('There was an issue adding the item to your cart.', 'error');
        }
    }
});


// --- Page-Specific Logic & Event Listeners ---

// Homepage Logic
if (featuredProductsGrid) {
    fetchFeaturedProducts();
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

// Shop Page Logic
if (productGrid) {
    let allProducts = [];
    let filters = {
        category: 'all',
        price: 20000,
        sizes: [],
        colors: [],
        sortBy: 'newest',
        searchTerm: ''
    };

    const priceValue = document.getElementById('price-value');
    const priceRange = document.getElementById('price-range');
    const categoryFilter = document.getElementById('category-filter');
    const sortBy = document.getElementById('sort-by');
    const sizeOptions = document.getElementById('size-options');
    const colorOptions = document.getElementById('color-options');
    const searchInput = document.getElementById('product-search');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    function populateFilters(products) {
        const sizes = [...new Set(products.flatMap(p => p.sizes || []))];
        const colors = [...new Set(products.flatMap(p => p.colors || []))];

        sizeOptions.innerHTML = sizes.map(size => `
            <label class="flex items-center">
                <input type="checkbox" class="form-checkbox" value="${size}">
                <span class="ml-2 text-sm">${size}</span>
            </label>
        `).join('');

        colorOptions.innerHTML = colors.map(color => `
            <label class="flex items-center">
                <input type="checkbox" class="form-checkbox" value="${color}">
                <span class="ml-2 text-sm">${color}</span>
            </label>
        `).join('');
    }

    function applyFilters() {
        let filteredProducts = [...allProducts];

        // Filter by category
        if (filters.category !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === filters.category);
        }

        // Filter by price
        filteredProducts = filteredProducts.filter(p => p.price <= filters.price);

        // Filter by size
        if (filters.sizes.length > 0) {
            filteredProducts = filteredProducts.filter(p => p.sizes && filters.sizes.every(size => p.sizes.includes(size)));
        }

        // Filter by color
        if (filters.colors.length > 0) {
            filteredProducts = filteredProducts.filter(p => p.colors && filters.colors.every(color => p.colors.includes(color)));
        }

        // Apply search term
        if (filters.searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(filters.searchTerm));
        }

        // Sort products
        if (filters.sortBy === 'price-asc') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price-desc') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
            filteredProducts.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        }

        renderProducts(filteredProducts);
    }

    function renderProducts(products) {
        if (products.length === 0) {
            productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500">No products match your filters.</p>';
            return;
        }
        productGrid.innerHTML = products.map(createProductCard).join('');
    }

    async function initializeShop() {
        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            populateFilters(allProducts);
            applyFilters();

            // Set initial price display
            if(priceValue && priceRange) {
                priceValue.textContent = formatPrice(parseInt(priceRange.value));
            }

        } catch (error) {
            console.error("Error initializing shop:", error);
            productGrid.innerHTML = '<p class="col-span-full text-center text-red-500">Could not load products.</p>';
        }
    }

    // Event Listeners
    categoryFilter?.addEventListener('change', (e) => {
        filters.category = e.target.value;
        applyFilters();
    });

    priceRange?.addEventListener('input', (e) => {
        const price = parseInt(e.target.value);
        filters.price = price;
        if (priceValue) {
            priceValue.textContent = formatPrice(price);
        }
        applyFilters();
    });

    sortBy?.addEventListener('change', (e) => {
        filters.sortBy = e.target.value;
        applyFilters();
    });

    sizeOptions?.addEventListener('change', (e) => {
        filters.sizes = [...sizeOptions.querySelectorAll('input:checked')].map(el => el.value);
        applyFilters();
    });

    colorOptions?.addEventListener('change', (e) => {
        filters.colors = [...colorOptions.querySelectorAll('input:checked')].map(el => el.value);
        applyFilters();
    });

    searchInput?.addEventListener('input', (e) => {
        filters.searchTerm = e.target.value.toLowerCase();
        applyFilters();
    });

    clearFiltersBtn?.addEventListener('click', () => {
        filters = { category: 'all', price: 20000, sizes: [], colors: [], sortBy: 'newest', searchTerm: '' };
        categoryFilter.value = 'all';
        priceRange.value = 20000;
        priceValue.textContent = formatPrice(20000);
        sortBy.value = 'newest';
        searchInput.value = '';
        [...sizeOptions.querySelectorAll('input:checked')].forEach(el => el.checked = false);
        [...colorOptions.querySelectorAll('input:checked')].forEach(el => el.checked = false);
        applyFilters();
    });

    initializeShop();

    // Note: Load more button is removed for simplicity with client-side filtering.
    // A more advanced implementation would require server-side pagination with filters.
}

// Product Page Logic
if (productDetailsSection) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (productId) {
        fetchProduct(productId);
    }
}

function renderProductDetails(product) {
    if (!productDetailsSection) return;
    productDetailsSection.innerHTML = `
        <div>
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full rounded-lg shadow-lg">
        </div>
        <div>
            <h1 class="text-5xl font-bold mb-4">${product.name}</h1>
            <p class="text-3xl font-semibold text-brown-900 mb-6">${formatPrice(product.price)}</p>
            <p class="text-lg leading-relaxed mb-6">${product.description}</p>
            <div class="flex items-center mb-6 gap-4">
                <div class="relative">
                    <select class="w-32 p-3 border border-gray-300 rounded-lg focus:outline-none">
                        <option>Size</option>
                        <option>XS</option>
                        <option>S</option>
                        <option>M</option>
                        <option>L</option>
                        <option>XL</option>
                    </select>
                </div>
                <div class="relative">
                    <select class="w-32 p-3 border border-gray-300 rounded-lg focus:outline-none">
                        <option>Color</option>
                        <option>Cream</option>
                        <option>Beige</option>
                        <option>Brown</option>
                    </select>
                </div>
            </div>
            <button class="btn-primary w-full py-4 rounded-lg text-lg font-bold add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
        </div>
    `;
    fetchRelatedProducts(product.category, product.id);
}

// Cart Page Logic
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

// Checkout Page Logic
if (checkoutForm) {
    renderOrderSummary();
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const cart = getCart();

        if (cart.length === 0) {
            showMessage('Your cart is empty!', 'error');
            return;
        }

        const customerInfo = {
            name: document.getElementById('checkout-name').value,
            email: document.getElementById('checkout-email').value,
            phone: document.getElementById('checkout-phone').value,
            address: document.getElementById('checkout-address').value,
            city: document.getElementById('checkout-city').value,
            state: document.getElementById('checkout-state').value,
            zip: document.getElementById('checkout-zip').value,
        };

        const order = {
            userId: user ? user.uid : null,
            customerInfo,
            items: cart,
            total: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
            status: "pending",
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "orders"), order);
            localStorage.removeItem('cart');
            showMessage('Order placed successfully!', 'success');
            window.location.href = 'index.html'; // Redirect to homepage
        } catch (e) {
            console.error("Error placing order: ", e);
            showMessage('Failed to place order. Please try again.', 'error');
        }
    });
}

// User Profile Logic
if (profileDetails) {
    onAuthStateChanged(auth, async (user) => {
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
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessage('You have been logged out.', 'success');
            window.location.href = 'index.html';
        } catch (e) {
            console.error("Error logging out: ", e);
        }
    });
}

// Admin Dashboard Logic
if (adminContent) {
    onAuthStateChanged(auth, async (user) => {
        if (user && user.uid === ADMIN_UID) {
            adminContent.classList.remove('hidden');
            adminAuthMessage.classList.add('hidden');
            fetchAllProducts();
            fetchAllOrders();
        } else {
            adminContent.classList.add('hidden');
            adminAuthMessage.classList.remove('hidden');
        }
    });

    // Handle product form submission (Add/Update)
    productForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id-field').value;

        // Helper to process comma-separated strings into arrays
        const processStringToArray = (str) => str.split(',').map(item => item.trim()).filter(item => item);

        const product = {
            name: document.getElementById('product-name').value,
            imageUrl: document.getElementById('product-imageUrl').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            sizes: processStringToArray(document.getElementById('product-sizes').value),
            colors: processStringToArray(document.getElementById('product-colors').value),
            isFeatured: document.getElementById('product-isFeatured').checked,
        };

        try {
            if (id) {
                await setDoc(doc(db, "products", id), product);
                showMessage('Product updated successfully!', 'success');
            } else {
                await addDoc(collection(db, "products"), { ...product, createdAt: new Date() });
                showMessage('Product added successfully!', 'success');
            }
            productForm.reset();
            document.getElementById('product-id-field').value = '';
            fetchAllProducts();
        } catch (e) {
            console.error("Error saving product: ", e);
            showMessage('Failed to save product.', 'error');
        }
    });

    // Handle product delete and edit buttons (event delegation)
    productListContainer?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const productId = e.target.dataset.id;
            try {
                await deleteDoc(doc(db, "products", productId));
                showMessage('Product deleted successfully!', 'success');
                fetchAllProducts();
            } catch (e) {
                console.error("Error deleting product: ", e);
                showMessage('Failed to delete product.', 'error');
            }
        }
        if (e.target.classList.contains('edit-btn')) {
            const productId = e.target.dataset.id;
            try {
                const docSnap = await getDoc(doc(db, "products", productId));
                if (docSnap.exists()) {
                    const product = docSnap.data();
                    document.getElementById('product-id-field').value = docSnap.id;
                    document.getElementById('product-name').value = product.name;
                    document.getElementById('product-imageUrl').value = product.imageUrl;
                    document.getElementById('product-description').value = product.description;
                    document.getElementById('product-price').value = product.price;
                    document.getElementById('product-category').value = product.category;
                    document.getElementById('product-sizes').value = (product.sizes || []).join(', ');
                    document.getElementById('product-colors').value = (product.colors || []).join(', ');
                    document.getElementById('product-isFeatured').checked = product.isFeatured;
                }
            } catch (e) {
                console.error("Error fetching product for edit: ", e);
            }
        }
    });
}

// --- Authentication Page Logic (new) ---
if (loginForm) {
    // Toggle between login and signup forms
    authToggleBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm.classList.contains('hidden')) {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            authTitle.textContent = "Log In";
            authToggleBtn.textContent = "Switch to Sign Up";
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            authTitle.textContent = "Sign Up";
            authToggleBtn.textContent = "Switch to Log In";
        }
    });

    // Handle Email/Password Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('Logged in successfully!', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Login failed: ", error);
            showMessage('Invalid email or password. Please try again.', 'error');
        }
    });

    // Handle Email/Password Sign Up
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Account created successfully! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Signup failed: ", error);
            showMessage('Failed to create account. Please try again.', 'error');
        }
    });

    // Handle Google Auth
    googleAuthBtn?.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            showMessage('Logged in with Google! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } catch (error) {
            console.error("Google login failed. Full error object:", error);
            if (error.code) {
                console.error("Firebase Auth Error Code:", error.code);
                console.error("Firebase Auth Error Message:", error.message);
            }
            showMessage('Google login failed. Check console for details.', 'error');
        }
    });
}
