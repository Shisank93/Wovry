import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatPrice, showMessage } from './utils.js';
import { addToCart } from './cart.js';
import { toggleWishlist, isInWishlist } from './wishlist.js';
import { recommendSize, getSizeRecommenderModalHTML } from './size-recommender.js';
import { estimateDelivery } from './coupon.js';

export async function initProductDetailPage(productId) {
    const section = document.getElementById('product-details-section');
    if (!section) return;

    // Show skeleton
    section.innerHTML = `
        <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 px-4">
            <div class="skeleton h-96 rounded-xl"></div>
            <div class="space-y-4">
                <div class="skeleton h-8 w-3/4 rounded"></div>
                <div class="skeleton h-6 w-1/3 rounded"></div>
                <div class="skeleton h-20 rounded"></div>
            </div>
        </div>
    `;

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            section.innerHTML = '<p class="text-center text-gray-600 py-20">Product not found.</p>';
            return;
        }

        const product = { id: docSnap.id, ...docSnap.data() };
        renderProductDetail(section, product);
    } catch (err) {
        console.error("Error fetching product:", err);
        section.innerHTML = '<p class="text-center text-red-500 py-20">Failed to load product details.</p>';
    }
}

async function renderProductDetail(container, product) {
    const images = product.images || [product.imageUrl];
    const sizes = product.sizes || ['S', 'M', 'L', 'XL'];
    const stock = product.stock ?? 10;
    const fabricDetails = product.fabric || 'Premium hand-spun wool blend – soft, breathable, and naturally warm.';
    const careInstructions = product.care || 'Hand wash in cold water. Lay flat to dry. Do not bleach. Iron on low heat.';

    const wishlisted = await isInWishlist(product.id);

    container.innerHTML = `
        <div class="max-w-6xl mx-auto px-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <!-- Image Gallery -->
                <div>
                    <div id="main-image-container" class="relative overflow-hidden rounded-xl shadow-lg bg-white cursor-zoom-in group" style="height:500px">
                        <img id="main-product-image" src="${images[0]}" alt="${product.name}"
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-150"
                             style="transform-origin:center center">
                        ${stock <= 5 && stock > 0 ? `<span class="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 text-sm rounded-full font-semibold animate-pulse">Only ${stock} left!</span>` : ''}
                        ${stock === 0 ? `<span class="absolute top-4 left-4 bg-gray-800 text-white px-3 py-1 text-sm rounded-full font-semibold">Out of Stock</span>` : ''}
                    </div>
                    ${images.length > 1 ? `
                    <div class="flex gap-3 mt-4 overflow-x-auto pb-2">
                        ${images.map((img, i) => `
                            <img src="${img}" alt="Thumbnail ${i + 1}" data-index="${i}"
                                 class="product-thumbnail w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${i === 0 ? 'border-amber-600 ring-2 ring-amber-300' : 'border-transparent hover:border-gray-300'}">
                        `).join('')}
                    </div>` : ''}
                </div>

                <!-- Product Info -->
                <div class="space-y-6">
                    <div>
                        <p class="text-sm text-gray-500 uppercase tracking-wider mb-1">${product.category || 'Woolen Wear'}</p>
                        <h1 class="text-4xl font-bold leading-tight" style="font-family:'Playfair Display',serif">${product.name}</h1>
                    </div>

                    <div class="flex items-center gap-4">
                        <span class="text-3xl font-bold text-amber-800">${formatPrice(product.price)}</span>
                        ${product.originalPrice ? `<span class="text-lg text-gray-400 line-through">${formatPrice(product.originalPrice)}</span>` : ''}
                        ${product.originalPrice ? `<span class="bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full font-semibold">${Math.round((1 - product.price / product.originalPrice) * 100)}% OFF</span>` : ''}
                    </div>

                    <p class="text-gray-600 leading-relaxed">${product.description || ''}</p>

                    <!-- Stock Indicator -->
                    <div class="flex items-center gap-2">
                        ${stock > 5 ? '<i class="fas fa-check-circle text-green-500"></i><span class="text-green-600 font-medium">In Stock</span>' : ''}
                        ${stock > 0 && stock <= 5 ? `<i class="fas fa-exclamation-circle text-orange-500"></i><span class="text-orange-600 font-medium">Only ${stock} left – order soon!</span>` : ''}
                        ${stock === 0 ? '<i class="fas fa-times-circle text-red-500"></i><span class="text-red-600 font-medium">Out of Stock</span>' : ''}
                    </div>

                    <!-- Size Selection -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-sm font-semibold text-gray-700">Select Size</label>
                            <div class="flex gap-3">
                                <button id="size-guide-btn" class="text-xs text-amber-700 hover:underline cursor-pointer">
                                    <i class="fas fa-ruler mr-1"></i>Size Guide
                                </button>
                                <button id="find-my-size-btn" class="text-xs text-amber-700 hover:underline cursor-pointer">
                                    <i class="fas fa-magic mr-1"></i>Find My Size
                                </button>
                            </div>
                        </div>
                        <div id="size-buttons" class="flex flex-wrap gap-2">
                            ${sizes.map((s, i) => `
                                <button class="size-btn px-5 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all
                                    ${i === 0 ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}"
                                    data-size="${s}">${s}</button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-4">
                        <button id="add-to-cart-detail-btn" class="flex-grow btn-primary py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 ${stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-bag"></i> ${stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button id="wishlist-btn" class="px-5 py-4 rounded-xl border-2 transition-all ${wishlisted ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400'}">
                            <i class="fas fa-heart text-xl"></i>
                        </button>
                    </div>

                    <!-- Delivery Estimate -->
                    <div class="bg-gray-50 rounded-xl p-4">
                        <label class="text-sm font-semibold text-gray-700 mb-2 block">
                            <i class="fas fa-truck mr-1"></i>Check Delivery
                        </label>
                        <div class="flex gap-2">
                            <input type="text" id="delivery-pincode" maxlength="6" placeholder="Enter pincode"
                                   class="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm">
                            <button id="check-delivery-btn" class="btn-primary px-5 py-3 rounded-lg text-sm font-semibold">Check</button>
                        </div>
                        <p id="delivery-result" class="text-sm text-gray-600 mt-2 hidden"></p>
                    </div>
                </div>
            </div>

            <!-- Tabs: Fabric / Care / Story -->
            <div class="mt-16 border-t pt-12">
                <div class="flex gap-6 border-b mb-8">
                    <button class="detail-tab active pb-3 text-sm font-semibold border-b-2 border-amber-600 text-amber-800" data-tab="fabric">Fabric Details</button>
                    <button class="detail-tab pb-3 text-sm font-semibold text-gray-500 hover:text-gray-700" data-tab="care">Care Instructions</button>
                    <button class="detail-tab pb-3 text-sm font-semibold text-gray-500 hover:text-gray-700" data-tab="story">Handmade Story</button>
                </div>

                <div id="tab-fabric" class="detail-tab-content">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-xl font-bold mb-3" style="font-family:'Playfair Display',serif">Materials & Composition</h3>
                            <p class="text-gray-600 leading-relaxed">${fabricDetails}</p>
                            <ul class="mt-4 space-y-2 text-gray-600">
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> 100% Natural Fibers</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Ethically Sourced Wool</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Hypoallergenic & Breathable</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Natural Dyes Used</li>
                            </ul>
                        </div>
                        <div class="bg-amber-50 p-6 rounded-xl">
                            <h4 class="font-semibold mb-2">Why Our Wool?</h4>
                            <p class="text-sm text-gray-600">Our yarns are sourced directly from high-altitude farms where sheep graze freely. The wool is hand-sorted, cleaned using natural methods, and spun into yarn using traditional charkas.</p>
                        </div>
                    </div>
                </div>

                <div id="tab-care" class="detail-tab-content hidden">
                    <div class="max-w-xl">
                        <h3 class="text-xl font-bold mb-4" style="font-family:'Playfair Display',serif">How to Care for Your Garment</h3>
                        <p class="text-gray-600 mb-6">${careInstructions}</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="text-center p-4 bg-gray-50 rounded-xl">
                                <i class="fas fa-hand-holding-water text-2xl text-blue-500 mb-2"></i>
                                <p class="text-xs font-medium">Hand Wash</p>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-xl">
                                <i class="fas fa-temperature-low text-2xl text-blue-500 mb-2"></i>
                                <p class="text-xs font-medium">Cold Water</p>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-xl">
                                <i class="fas fa-wind text-2xl text-blue-500 mb-2"></i>
                                <p class="text-xs font-medium">Lay Flat to Dry</p>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-xl">
                                <i class="fas fa-ban text-2xl text-red-400 mb-2"></i>
                                <p class="text-xs font-medium">No Bleach</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="tab-story" class="detail-tab-content hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                            <h3 class="text-xl font-bold mb-3" style="font-family:'Playfair Display',serif">The Story Behind This Piece</h3>
                            <p class="text-gray-600 leading-relaxed mb-4">Every Knit & Purl product is handcrafted by skilled artisans in the mountain villages of Himachal Pradesh. This piece took approximately 12-15 hours to create, from spinning the yarn to the final stitch.</p>
                            <p class="text-gray-600 leading-relaxed">Our artisans use techniques passed down through generations, blending tradition with contemporary design. When you purchase this garment, you're not just buying clothing — you're supporting a family and preserving a centuries-old craft.</p>
                        </div>
                        <div class="bg-amber-50 rounded-xl p-6">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-16 h-16 rounded-full bg-amber-200 flex items-center justify-center text-2xl">🧶</div>
                                <div>
                                    <p class="font-bold">Handcrafted with Love</p>
                                    <p class="text-sm text-gray-500">12-15 hours of work per piece</p>
                                </div>
                            </div>
                            <div class="space-y-3 text-sm text-gray-600">
                                <div class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-amber-600"></i> Made in Kullu Valley, Himachal Pradesh</div>
                                <div class="flex items-center gap-2"><i class="fas fa-users text-amber-600"></i> Supports local artisan communities</div>
                                <div class="flex items-center gap-2"><i class="fas fa-leaf text-amber-600"></i> Eco-friendly production methods</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Size Guide Modal -->
        <div id="size-guide-modal" class="fixed inset-0 z-50 hidden">
            <div class="absolute inset-0 bg-black bg-opacity-50" onclick="document.getElementById('size-guide-modal').classList.add('hidden')"></div>
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold" style="font-family:'Playfair Display',serif">Size Guide</h3>
                    <button onclick="document.getElementById('size-guide-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
                </div>
                <table class="w-full text-sm">
                    <thead><tr class="border-b bg-gray-50">
                        <th class="py-3 px-2 text-left">Size</th><th class="py-3 px-2">Chest (in)</th><th class="py-3 px-2">Length (in)</th><th class="py-3 px-2">Shoulder (in)</th>
                    </tr></thead>
                    <tbody>
                        <tr class="border-b"><td class="py-3 px-2 font-medium">XS</td><td class="py-3 px-2 text-center">34</td><td class="py-3 px-2 text-center">24</td><td class="py-3 px-2 text-center">14</td></tr>
                        <tr class="border-b"><td class="py-3 px-2 font-medium">S</td><td class="py-3 px-2 text-center">36</td><td class="py-3 px-2 text-center">25</td><td class="py-3 px-2 text-center">15</td></tr>
                        <tr class="border-b"><td class="py-3 px-2 font-medium">M</td><td class="py-3 px-2 text-center">38</td><td class="py-3 px-2 text-center">26</td><td class="py-3 px-2 text-center">16</td></tr>
                        <tr class="border-b"><td class="py-3 px-2 font-medium">L</td><td class="py-3 px-2 text-center">40</td><td class="py-3 px-2 text-center">27</td><td class="py-3 px-2 text-center">17</td></tr>
                        <tr><td class="py-3 px-2 font-medium">XL</td><td class="py-3 px-2 text-center">42</td><td class="py-3 px-2 text-center">28</td><td class="py-3 px-2 text-center">18</td></tr>
                    </tbody>
                </table>
                <p class="text-xs text-gray-500 mt-4">* All measurements are approximate. Handmade items may vary slightly.</p>
            </div>
        </div>

        <!-- Size Recommender Modal (injected) -->
        ${getSizeRecommenderModalHTML()}
    `;

    // --- Event Listeners ---
    let selectedSize = sizes[0];

    // Thumbnail clicks
    container.querySelectorAll('.product-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
            document.getElementById('main-product-image').src = thumb.src;
            container.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('border-amber-600', 'ring-2', 'ring-amber-300'));
            thumb.classList.add('border-amber-600', 'ring-2', 'ring-amber-300');
        });
    });

    // Image zoom on mouse move
    const imgContainer = document.getElementById('main-image-container');
    const mainImg = document.getElementById('main-product-image');
    if (imgContainer && mainImg) {
        imgContainer.addEventListener('mousemove', (e) => {
            const rect = imgContainer.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            mainImg.style.transformOrigin = `${x}% ${y}%`;
        });
    }

    // Size selection
    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.size-btn').forEach(b => {
                b.classList.remove('border-amber-600', 'bg-amber-50', 'text-amber-800');
                b.classList.add('border-gray-200', 'text-gray-600');
            });
            btn.classList.add('border-amber-600', 'bg-amber-50', 'text-amber-800');
            btn.classList.remove('border-gray-200', 'text-gray-600');
            selectedSize = btn.dataset.size;
        });
    });

    // Size guide modal
    document.getElementById('size-guide-btn')?.addEventListener('click', () => {
        document.getElementById('size-guide-modal').classList.remove('hidden');
    });

    // Find my size modal
    document.getElementById('find-my-size-btn')?.addEventListener('click', () => {
        document.getElementById('size-recommender-modal').classList.remove('hidden');
    });

    // Size recommender form
    document.getElementById('size-recommender-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const height = parseFloat(document.getElementById('sr-height').value);
        const weight = parseFloat(document.getElementById('sr-weight').value);
        const bodyType = document.querySelector('input[name="sr-bodytype"]:checked')?.value || 'regular';
        const result = recommendSize({ height, weight, bodyType });
        document.getElementById('size-result-value').textContent = result.size;
        document.getElementById('size-result-confidence').textContent = `Confidence: ${result.confidence}`;
        document.getElementById('size-result').classList.remove('hidden');

        // Auto-select the recommended size
        const sizeBtn = container.querySelector(`.size-btn[data-size="${result.size}"]`);
        if (sizeBtn) sizeBtn.click();
    });

    // Add to cart
    document.getElementById('add-to-cart-detail-btn')?.addEventListener('click', () => {
        addToCart({ ...product, selectedSize }, 1);
    });

    // Wishlist
    document.getElementById('wishlist-btn')?.addEventListener('click', async () => {
        const isNowWishlisted = await toggleWishlist(product.id);
        const btn = document.getElementById('wishlist-btn');
        if (isNowWishlisted) {
            btn.classList.add('border-red-300', 'bg-red-50', 'text-red-500');
            btn.classList.remove('border-gray-200', 'text-gray-400');
        } else {
            btn.classList.remove('border-red-300', 'bg-red-50', 'text-red-500');
            btn.classList.add('border-gray-200', 'text-gray-400');
        }
    });

    // Delivery estimate
    document.getElementById('check-delivery-btn')?.addEventListener('click', () => {
        const pincode = document.getElementById('delivery-pincode').value;
        const result = estimateDelivery(pincode);
        const resultElem = document.getElementById('delivery-result');
        resultElem.textContent = result.message;
        resultElem.classList.remove('hidden');
        resultElem.classList.add(result.days ? 'text-green-600' : 'text-red-500');
    });

    // Detail tabs
    container.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.detail-tab').forEach(t => {
                t.classList.remove('active', 'border-amber-600', 'text-amber-800');
                t.classList.add('text-gray-500', 'border-transparent');
            });
            tab.classList.add('active', 'border-amber-600', 'text-amber-800');
            tab.classList.remove('text-gray-500', 'border-transparent');
            container.querySelectorAll('.detail-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${tab.dataset.tab}`)?.classList.remove('hidden');
        });
    });
}
