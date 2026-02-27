import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatPrice, showMessage } from './utils.js';

export async function initializeAdmin() {
    // Tab switching
    setupTabs();
    // Load dashboard data
    await loadDashboard();
    // Load products
    await loadProducts();
    // Load orders
    await loadOrders();
    // Setup product form
    setupProductForm();
}

// ---- TAB SWITCHING ----
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const tabId = tab.id.replace('tab-', 'tab-content-');
            document.getElementById(tabId)?.classList.remove('hidden');
        });
    });
}

// ---- DASHBOARD / ANALYTICS ----
async function loadDashboard() {
    try {
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Total Revenue
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const revenueElem = document.getElementById('stats-total-revenue');
        if (revenueElem) revenueElem.textContent = formatPrice(totalRevenue);

        // Total Orders
        const ordersElem = document.getElementById('stats-total-orders');
        if (ordersElem) ordersElem.textContent = orders.length;

        // Total Customers (unique userIds)
        const uniqueCustomers = new Set(orders.map(o => o.userId).filter(Boolean));
        const customersElem = document.getElementById('stats-total-customers');
        if (customersElem) customersElem.textContent = uniqueCustomers.size;

        // Repeat Customers (customers with > 1 order)
        const customerOrderCount = {};
        orders.forEach(o => { if (o.userId) customerOrderCount[o.userId] = (customerOrderCount[o.userId] || 0) + 1; });
        const repeatCustomers = Object.values(customerOrderCount).filter(c => c > 1).length;
        const repeatElem = document.getElementById('stats-repeat-customers');
        if (repeatElem) repeatElem.textContent = repeatCustomers;

        // Best Selling Products
        const productSales = {};
        orders.forEach(o => {
            (o.items || []).forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 1);
            });
        });
        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const topProductsElem = document.getElementById('stats-top-products');
        if (topProductsElem) {
            topProductsElem.innerHTML = topProducts.length > 0
                ? topProducts.map(([name, qty], i) => `
                    <div class="flex items-center justify-between py-2 ${i < topProducts.length - 1 ? 'border-b' : ''}">
                        <div class="flex items-center gap-3">
                            <span class="text-lg font-bold text-gray-400">#${i + 1}</span>
                            <span class="font-medium">${name}</span>
                        </div>
                        <span class="text-sm text-gray-600">${qty} sold</span>
                    </div>
                `).join('')
                : '<p class="text-gray-500">No sales data yet.</p>';
        }

        // Monthly Sales Trend
        const monthlySales = {};
        orders.forEach(o => {
            const date = o.createdAt?.toDate?.() || new Date(o.createdAt?.seconds * 1000);
            if (date) {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlySales[key] = (monthlySales[key] || 0) + (o.total || 0);
            }
        });

        const trendElem = document.getElementById('stats-monthly-trend');
        if (trendElem) {
            const sorted = Object.entries(monthlySales).sort();
            const maxVal = Math.max(...sorted.map(([_, v]) => v), 1);
            trendElem.innerHTML = sorted.length > 0
                ? sorted.map(([month, val]) => `
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-xs w-16 text-gray-500">${month}</span>
                        <div class="flex-grow bg-gray-200 rounded-full h-4 relative">
                            <div class="bg-amber-600 h-4 rounded-full transition-all" style="width:${(val / maxVal) * 100}%"></div>
                        </div>
                        <span class="text-xs w-20 text-right font-medium">${formatPrice(val)}</span>
                    </div>
                `).join('')
                : '<p class="text-gray-500">No sales data yet.</p>';
        }

        // Low Stock Alerts
        await loadLowStockAlerts();

    } catch (e) {
        console.error("Error loading dashboard:", e);
    }
}

async function loadLowStockAlerts() {
    try {
        const productsSnap = await getDocs(collection(db, "products"));
        const lowStock = productsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => (p.stock ?? 10) < 5);

        const alertsElem = document.getElementById('stats-low-stock');
        if (alertsElem) {
            alertsElem.innerHTML = lowStock.length > 0
                ? lowStock.map(p => `
                    <div class="flex items-center justify-between py-2 border-b last:border-0">
                        <span class="font-medium">${p.name}</span>
                        <span class="text-red-600 font-bold text-sm">${p.stock ?? 0} left</span>
                    </div>
                `).join('')
                : '<p class="text-green-600">All products are well-stocked! ✓</p>';
        }
    } catch (e) {
        console.error("Error loading low stock:", e);
    }
}

