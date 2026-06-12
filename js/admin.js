(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const formatPrice = (n) => n.toLocaleString('fr-FR') + ' FC';

  function emptyRow(cols, msg) {
    return `<tr><td colspan="${cols}" style="text-align:center;color:#888;padding:24px">${msg}</td></tr>`;
  }

  function emptyBlock(msg) {
    return `<p style="text-align:center;color:#888;padding:40px">${msg}</p>`;
  }

  function getOrders() { return JSON.parse(localStorage.getItem('sublime_orders') || '[]'); }
  function getUsers() { return JSON.parse(localStorage.getItem('sublime_users') || '[]'); }
  function getDeliverers() { return JSON.parse(localStorage.getItem('sublime_deliverers') || '[]'); }
  function getPromotions() { return JSON.parse(localStorage.getItem('sublime_promotions') || '[]'); }

  function getPayments() {
    return getOrders().map(o => ({
      id: 'PAY' + o.id.slice(3),
      orderId: o.id,
      method: o.payment || 'cash',
      amount: o.total,
      status: 'completed',
      date: o.createdAt
    }));
  }

  function countUserOrders(userId) {
    return getOrders().filter(o => o.userId === userId).length;
  }

  function computeAnalytics() {
    const orders = getOrders();
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
      const value = orders
        .filter(o => o.createdAt?.startsWith(dayStr))
        .reduce((s, o) => s + (o.total || 0), 0);
      dailyRevenue.push({
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        value
      });
    }

    const monthlyRevenue = [];
    const now = new Date();
    for (let m = 0; m < 12; m++) {
      const value = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === m && d.getFullYear() === now.getFullYear();
      }).reduce((s, o) => s + (o.total || 0), 0);
      monthlyRevenue.push({
        label: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][m],
        value
      });
    }

    const reviews = JSON.parse(localStorage.getItem('sublime_reviews') || '[]');
    const satisfaction = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return { totalRevenue, orderCount: orders.length, topProducts, dailyRevenue, monthlyRevenue, satisfaction, reviewsCount: reviews.length };
  }

  function statusLabel(s) {
    return { received: 'Reçue', preparing: 'En préparation', onway: 'En route', delivered: 'Livrée' }[s] || s;
  }

  function renderStats() {
    const a = computeAnalytics();
    const users = getUsers();
    const avgBasket = a.orderCount ? Math.round(a.totalRevenue / a.orderCount) : 0;
    $('#stats-grid').innerHTML = [
      { label: "Chiffre d'affaires", value: formatPrice(a.totalRevenue) },
      { label: 'Commandes', value: a.orderCount },
      { label: 'Clients inscrits', value: users.length },
      { label: 'Panier moyen', value: a.orderCount ? formatPrice(avgBasket) : '—' }
    ].map(s => `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');
  }

  function renderRecentOrders() {
    const orders = getOrders().slice(0, 8);
    const tbody = $('#recent-orders-table tbody');
    if (!orders.length) {
      tbody.innerHTML = emptyRow(5, 'Aucune commande pour le moment');
      return;
    }
    tbody.innerHTML = orders.map(o => `<tr>
      <td>${o.id}</td><td>${o.customerName || '—'}</td><td>${formatPrice(o.total)}</td>
      <td><span class="status-badge status-${o.status}">${statusLabel(o.status)}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString('fr-FR')}</td></tr>`).join('');
  }

  function renderTopProducts() {
    const a = computeAnalytics();
    const el = $('#top-products-chart');
    if (!a.topProducts.length) {
      el.innerHTML = emptyBlock('Aucune vente enregistrée');
      return;
    }
    const max = Math.max(...a.topProducts.map(p => p[1]));
    el.innerHTML = a.topProducts.map(([name, count]) => `
      <div class="top-product-bar"><span class="tp-name">${name}</span>
      <div class="tp-bar"><div class="tp-fill" style="width:${max ? (count / max) * 100 : 0}%"></div></div>
      <span class="tp-count">${count}</span></div>`).join('');
  }

  function renderProducts() {
    const tbody = $('#products-table tbody');
    tbody.innerHTML = SUBLIME_DATA.products.map(p => {
      const cat = SUBLIME_DATA.categories.find(c => c.id === p.category);
      const price = p.priceNote ? `${formatPrice(p.price)} (${p.priceNote})` : formatPrice(p.price);
      return `<tr><td><img class="table-img" src="${p.image}" alt=""></td>
        <td>${p.name}</td><td>${cat?.name || p.category}</td><td>${price}</td>
        <td>—</td><td><button class="btn btn-sm btn-outline" disabled title="Catalogue fixe du prompt">—</button></td></tr>`;
    }).join('');
  }

  function renderCategories() {
    $('#categories-admin').innerHTML = SUBLIME_DATA.categories.map(c => {
      const count = SUBLIME_DATA.products.filter(p => p.category === c.id).length;
      return `<div class="cat-admin-card"><div class="cat-icon">${c.icon}</div><h4>${c.name}</h4><p>${count} produits</p></div>`;
    }).join('');
  }

  function renderOrders() {
    const filter = $('#order-filter-status')?.value || 'all';
    let orders = getOrders();
    if (filter !== 'all') orders = orders.filter(o => o.status === filter);
    const tbody = $('#orders-table tbody');
    if (!orders.length) {
      tbody.innerHTML = emptyRow(7, 'Aucune commande');
      return;
    }
    tbody.innerHTML = orders.map(o => `<tr>
      <td>${o.id}</td><td>${o.customerName || '—'}</td><td>${o.items?.map(i => i.name).join(', ') || '—'}</td>
      <td>${formatPrice(o.total)}</td><td>${o.payment || '—'}</td>
      <td><span class="status-badge status-${o.status}">${statusLabel(o.status)}</span></td>
      <td><select class="order-status-select" data-id="${o.id}">
        ${['received', 'preparing', 'onway', 'delivered'].map(s =>
          `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
      </select></td></tr>`).join('');
    $$('.order-status-select').forEach(sel => sel.onchange = () => {
      const all = getOrders();
      const order = all.find(x => x.id === sel.dataset.id);
      if (order) {
        order.status = sel.value;
        order.statusIndex = ['received', 'preparing', 'onway', 'delivered'].indexOf(sel.value);
        localStorage.setItem('sublime_orders', JSON.stringify(all));
      }
      showAdminToast('Statut mis à jour');
    });
  }

  function renderDeliverers() {
    const deliverers = getDeliverers();
    const el = $('#deliverers-grid');
    if (!deliverers.length) {
      el.innerHTML = emptyBlock('Aucun livreur enregistré. Ajoutez-en un via le bouton ci-dessus.');
      return;
    }
    el.innerHTML = deliverers.map(d => `
      <div class="deliverer-card"><div class="deliverer-avatar">${d.name.charAt(0)}</div>
      <h4>${d.name}</h4><p style="font-size:0.85rem;color:#888">${d.phone}</p>
      <span class="deliverer-status ${d.status || 'offline'}">${d.status === 'online' ? 'En ligne' : 'Hors ligne'}</span></div>`).join('');
  }

  function renderClients() {
    const users = getUsers();
    const tbody = $('#clients-table tbody');
    if (!users.length) {
      tbody.innerHTML = emptyRow(6, 'Aucun client inscrit');
      return;
    }
    tbody.innerHTML = users.map(u => {
      const badge = SUBLIME_DATA.loyaltyBadges.filter(b => (u.points || 0) >= b.minPoints).pop();
      return `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.phone || '—'}</td>
        <td>${countUserOrders(u.id)}</td><td>${u.points || 0}</td><td>${badge?.name || 'Bronze'}</td></tr>`;
    }).join('');
  }

  function renderPromotions() {
    const promos = getPromotions();
    const el = $('#promos-admin');
    if (!promos.length) {
      el.innerHTML = emptyBlock('Aucune promotion active. Créez-en une via le bouton ci-dessus.');
      return;
    }
    el.innerHTML = promos.map(p => `
      <div class="promo-admin-card"><img src="${p.image || 'assets/image-acceuil.jpeg'}" alt=""><div class="promo-admin-info">
        <h4>${p.title}</h4><p>${p.subtitle || ''}</p></div></div>`).join('');
  }

  function renderPayments() {
    const payments = getPayments();
    const el = $('#payments-table tbody');
    if (!payments.length) {
      $('#payment-stats').innerHTML = '';
      el.innerHTML = emptyRow(6, 'Aucun paiement enregistré');
      return;
    }
    const total = payments.reduce((s, p) => s + p.amount, 0);
    $('#payment-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total encaissé</div><div class="stat-value">${formatPrice(total)}</div></div>
      <div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value">${payments.length}</div></div>`;
    el.innerHTML = payments.map(p => `<tr>
      <td>${p.id}</td><td>${p.orderId}</td><td>${p.method}</td>
      <td>${formatPrice(p.amount)}</td><td>${p.status}</td><td>${new Date(p.date).toLocaleDateString('fr-FR')}</td></tr>`).join('');
  }

  function renderAnalytics() {
    const a = computeAnalytics();
    $('#analytics-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">CA Total</div><div class="stat-value">${formatPrice(a.totalRevenue)}</div></div>
      <div class="stat-card"><div class="stat-label">Commandes</div><div class="stat-value">${a.orderCount}</div></div>
      <div class="stat-card"><div class="stat-label">Satisfaction</div><div class="stat-value">${a.satisfaction ? a.satisfaction + '/5' : '—'}</div></div>
      <div class="stat-card"><div class="stat-label">Revenus du jour</div><div class="stat-value">${formatPrice(a.dailyRevenue[a.dailyRevenue.length - 1].value)}</div></div>`;

    const maxDaily = Math.max(...a.dailyRevenue.map(d => d.value), 1);
    $('#daily-revenue-chart').innerHTML = a.dailyRevenue.map(d => `
      <div class="bar-item"><div class="bar-value">${d.value ? (d.value / 1000).toFixed(0) + 'k' : '0'}</div>
      <div class="bar" style="height:${d.value ? (d.value / maxDaily) * 140 : 4}px"></div><div class="bar-label">${d.label}</div></div>`).join('');

    const maxMonthly = Math.max(...a.monthlyRevenue.map(m => m.value), 1);
    $('#monthly-revenue-chart').innerHTML = a.monthlyRevenue.map(m => `
      <div class="bar-item"><div class="bar-value">${m.value ? (m.value / 1000).toFixed(0) + 'k' : ''}</div>
      <div class="bar" style="height:${m.value ? (m.value / maxMonthly) * 140 : 4}px"></div><div class="bar-label">${m.label}</div></div>`).join('');

    $('#satisfaction-meter').innerHTML = a.satisfaction
      ? `<div class="satisfaction-score">${a.satisfaction}</div>
         <div class="satisfaction-stars">${'⭐'.repeat(Math.round(a.satisfaction))}</div>
         <div class="satisfaction-label">Basé sur ${a.reviewsCount} avis client(s)</div>`
      : emptyBlock('Pas encore d\'avis clients');

    const el = $('#analytics-top-products');
    if (!a.topProducts.length) {
      el.innerHTML = emptyBlock('Aucune vente enregistrée');
      return;
    }
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
      t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#D4AF37;color:#121212;padding:12px 24px;border-radius:8px;font-weight:600;z-index:999;transition:0.3s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  function addDeliverer() {
    const name = prompt('Nom du livreur :');
    if (!name) return;
    const phone = prompt('Téléphone du livreur :');
    if (!phone) return;
    const list = getDeliverers();
    list.push({ id: 'd' + Date.now(), name, phone, status: 'offline' });
    localStorage.setItem('sublime_deliverers', JSON.stringify(list));
    renderDeliverers();
    showAdminToast('Livreur ajouté');
  }

  function addPromotion() {
    const title = prompt('Titre de la promotion :');
    if (!title) return;
    const subtitle = prompt('Description :') || '';
    const list = getPromotions();
    list.push({ id: 'p' + Date.now(), title, subtitle, image: 'assets/image-acceuil.jpeg' });
    localStorage.setItem('sublime_promotions', JSON.stringify(list));
    renderPromotions();
    showAdminToast('Promotion ajoutée');
  }

  const sectionRenderers = {
    dashboard: () => { renderStats(); renderRecentOrders(); renderTopProducts(); },
    products: renderProducts,
    categories: renderCategories,
    orders: renderOrders,
    deliverers: renderDeliverers,
    clients: renderClients,
    promotions: renderPromotions,
    payments: renderPayments,
    analytics: renderAnalytics
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
  }

  async function initAdmin() {
    const loginScreen = $('#admin-login');
    const layout = $('.admin-layout');

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
        } catch (ex) {
          err.textContent = ex.message;
        }
      };
      return;
    }

    loginScreen.classList.add('hidden');
    layout.classList.remove('hidden');

    $$('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => { e.preventDefault(); showSection(link.dataset.section); });
    });
    $('#menu-toggle')?.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
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
    $('#btn-add-product')?.addEventListener('click', () => showAdminToast('Le catalogue est défini par le menu Sublime Food'));
    showSection('dashboard');
  }

  document.addEventListener('DOMContentLoaded', initAdmin);
})();
