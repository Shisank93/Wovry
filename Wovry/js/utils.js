export function formatPrice(price) {
    if (typeof price !== 'number') return '₹0.00';
    return `₹${price.toFixed(2)}`;
}

export function showMessage(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 translate-x-full opacity-0 px-6 py-4 rounded-lg shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'
        }`;
    toast.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'}"></i>
                <span>${message}</span>
            </div>
            <button class="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3000);
}

export function createProductCard(product) {
    return `
    <div class="product-card bg-white rounded-lg shadow-lg overflow-hidden group">
        <a href="product.html?id=${product.id}">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105">
        </a>
        <div class="p-6 flex flex-col justify-between h-[15rem]">
            <div>
               <h3 class="text-xl font-bold mb-2 truncate">${product.name}</h3>
               <p class="text-gray-600 mb-2 text-sm line-clamp-2">${product.description}</p>
            </div>
            <div>
               <p class="text-2xl font-semibold text-brown-900 mb-4">${formatPrice(product.price)}</p>
               <button class="btn-primary w-full py-3 rounded-md transition-all add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            </div>
        </div>
    </div>
    `;
}
