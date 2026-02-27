import { fetchProducts } from './shop.js';
import { createProductCard, formatPrice } from './utils.js';

export async function initializeShopPage() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    let allProducts = [];
    let currentFilteredProducts = [];
    let visibleProductCount = 0;
    const productsPerPage = 9;

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
    const loadMoreBtn = document.getElementById('load-more-btn');

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
        currentFilteredProducts = [...allProducts];

        // Filter by category
        if (filters.category !== 'all') {
            currentFilteredProducts = currentFilteredProducts.filter(p => p.category === filters.category);
        }

        // Filter by price
        currentFilteredProducts = currentFilteredProducts.filter(p => p.price <= filters.price);

        // Filter by size
        if (filters.sizes.length > 0) {
            currentFilteredProducts = currentFilteredProducts.filter(p => p.sizes && filters.sizes.every(size => p.sizes.includes(size)));
        }

        // Filter by color
        if (filters.colors.length > 0) {
            currentFilteredProducts = currentFilteredProducts.filter(p => p.colors && filters.colors.every(color => p.colors.includes(color)));
        }

        // Apply search term
        if (filters.searchTerm) {
            currentFilteredProducts = currentFilteredProducts.filter(p => {
                const keywords = p.keywords || [];
                return keywords.some(k => k.toLowerCase().includes(filters.searchTerm)) || p.name.toLowerCase().includes(filters.searchTerm);
            });
        }

        // Sort products
        if (filters.sortBy === 'price-asc') {
            currentFilteredProducts.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price-desc') {
            currentFilteredProducts.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
            // Basic fallback sort if seconds unavailable
            currentFilteredProducts.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
        }

        // Reset and render
        productGrid.innerHTML = '';
        visibleProductCount = 0;
        renderProducts();
    }

    function renderProducts() {
        const productsToRender = currentFilteredProducts.slice(visibleProductCount, visibleProductCount + productsPerPage);

        if (visibleProductCount === 0 && productsToRender.length === 0) {
            productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500">No products match your filters.</p>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const newHtml = productsToRender.map(createProductCard).join('');
        productGrid.innerHTML += newHtml;
        visibleProductCount += productsToRender.length;

        // Show or hide the load more button
        if (loadMoreBtn) {
            if (visibleProductCount < currentFilteredProducts.length) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }

    try {
        allProducts = await fetchProducts({ limitCount: 1000 }); // Fetch max for client side filtering for now
        populateFilters(allProducts);
        applyFilters();

        if (priceValue && priceRange) {
            priceValue.textContent = formatPrice(parseInt(priceRange.value));
        }

    } catch (error) {
        console.error("Error initializing shop:", error);
        productGrid.innerHTML = '<p class="col-span-full text-center text-red-500">Could not load products.</p>';
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
        if (categoryFilter) categoryFilter.value = 'all';
        if (priceRange) priceRange.value = 20000;
        if (priceValue) priceValue.textContent = formatPrice(20000);
        if (sortBy) sortBy.value = 'newest';
        if (searchInput) searchInput.value = '';
        [...sizeOptions.querySelectorAll('input:checked')].forEach(el => el.checked = false);
        [...colorOptions.querySelectorAll('input:checked')].forEach(el => el.checked = false);
        applyFilters();
    });

    loadMoreBtn?.addEventListener('click', () => {
        renderProducts();
    });
}
