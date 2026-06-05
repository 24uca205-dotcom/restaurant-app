// South Indian Kitchen - Restaurant POS
import { QRCode } from './counter.js';
(function () {
  'use strict';

  // --- Constants & Defaults ---
  const MENU_KEY = 'sik_menu';
  const CART_KEY = 'sik_cart';
  const ORDERS_KEY = 'sik_orders';
  const DEFAULT_MENU = [
  {
    id: '1',
    name: 'Idly',
    price: 20,
    category: 'Breakfast',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'
  },
  {
    id: '2',
    name: 'Mini Idly',
    price: 30,
    category: 'Breakfast',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Podi%20Mini%20Idli.jpg'
  },
  {
    id: '3',
    name: 'Masala Dosa',
    price: 60,
    category: 'Dosa Varieties',
    image: 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg'
  },
  {
    id: '4',
    name: 'Meals',
    price: 120,
    category: 'Meals & Rice',
    image: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'
  },
  {
    id: '5',
    name: 'Coffee',
    price: 20,
    category: 'Beverages',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg'
  },
  {
    id: '6',
    name: 'Coca Cola',
    price: 40,
    category: 'Cool Drinks',
    image: 'https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg'
  },
  {
    id: '7',
    name: 'Gulab Jamun',
    price: 30,
    category: 'Desserts',
    image: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg'
  }
];
  // --- State ---
  let menu = [];
  let cart = [];
  let editingItemId = null;

  // --- LocalStorage Helpers ---
  function load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch { return fallback; }
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function getMenu() {
    if (menu.length === 0) menu = load(MENU_KEY, DEFAULT_MENU);
    return menu;
  }

  function saveMenu() { save(MENU_KEY, menu); }
  function getCart() { return cart; }
  function saveCart() { save(CART_KEY, cart); }
  function getOrders() { return load(ORDERS_KEY, []); }
  function saveOrders(orders) { save(ORDERS_KEY, orders); }

  // --- Toast ---
  function toast(msg, type = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ` toast-${type}` : '');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // --- Tab Navigation ---
  function initTabs() {
    const allBtns = document.querySelectorAll('.nav-btn[data-tab]');
    allBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        // Update all nav buttons
        allBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        // Show tab content
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tab)?.classList.add('active');
        // Close mobile nav
        document.getElementById('mobileNav')?.classList.remove('open');
        // Refresh tab-specific content
        if (tab === 'reports') renderReport();
      });
    });

    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('mobileNav')?.classList.toggle('open');
    });
  }

  // --- Menu Rendering ---
  function renderMenu(filter = '') {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    const items = getMenu().filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.category.toLowerCase().includes(filter.toLowerCase())
    );
    if (items.length === 0) {
      grid.innerHTML = '<p class="empty-msg">No items found.</p>';
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="menu-card" data-id="${item.id}">
        <img class="menu-card-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400'">
        <div class="menu-card-body">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-category">${item.category}</div>
          <div class="menu-card-price">$${item.price.toFixed(2)}</div>
        </div>
        <button class="menu-card-add" title="Add to cart">+</button>
      </div>
    `).join('');

    grid.querySelectorAll('.menu-card').forEach(card => {
      const addBtn = card.querySelector('.menu-card-add');
      const handler = (e) => {
        e.stopPropagation();
        addToCart(card.dataset.id);
      };
      addBtn.addEventListener('click', handler);
      card.addEventListener('click', handler);
    });
  }

  // --- Cart ---
  function addToCart(itemId) {
    const item = getMenu().find(i => i.id === itemId);
    if (!item) return;
    const existing = cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    renderCart();
    toast(`${item.name} added to cart`, 'success');
  }

  function removeFromCart(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    saveCart();
    updateCartBadge();
    renderCart();
  }

  function updateQty(itemId, delta) {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) return removeFromCart(itemId);
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
    toast('Cart cleared');
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateCartBadge() {
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const badge = document.getElementById('cartBadge');
    const badgeM = document.getElementById('cartBadgeMobile');
    if (badge) badge.textContent = count;
    if (badgeM) badgeM.textContent = count;
  }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const emptyMsg = document.getElementById('emptyCartMsg');
    const billLines = document.getElementById('billLines');
    const totalEl = document.getElementById('totalAmount');

    if (cart.length === 0) {
      if (container) container.innerHTML = '<p class="empty-msg">Your cart is empty. Click items on the menu to add them.</p>';
      if (billLines) billLines.innerHTML = '';
      if (totalEl) totalEl.textContent = '0.00';
      return;
    }

    if (container) {
      container.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400'">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
          </div>
          <div class="cart-qty">
            <button onclick="window._app.updateQty('${item.id}', -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="window._app.updateQty('${item.id}', 1)">+</button>
          </div>
          <div class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</div>
          <button class="cart-item-remove" onclick="window._app.removeFromCart('${item.id}')">&times;</button>
        </div>
      `).join('');
    }

    if (billLines) {
      billLines.innerHTML = cart.map(item => `
        <div class="bill-line">
          <span>${item.name} x${item.qty}</span>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('');
    }

    if (totalEl) totalEl.textContent = getCartTotal().toFixed(2);
  }

  // --- Pay Now (QR) ---
  function showPayModal() {
    if (cart.length === 0) { toast('Cart is empty', 'error'); return; }
    const total = getCartTotal();
    document.getElementById('payAmount').textContent = total.toFixed(2);
    const qrContainer = document.getElementById('qrContainer');
    QRCode.render(qrContainer, `South Indian Kitchen - Total: $${total.toFixed(2)}`, 200);
    document.getElementById('payModal').classList.add('open');
  }

  function confirmPayment() {
    if (cart.length === 0) return;
    const total = getCartTotal();
    const order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: cart.map(c => ({ ...c })),
      total
    };
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
    document.getElementById('payModal').classList.remove('open');
    toast('Payment confirmed! Order recorded.', 'success');
  }

  // --- Print Bill ---
  function printBill() {
    if (cart.length === 0) { toast('Cart is empty', 'error'); return; }
    const printItems = document.getElementById('printItems');
    const printTotal = document.getElementById('printTotal');
    const printDate = document.getElementById('printDate');

    printItems.innerHTML = cart.map(item => `
      <div class="print-item">
        <span>${item.name} x${item.qty}</span>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('');
    printTotal.textContent = getCartTotal().toFixed(2);
    printDate.textContent = new Date().toLocaleString();

    window.print();
  }

  // --- Manage Menu (CRUD) ---
  function renderManageList() {
    const list = document.getElementById('manageList');
    if (!list) return;
    const items = getMenu();
    if (items.length === 0) {
      list.innerHTML = '<p class="empty-msg">No menu items. Add one above.</p>';
      return;
    }
    list.innerHTML = items.map(item => `
      <div class="manage-item">
        <img class="manage-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400'">
        <div class="manage-item-info">
          <div class="manage-item-name">${item.name}</div>
          <div class="manage-item-meta">${item.category} &middot; $${item.price.toFixed(2)}</div>
        </div>
        <div class="manage-item-actions">
          <button class="btn btn-ghost btn-sm" onclick="window._app.editItem('${item.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--error)" onclick="window._app.deleteItem('${item.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function openItemModal(item = null) {
    editingItemId = item ? item.id : null;
    document.getElementById('modalTitle').textContent = item ? 'Edit Menu Item' : 'Add Menu Item';
    document.getElementById('itemName').value = item ? item.name : '';
    document.getElementById('itemPrice').value = item ? item.price : '';
    document.getElementById('itemCategory').value = item ? item.category : 'Breakfast';
    document.getElementById('itemImage').value = item ? item.image : '';
    document.getElementById('itemModal').classList.add('open');
  }

  function closeItemModal() {
    document.getElementById('itemModal').classList.remove('open');
    editingItemId = null;
  }

  function saveItem(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const image = document.getElementById('itemImage').value.trim() || 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400';

    if (!name || isNaN(price) || price < 0) {
      toast('Please fill in all fields correctly', 'error');
      return;
    }

    if (editingItemId) {
      const item = menu.find(i => i.id === editingItemId);
      if (item) {
        item.name = name;
        item.price = price;
        item.category = category;
        item.image = image;
      }
      toast('Item updated', 'success');
    } else {
      const newItem = {
        id: Date.now().toString(),
        name, price, category, image
      };
      menu.push(newItem);
      toast('Item added', 'success');
    }

    saveMenu();
    closeItemModal();
    renderMenu();
    renderManageList();
  }

  function editItem(id) {
    const item = getMenu().find(i => i.id === id);
    if (item) openItemModal(item);
  }

  function deleteItem(id) {
    if (!confirm('Delete this menu item?')) return;
    menu = menu.filter(i => i.id !== id);
    cart = cart.filter(c => c.id !== id);
    saveMenu();
    saveCart();
    updateCartBadge();
    renderCart();
    renderMenu();
    renderManageList();
    toast('Item deleted');
  }

  // --- Reports ---
  function renderReport() {
    const monthInput = document.getElementById('reportMonth');
    if (!monthInput) return;
    const now = new Date();
    if (!monthInput.value) {
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const [year, month] = monthInput.value.split('-').map(Number);
    const orders = getOrders().filter(o => {
      const d = new Date(o.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    // Aggregate by day
    const dayMap = {};
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalItems = 0;

    orders.forEach(o => {
      const day = new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dayMap[day]) dayMap[day] = { orders: 0, items: 0, revenue: 0 };
      dayMap[day].orders += 1;
      dayMap[day].items += o.items.reduce((s, i) => s + i.qty, 0);
      dayMap[day].revenue += o.total;
      totalOrders++;
      totalItems += o.items.reduce((s, i) => s + i.qty, 0);
      totalRevenue += o.total;
    });

    // Summary cards
    const summary = document.getElementById('reportSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="report-card">
          <div class="report-card-label">Total Orders</div>
          <div class="report-card-value">${totalOrders}</div>
        </div>
        <div class="report-card">
          <div class="report-card-label">Items Sold</div>
          <div class="report-card-value">${totalItems}</div>
        </div>
        <div class="report-card">
          <div class="report-card-label">Revenue</div>
          <div class="report-card-value">$${totalRevenue.toFixed(2)}</div>
        </div>
        <div class="report-card">
          <div class="report-card-label">Avg Order Value</div>
          <div class="report-card-value">${totalOrders > 0 ? '$' + (totalRevenue / totalOrders).toFixed(2) : '$0.00'}</div>
        </div>
      `;
    }

    // Table
    const tbody = document.getElementById('reportBody');
    if (tbody) {
      const days = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]));
      if (days.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-500);padding:32px">No orders this month</td></tr>';
      } else {
        tbody.innerHTML = days.map(([day, data]) => `
          <tr>
            <td>${day}</td>
            <td>${data.orders}</td>
            <td>${data.items}</td>
            <td>$${data.revenue.toFixed(2)}</td>
          </tr>
        `).join('');
      }
    }
  }

  function exportReport() {
    const monthInput = document.getElementById('reportMonth');
    const [year, month] = (monthInput?.value || '').split('-').map(Number);
    if (!year || !month) { toast('Select a month first', 'error'); return; }

    const orders = getOrders().filter(o => {
      const d = new Date(o.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    let csv = 'Date,Order ID,Items,Total\n';
    orders.forEach(o => {
      const date = new Date(o.date).toLocaleDateString();
      const items = o.items.map(i => `${i.name}x${i.qty}`).join('; ');
      csv += `"${date}","${o.id}","${items}","${o.total.toFixed(2)}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${monthInput.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Report exported', 'success');
  }

  // --- Init ---
  function init() {
    // Load state
    menu = load(MENU_KEY, DEFAULT_MENU);
    cart = load(CART_KEY, []);

    // Expose for inline handlers
    window._app = { updateQty, removeFromCart, editItem, deleteItem };

    // Tabs
    initTabs();

    // Menu
    renderMenu();
    const searchInput = document.getElementById('menuSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderMenu(e.target.value));
    }

    // Cart
    updateCartBadge();
    renderCart();
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);

    // Pay / Print
    document.getElementById('payNowBtn')?.addEventListener('click', showPayModal);
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', confirmPayment);
    document.getElementById('payModalClose')?.addEventListener('click', () => {
      document.getElementById('payModal').classList.remove('open');
    });
    document.getElementById('printBillBtn')?.addEventListener('click', printBill);

    // Manage menu
    renderManageList();
    document.getElementById('addItemBtn')?.addEventListener('click', () => openItemModal());
    document.getElementById('modalClose')?.addEventListener('click', closeItemModal);
    document.getElementById('modalCancel')?.addEventListener('click', closeItemModal);
    document.getElementById('itemForm')?.addEventListener('submit', saveItem);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    // Reports
    document.getElementById('reportMonth')?.addEventListener('change', renderReport);
    document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
    renderReport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
