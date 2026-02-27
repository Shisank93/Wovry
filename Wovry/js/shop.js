import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, query, where, limit, startAfter, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createProductCard, formatPrice } from './utils.js';
import { addToCart } from './cart.js';

let lastVisible = null;
const productsPerPage = 9;

export async function fetchProducts(options = {}) {
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

export async function fetchFeaturedProducts() {
    const featuredProductsGrid = document.getElementById('featured-products-grid');
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

export async function fetchProduct(productId) {
    const productDetailsSection = document.getElementById('product-details-section');
    if (!productDetailsSection) return;
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const product = { id: docSnap.id, ...docSnap.data() };
            renderProductDetails(product, productDetailsSection);
        } else {
            productDetailsSection.innerHTML = "<p>Product not found.</p>";
        }
    } catch (e) {
        console.error("Error fetching product: ", e);
        productDetailsSection.innerHTML = "<p>Error loading product details.</p>";
    }
}

export async function fetchRelatedProducts(category, currentProductId) {
    const grid = document.getElementById('related-products-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), where("category", "==", category), where("id", "!=", currentProductId), limit(4));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        grid.innerHTML = products.map(createProductCard).join('');
    } catch (e) {
        console.error("Error fetching related products: ", e);
    }
}

function renderProductDetails(product, container) {
    container.innerHTML = `
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
