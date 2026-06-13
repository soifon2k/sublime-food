(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const formatPrice = (n) => n.toLocaleString('fr-FR') + ' FC';

  const paymentLabels = {
    mpesa: 'M-Pesa',
    physical: 'Paiement physique',
    cash: 'Paiement en espèces'
  };

  const paymentStatusLabels = {
    pending: 'En attente', confirmed: 'Confirmé', rejected: 'Rejeté'
  };

  function emptyRow(cols, msg) {
    return `<tr><td colspan="${cols}" style="text-align:center;color:#888;padding:24px">${msg}</td></tr>`;
  }

  function emptyBlock(msg) {
    return `<p style="text-align:center;color:#888;padding:40px">${msg}</p>`;
  }

  function statusLabel(s) {
    const map = {
      awaiting_payment: 'Attente paiement', received: 'Reçue', preparing: 'En préparation',
      onway: 'En route', delivered: 'Livrée', cancelled: 'Annulée'
    };
    return map[s] || s;
  }

  function countUserOrders(userId) {
    return Catalog.getOrders().filter(o => o.userId === userId).length;
  }

  function computeAnalytics() {
    const orders = Catalog.getOrders().filter(o => o.paymentStatus === 'confirmed');
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const productSales = {};
    orders.forEach(o => o.items?.forEach(i => {
      productSales[i.name] = (productSales[i.name] || 0) + (i.qty || 1);
    }));
    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const value = orders.filter(o => o.createdAt?.startsWith(dayStr)).reduce((s, o) => s + (o.total || 0), 0);
      dailyRevenue.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), value });
    }

    const monthlyRevenue = [];
    const now = new Date();
    for (let m = 0; m < 12; m++) {
      const value = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === m && d.getFullYear() === now.getFullYear();
      }).reduce((s, o) => s + (o.total || 0), 0);
      monthlyRevenue.push({ label: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][m], value });
    }

    const reviews = JSON.parse(localStorage.getItem('sublime_reviews') || '[]');
    const satisfaction = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

    return {
      totalRevenue, orderCount: Catalog.getOrders().length,
      confirmedCount: orders.length, topProducts, dailyRevenue, monthlyRevenue,
      satisfaction, reviewsCount: reviews.length
    };
  }

  function renderStats() {
    const a = computeAnalytics();
    const users = Catalog.getUsers();
    const pending = Catalog.getOrders().filter(o => o.paymentStatus === 'pending').length;
    $('#stats-grid').innerHTML = [
      { label: "Chiffre d'affaires", value: formatPrice(a.totalRevenue) },
      { label: 'Commandes totales', value: a.orderCount },
      { label: 'Paiements en attente', value: pending },
      { label: 'Clients inscrits', value: users.length }
    ].map(s => `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');
  }

  function renderRecentOrders() {
    const orders = Catalog.getOrders().slice(0, 8);
    const tbody = $('#recent-orders-table tbody');
    if (!orders.length) { tbody.innerHTML = emptyRow(6, 'Aucune commande'); return; }
    tbody.innerHTML = orders.map(o => `<tr>
      <td>${o.id}</td><td>${o.customerName || '—'}</td><td>${formatPrice(o.total)}</td>
      <td><span class="status-badge status-${o.paymentStatus || 'pending'}">${paymentStatusLabels[o.paymentStatus] || '—'}</span></td>
      <td><span class="status-badge status-${o.status}">${statusLabel(o.status)}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString('fr-FR')}</td></tr>`).join('');
  }

  function renderTopProducts() {
    const a = computeAnalytics();
    const el = $('#top-products-chart');
    if (!a.topProducts.length) { el.innerHTML = emptyBlock('Aucune vente confirmée'); return; }
    const max = Math.max(...a.topProducts.map(p => p[1]));
    el.innerHTML = a.topProducts.map(([name, count]) => `
      <div class="top-product-bar"><span class="tp-name">${name}</span>
      <div class="tp-bar"><div class="tp-fill" style="width:${max ? (count / max) * 100 : 0}%"></div></div>
      <span class="tp-count">${count}</span></div>`).join('');
  }

  function renderProducts() {
    const products = Catalog.getProducts();
    const cats = Catalog.getCategories();
    const tbody = $('#products-table tbody');
    tbody.innerHTML = products.map(p => {
      const cat = cats.find(c => c.id === p.category);
      const price = p.priceNote ? `${formatPrice(p.price)} (${p.priceNote})` : formatPrice(p.price);
      const rating = p.rating ? `⭐ ${p.rating} (${p.reviewCount})` : '—';
      return `<tr data-id="${p.id}">
        <td><img class="table-img" src="${p.image}" alt="" onerror="this.src='assets/image-menu.png'"></td>
        <td>${p.name}</td><td>${cat?.name || p.category}</td><td>${price}</td>
        <td>${rating}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-outline btn-edit-product" data-id="${p.id}">Modifier</button>
          <button class="btn btn-sm btn-danger btn-del-product" data-id="${p.id}">Suppr.</button>
        </td></tr>`;
    }).join('');

    $$('.btn-edit-product').forEach(btn => btn.onclick = () => {
      const p = Catalog.getProduct(btn.dataset.id);
      const price = prompt('Nouveau prix (FC) :', p.price);
      if (price === null) return;
      const name = prompt('Nom du produit :', p.name);
      if (name === null) return;
      Catalog.saveProductOverride(p.id, { price: +price, name });
      renderProducts();
      showAdminToast('Produit modifié');
    });

    $$('.btn-del-product').forEach(btn => btn.onclick = () => {
      if (!confirm('Supprimer ce produit du catalogue ?')) return;
      Catalog.deleteProduct(btn.dataset.id);
      renderProducts();
      showAdminToast('Produit supprimé');
    });
  }

  function renderCategories() {
    const cats = Catalog.getCategories();
    const products = Catalog.getProducts();
    $('#categories-admin').innerHTML = cats.map(c => {
      const count = products.filter(p => p.category === c.id).length;
      return `<div class="cat-admin-card">
        <div class="cat-icon">${c.icon}</div><h4>${c.name}</h4><p>${count} produits</p>
        <div class="card-actions">
          <button class="btn btn-sm btn-danger btn-del-cat" data-id="${c.id}">Supprimer</button>
        </div></div>`;
    }).join('');

    $$('.btn-del-cat').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.id;
      if (Catalog.getProducts().some(p => p.category === id)) {
        showAdminToast('Impossible : des produits utilisent cette catégorie');
        return;
      }
      if (!confirm('Supprimer cette catégorie ?')) return;
      Catalog.saveCategories(cats.filter(c => c.id !== id));
      renderCategories();
      showAdminToast('Catégorie supprimée');
    });
  }

  function addCategory() {
    const name = prompt('Nom de la catégorie :');
    if (!name) return;
    const icon = prompt('Icône (emoji) :', '🍽️') || '🍽️';
    const id = 'cat-' + Date.now();
    const cats = Catalog.getCategories();
    cats.push({ id, name, icon, image: 'assets/image-menu.png' });
    Catalog.saveCategories(cats);
    renderCategories();
    showAdminToast('Catégorie ajoutée');
  }

  function renderOrders() {
    const filter = $('#order-filter-status')?.value || 'all';
    let orders = Catalog.getOrders();
    if (filter === 'pending_payment') orders = orders.filter(o => o.paymentStatus === 'pending');
    else if (filter !== 'all') orders = orders.filter(o => o.status === filter);

    const tbody = $('#orders-table tbody');
    if (!orders.length) { tbody.innerHTML = emptyRow(8, 'Aucune commande'); return; }

    tbody.innerHTML = orders.map(o => `<tr>
      <td>${o.id}</td><td>${o.customerName || '—'}</td>
      <td>${o.items?.map(i => i.name).join(', ') || '—'}</td>
      <td>${formatPrice(o.total)}</td>
      <td>${paymentLabels[o.payment] || o.payment || '—'}</td>
      <td><span class="status-badge status-${o.paymentStatus || 'pending'}">${paymentStatusLabels[o.paymentStatus] || '—'}</span></td>
      <td>${o.paymentStatus === 'confirmed' ? `<select class="order-status-select" data-id="${o.id}">
        ${['received', 'preparing', 'onway', 'delivered'].map(s =>
          `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
      </select>` : `<span class="status-badge status-${o.status}">${statusLabel(o.status)}</span>`}</td>
      <td class="actions-cell">
        ${o.paymentStatus === 'pending' ? `<button class="btn btn-sm btn-gold btn-confirm-pay" data-id="${o.id}">Confirmer paiement</button>
        <button class="btn btn-sm btn-danger btn-reject-pay" data-id="${o.id}">Rejeter</button>` : ''}
        <button class="btn btn-sm btn-danger btn-del-order" data-id="${o.id}">Suppr.</button>
      </td></tr>`).join('');

    $$('.order-status-select').forEach(sel => sel.onchange = () => {
      Catalog.updateOrder(sel.dataset.id, { status: sel.value, statusIndex: ['received', 'preparing', 'onway', 'delivered'].indexOf(sel.value) });
      showAdminToast('Statut mis à jour');
    });
    $$('.btn-confirm-pay').forEach(btn => btn.onclick = () => {
      Catalog.updateOrder(btn.dataset.id, { paymentStatus: 'confirmed', status: 'received', statusIndex: 0, confirmedAt: new Date().toISOString() });
      renderOrders();
      showAdminToast('Paiement confirmé — commande activée');
    });
    $$('.btn-reject-pay').forEach(btn => btn.onclick = () => {
      if (!confirm('Rejeter ce paiement ?')) return;
      Catalog.updateOrder(btn.dataset.id, { paymentStatus: 'rejected', status: 'cancelled' });
      renderOrders();
      showAdminToast('Paiement rejeté');
    });
    $$('.btn-del-order').forEach(btn => btn.onclick = () => {
      if (!confirm('Supprimer cette commande ?')) return;
      Catalog.deleteOrder(btn.dataset.id);
      renderOrders();
      showAdminToast('Commande supprimée');
    });
  }

  function renderDeliverers() {
    const deliverers = Catalog.getDeliverers();
    const el = $('#deliverers-grid');
    if (!deliverers.length) { el.innerHTML = emptyBlock('Aucun livreur. Ajoutez-en un.'); return; }
    el.innerHTML = deliverers.map(d => `
      <div class="deliverer-card">
        <div class="deliverer-avatar">${d.name.charAt(0)}</div>
        <h4>${d.name}</h4><p class="text-muted">${d.phone}</p>
        <span class="deliverer-status ${d.status || 'offline'}">${d.status === 'online' ? 'En ligne' : 'Hors ligne'}</span>
        <div class="card-actions">
          <button class="btn btn-sm btn-outline btn-toggle-del" data-id="${d.id}">${d.status === 'online' ? 'Hors ligne' : 'En ligne'}</button>
          <button class="btn btn-sm btn-danger btn-del-del" data-id="${d.id}">Supprimer</button>
        </div></div>`).join('');

    $$('.btn-toggle-del').forEach(btn => btn.onclick = () => {
      const list = Catalog.getDeliverers();
      const d = list.find(x => x.id === btn.dataset.id);
      if (d) {
        d.status = d.status === 'online' ? 'offline' : 'online';
        Catalog.saveDeliverers(list);
        renderDeliverers();
        showAdminToast('Statut livreur mis à jour');
      }
    });
    $$('.btn-del-del').forEach(btn => btn.onclick = () => {
      if (!confirm('Supprimer ce livreur ?')) return;
      Catalog.saveDeliverers(Catalog.getDeliverers().filter(d => d.id !== btn.dataset.id));
      renderDeliverers();
      showAdminToast('Livreur supprimé');
    });
  }

  function addDeliverer() {
    const name = prompt('Nom du livreur :');
    if (!name) return;
    const phone = prompt('Téléphone :');
    if (!phone) return;
    const list = Catalog.getDeliverers();
    list.push({ id: 'd' + Date.now(), name, phone, status: 'offline' });
    Catalog.saveDeliverers(list);
    renderDeliverers();
    showAdminToast('Livreur ajouté');
  }

  function renderClients() {
    const users = Catalog.getUsers();
    const tbody = $('#clients-table tbody');
    if (!users.length) { tbody.innerHTML = emptyRow(7, 'Aucun client'); return; }
    tbody.innerHTML = users.map(u => {
      const badge = SUBLIME_DATA.loyaltyBadges.filter(b => (u.points || 0) >= b.minPoints).pop();
      return `<tr>
        <td>${u.name}</td><td>${u.email}</td><td>${u.phone || '—'}</td>
        <td>${countUserOrders(u.id)}</td><td>${u.points || 0}</td><td>${badge?.name || 'Bronze'}</td>
        <td><button class="btn btn-sm btn-danger btn-del-client" data-id="${u.id}">Supprimer</button></td></tr>`;
    }).join('');

    $$('.btn-del-client').forEach(btn => btn.onclick = () => {
      if (!confirm('Supprimer ce client ?')) return;
      Catalog.deleteUser(btn.dataset.id);
      renderClients();
      showAdminToast('Client supprimé');
    });
  }

  function renderPromotions() {
    const promos = Catalog.getPromotions();
    const el = $('#promos-admin');
    if (!promos.length) { el.innerHTML = emptyBlock('Aucune promotion'); return; }
    el.innerHTML = promos.map(p => `
      <div class="promo-admin-card">
        <img src="${p.image || 'assets/image-acceuil.jpeg'}" alt="" onerror="this.src='assets/image-menu.png'">
        <div class="promo-admin-info">
          <h4>${p.title}</h4><p>${p.subtitle || ''}</p>
          <button class="btn btn-sm btn-danger btn-del-promo" data-id="${p.id}">Supprimer</button>
        </div></div>`).join('');

    $$('.btn-del-promo').forEach(btn => btn.onclick = () => {
      if (!confirm('Supprimer cette promotion ?')) return;
      Catalog.savePromotions(Catalog.getPromotions().filter(p => p.id !== btn.dataset.id));
      renderPromotions();
      showAdminToast('Promotion supprimée');
    });
  }

  function addPromotion() {
    const title = prompt('Titre :');
    if (!title) return;
    const subtitle = prompt('Description :') || '';
    const list = Catalog.getPromotions();
    list.push({ id: 'p' + Date.now(), title, subtitle, image: 'assets/image-acceuil.jpeg' });
    Catalog.savePromotions(list);
    renderPromotions();
    showAdminToast('Promotion ajoutée');
  }

  function addProduct() {
    const name = prompt('Nom du produit :');
    if (!name) return;
    const price = +prompt('Prix (FC) :', '5000');
    if (!price) return;
    const cats = Catalog.getCategories();
    const catNames = cats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const catIdx = +prompt(`Catégorie :\n${catNames}\nNuméro :`, '1') - 1;
    const category = cats[catIdx]?.id || 'plats';
    Catalog.addProduct({ id: 'p-' + Date.now(), name, price, category, image: 'assets/image-menu.png' });
    renderProducts();
    showAdminToast('Produit ajouté');
  }

  function renderPayments() {
    const orders = Catalog.getOrders();
    const tbody = $('#payments-table tbody');
    if (!orders.length) {
      $('#payment-stats').innerHTML = '';
      tbody.innerHTML = emptyRow(7, 'Aucun paiement');
      return;
    }
    const confirmed = orders.filter(o => o.paymentStatus === 'confirmed');
    const pending = orders.filter(o => o.paymentStatus === 'pending');
    const total = confirmed.reduce((s, o) => s + o.total, 0);
    $('#payment-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Encaissé (confirmé)</div><div class="stat-value">${formatPrice(total)}</div></div>
      <div class="stat-card"><div class="stat-label">En attente</div><div class="stat-value">${pending.length}</div></div>
      <div class="stat-card"><div class="stat-label">Paiement physique</div><div class="stat-value">${orders.filter(o => o.payment === 'physical').length}</div></div>`;

    tbody.innerHTML = orders.map(o => `<tr>
      <td>PAY${o.id.slice(3)}</td><td>${o.id}</td>
      <td>${paymentLabels[o.payment] || o.payment}</td>
      <td>${formatPrice(o.total)}</td>
      <td><span class="status-badge status-${o.paymentStatus || 'pending'}">${paymentStatusLabels[o.paymentStatus]}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
      <td class="actions-cell">
        ${o.paymentStatus === 'pending' ? `<button class="btn btn-sm btn-gold btn-confirm-pay" data-id="${o.id}">Confirmer</button>` : '—'}
      </td></tr>`).join('');

    $$('#payments-table .btn-confirm-pay').forEach(btn => btn.onclick = () => {
      Catalog.updateOrder(btn.dataset.id, { paymentStatus: 'confirmed', status: 'received', statusIndex: 0 });
      renderPayments();
      showAdminToast('Paiement confirmé');
    });
  }

  function renderAnalytics() {
    const a = computeAnalytics();
    $('#analytics-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">CA confirmé</div><div class="stat-value">${formatPrice(a.totalRevenue)}</div></div>
      <div class="stat-card"><div class="stat-label">Commandes</div><div class="stat-value">${a.orderCount}</div></div>
      <div class="stat-card"><div class="stat-label">Satisfaction</div><div class="stat-value">${a.satisfaction ? a.satisfaction + '/5' : '—'}</div></div>
      <div class="stat-card"><div class="stat-label">Confirmées</div><div class="stat-value">${a.confirmedCount}</div></div>`;

    const maxDaily = Math.max(...a.dailyRevenue.map(d => d.value), 1);
    $('#daily-revenue-chart').innerHTML = a.dailyRevenue.map(d => `
      <div class="bar-item"><div class="bar-value">${d.value ? (d.value / 1000).toFixed(0) + 'k' : '0'}</div>
      <div class="bar" style="height:${d.value ? (d.value / maxDaily) * 140 : 4}px"></div><div class="bar-label">${d.label}</div></div>`).join('');

    const maxMonthly = Math.max(...a.monthlyRevenue.map(m => m.value), 1);
    $('#monthly-revenue-chart').innerHTML = a.monthlyRevenue.map(m => `
      <div class="bar-item"><div class="bar-value">${m.value ? (m.value / 1000).toFixed(0) + 'k' : ''}</div>
      <div class="bar" style="height:${m.value ? (m.value / maxMonthly) * 140 : 4}px"></div><div class="bar-label">${m.label}</div></div>`).join('');

    $('#satisfaction-meter').innerHTML = a.satisfaction
      ? `<div class="satisfaction-score">${a.satisfaction}</div><div class="satisfaction-stars">${'⭐'.repeat(Math.round(a.satisfaction))}</div>
         <div class="satisfaction-label">${a.reviewsCount} avis</div>` : emptyBlock('Pas encore d\'avis');

    const el = $('#analytics-top-products');
    if (!a.topProducts.length) { el.innerHTML = emptyBlock('Aucune vente'); return; }
    const max = Math.max(...a.topProducts.map(p => p[1]));
    el.innerHTML = a.topProducts.map(([name, count]) => `
      <div class="top-product-bar"><span class="tp-name">${name}</span>
      <div class="tp-bar"><div class="tp-fill" style="width:${(count / max) * 100}%"></div></div>
      <span class="tp-count">${count}</span></div>`).join('');
  }

  function showAdminToast(msg) {
    let t = document.getElementById('admin-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'admin-toast';
      t.className = 'admin-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  const sectionRenderers = {
    dashboard: () => { renderStats(); renderRecentOrders(); renderTopProducts(); },
    products: renderProducts, categories: renderCategories, orders: renderOrders,
    deliverers: renderDeliverers, clients: renderClients, promotions: renderPromotions,
    payments: renderPayments, analytics: renderAnalytics
  };

  const sectionTitles = {
    dashboard: 'Tableau de bord', products: 'Gestion produits', categories: 'Gestion catégories',
    orders: 'Gestion commandes', deliverers: 'Gestion livreurs', clients: 'Gestion clients',
    promotions: 'Gestion promotions', payments: 'Gestion paiements', analytics: 'Analytiques'
  };

  function showSection(name) {
    $$('.admin-section').forEach(s => s.classList.remove('active'));
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    $(`#sec-${name}`)?.classList.add('active');
    $(`.nav-link[data-section="${name}"]`)?.classList.add('active');
    $('#admin-title').textContent = sectionTitles[name] || name;
    if (sectionRenderers[name]) sectionRenderers[name]();
    $('#sidebar')?.classList.remove('open');
  }

  function setupAdminEvents() {
    $$('.nav-link').forEach(link => link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    }));
    $('#menu-toggle')?.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    document.addEventListener('click', (e) => {
      const sidebar = $('#sidebar');
      if (!sidebar?.classList.contains('open')) return;
      if (e.target.closest('#sidebar') || e.target.closest('#menu-toggle')) return;
      sidebar.classList.remove('open');
    });
    $('#order-filter-status')?.addEventListener('change', renderOrders);
    $('#btn-logout')?.addEventListener('click', () => AdminAuth.logout());
    $('#admin-product-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      $$('#products-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    $('#btn-add-deliverer')?.addEventListener('click', addDeliverer);
    $('#btn-add-promo')?.addEventListener('click', addPromotion);
    $('#btn-add-product')?.addEventListener('click', addProduct);
    $('#btn-add-category')?.addEventListener('click', addCategory);
  }

  async function initAdmin() {
    const loginScreen = $('#admin-login');
    const layout = $('.admin-layout');

    setupAdminEvents();

    const valid = await AdminAuth.verify();
    if (!valid) {
      loginScreen.classList.remove('hidden');
      layout.classList.add('hidden');
      $('#admin-login-form').onsubmit = async (e) => {
        e.preventDefault();
        const err = $('#admin-login-error');
        err.textContent = '';
        try {
          await AdminAuth.login($('#admin-user').value.trim(), $('#admin-pass').value);
          loginScreen.classList.add('hidden');
          layout.classList.remove('hidden');
          showSection('dashboard');
        } catch (ex) { err.textContent = ex.message; }
      };
      return;
    }

    loginScreen.classList.add('hidden');
    layout.classList.remove('hidden');
    showSection('dashboard');
  }

  document.addEventListener('DOMContentLoaded', initAdmin);
})();