// ---- PRODUCTS ----
async function loadProducts() {
    const listElem = document.getElementById('product-list');
    if (!listElem) return;

    try {
        const snap = await getDocs(collection(db, "products"));
        const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        listElem.innerHTML = products.length > 0
            ? products.map(p => `
                <div class="flex items-center gap-4 p-4 border rounded-lg">
                    <img src="${p.imageUrl}" alt="${p.name}" class="w-16 h-16 object-cover rounded">
                    <div class="flex-grow">
                        <p class="font-semibold">${p.name}</p>
                        <p class="text-sm text-gray-500">${formatPrice(p.price)} · Stock: ${p.stock ?? 'N/A'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="edit-product-btn text-blue-600 hover:text-blue-800 text-sm" data-id="${p.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-product-btn text-red-600 hover:text-red-800 text-sm" data-id="${p.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')
            : '<p class="text-gray-500">No products found.</p>';

        // Edit buttons
        listElem.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', () => editProduct(btn.dataset.id, products));
        });

        // Delete buttons
        listElem.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this product?')) {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    showMessage('Product deleted.', 'success');
                    loadProducts();
                }
            });
        });
    } catch (e) {
        console.error("Error loading products:", e);
        listElem.innerHTML = '<p class="text-red-500">Failed to load products.</p>';
    }
}

function editProduct(productId, products) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-id-field').value = product.id;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-imageUrl').value = product.imageUrl || '';
    document.getElementById('product-price').value = product.price || '';
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-sizes').value = (product.sizes || []).join(', ');
    document.getElementById('product-colors').value = (product.colors || []).join(', ');
    document.getElementById('product-isFeatured').checked = product.isFeatured || false;

    // New fields
    const stockField = document.getElementById('product-stock');
    if (stockField) stockField.value = product.stock ?? '';
    const img2 = document.getElementById('product-image2');
    if (img2) img2.value = (product.images && product.images[1]) || '';
    const img3 = document.getElementById('product-image3');
    if (img3) img3.value = (product.images && product.images[2]) || '';
    const img4 = document.getElementById('product-image4');
    if (img4) img4.value = (product.images && product.images[3]) || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('product-id-field').value;
        const mainImage = document.getElementById('product-imageUrl').value;
        const images = [mainImage];
        ['product-image2', 'product-image3', 'product-image4'].forEach(fid => {
            const val = document.getElementById(fid)?.value?.trim();
            if (val) images.push(val);
        });

        const productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            imageUrl: mainImage,
            images,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            sizes: document.getElementById('product-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
            colors: document.getElementById('product-colors').value.split(',').map(s => s.trim()).filter(Boolean),
            isFeatured: document.getElementById('product-isFeatured').checked,
            stock: parseInt(document.getElementById('product-stock')?.value) || 0,
            updatedAt: new Date(),
        };

        try {
            if (id) {
                await updateDoc(doc(db, "products", id), productData);
                showMessage('Product updated!', 'success');
            } else {
                productData.createdAt = new Date();
                await addDoc(collection(db, "products"), productData);
                showMessage('Product added!', 'success');
            }
            form.reset();
            document.getElementById('product-id-field').value = '';
            loadProducts();
            loadDashboard();
        } catch (e) {
            console.error("Error saving product:", e);
            showMessage('Failed to save product.', 'error');
        }
    });
}

// ---- ORDERS ----
let allOrders = []; // cache for filtering

async function loadOrders() {
    const listElem = document.getElementById('order-list');
    if (!listElem) return;

    try {
        const snap = await getDocs(collection(db, "orders"));
        allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort by newest first
        allOrders.sort((a, b) => {
            const da = a.createdAt?.toDate?.() || new Date(0);
            const db2 = b.createdAt?.toDate?.() || new Date(0);
            return db2 - da;
        });

        renderFilteredOrders();
        setupOrderControls();
    } catch (e) {
        console.error("Error loading orders:", e);
        listElem.innerHTML = '<p class="text-red-500">Failed to load orders.</p>';
    }
}

function setupOrderControls() {
    const searchInput = document.getElementById('order-search');
    const statusFilter = document.getElementById('order-status-filter');
    const exportBtn = document.getElementById('export-orders-btn');

    searchInput?.addEventListener('input', () => renderFilteredOrders());
    statusFilter?.addEventListener('change', () => renderFilteredOrders());
    exportBtn?.addEventListener('click', () => exportOrdersCSV());
}

function renderFilteredOrders() {
    const listElem = document.getElementById('order-list');
    if (!listElem) return;

    const searchTerm = (document.getElementById('order-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('order-status-filter')?.value || '';

    let filtered = allOrders;

    if (searchTerm) {
        filtered = filtered.filter(o => {
            const oid = (o.orderId || o.id).toLowerCase();
            const email = (o.email || '').toLowerCase();
            const name = (o.name || '').toLowerCase();
            return oid.includes(searchTerm) || email.includes(searchTerm) || name.includes(searchTerm);
        });
    }

    if (statusFilter) {
        filtered = filtered.filter(o => o.status === statusFilter);
    }

    listElem.innerHTML = filtered.length > 0
        ? filtered.map(o => {
            const date = o.createdAt?.toDate?.() ? o.createdAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
            const displayId = o.orderId || `KP-${o.id.slice(0, 8).toUpperCase()}`;
            const itemsList = (o.items || []).map(i => `${i.name} ×${i.quantity}`).join(', ');
            const statusColors = {
                'Pending': 'text-yellow-700 bg-yellow-50 border-yellow-200',
                'Processing': 'text-blue-700 bg-blue-50 border-blue-200',
                'Shipped': 'text-purple-700 bg-purple-50 border-purple-200',
                'Delivered': 'text-green-700 bg-green-50 border-green-200',
                'Cancelled': 'text-red-700 bg-red-50 border-red-200',
            };
            const borderColor = statusColors[o.status]?.split(' ')[2] || 'border-gray-200';

            return `
                <div class="border-2 ${borderColor} rounded-lg p-4 mb-3 transition-colors">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-bold text-sm text-amber-800">${displayId}</p>
                            <p class="text-xs text-gray-500">${date} · ${(o.paymentMethod || 'stripe').toUpperCase()}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <select class="order-status-select text-xs border rounded px-2 py-1 font-medium" data-id="${o.id}">
                                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>🔄 Processing</option>
                                <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>📦 Shipped</option>
                                <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                            </select>
                            <span class="font-bold text-sm">${formatPrice(o.total || 0)}</span>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600"><i class="fas fa-user mr-1"></i>${o.name || 'Guest'} · <i class="fas fa-envelope mr-1"></i>${o.email || ''}</p>
                    <p class="text-xs text-gray-600"><i class="fas fa-phone mr-1"></i>${o.phone || 'N/A'}</p>
                    <p class="text-xs text-gray-400 mt-1"><i class="fas fa-box mr-1"></i>${itemsList || 'No items'}</p>
                </div>
            `;
        }).join('')
        : `<p class="text-gray-500 text-center py-8">${searchTerm || statusFilter ? 'No orders match your search.' : 'No orders yet.'}</p>`;

    // Order status change handlers
    listElem.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            try {
                await updateDoc(doc(db, "orders", e.target.dataset.id), {
                    status: e.target.value,
                    updatedAt: new Date(),
                });
                // Update local cache
                const order = allOrders.find(o => o.id === e.target.dataset.id);
                if (order) order.status = e.target.value;
                renderFilteredOrders();
                showMessage('Order status updated.', 'success');
            } catch (err) {
                showMessage('Failed to update status.', 'error');
            }
        });
    });
}

function exportOrdersCSV() {
    if (allOrders.length === 0) {
        showMessage('No orders to export.', 'error');
        return;
    }

    const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Address', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Payment', 'Status', 'Date'];
    const rows = allOrders.map(o => {
        const date = o.createdAt?.toDate?.() ? o.createdAt.toDate().toISOString().split('T')[0] : 'N/A';
        const items = (o.items || []).map(i => `${i.name} x${i.quantity}`).join('; ');
        const displayId = o.orderId || `KP-${o.id.slice(0, 8).toUpperCase()}`;
        const address = [o.address, o.city, o.state, o.zip].filter(Boolean).join(', ');
        return [
            displayId, o.name || '', o.email || '', o.phone || '', `"${address}"`,
            `"${items}"`, o.subtotal || 0, o.discount || 0, o.shipping || 0, o.total || 0,
            o.paymentMethod || 'stripe', o.status || 'Pending', date
        ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showMessage('Orders exported to CSV!', 'success');
}
