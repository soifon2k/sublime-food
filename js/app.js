(function () {
  'use strict';

  const state = {
    screen: 'landing',
    catalogFilter: 'all',
    currentProduct: null,
    checkoutStep: 1,
    promoCode: '',
    selectedPayment: null,
    activeOrder: null,
    notifications: [],
    searchQuery: '',
    chatHistory: [],
    chatReady: false,
    socialProvider: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function formatPrice(n) { return n.toLocaleString('fr-FR') + ' FC'; }

  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show');
    setTimeout(() => { t.classList.add('hidden'); t.classList.remove('show'); }, 3000);
  }

  function navigate(screen, opts = {}) {
    if (screen !== 'tracking' && state._trackPoll) {
      clearInterval(state._trackPoll);
      state._trackPoll = null;
    }
    state.screen = screen;
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $(`#screen-${screen}`);
    if (el) el.classList.add('active');

    const showNav = ['home', 'catalog', 'cart', 'chat', 'profile', 'loyalty', 'notifications'].includes(screen);
    const showBack = ['product', 'cart', 'checkout', 'tracking', 'forgot', 'otp', 'loyalty', 'notifications'].includes(screen);
    $('#bottom-nav').classList.toggle('hidden', !showNav);
    $('#btn-back').hidden = !showBack;
    $('#header-logo').style.display = showBack ? 'none' : 'block';
    $('#header-title').textContent = getScreenTitle(screen);

    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === screen));

    const renderers = {
      landing: renderLanding, home: renderHome, catalog: renderCatalog,
      product: () => renderProduct(state.currentProduct),
      cart: renderCart, checkout: renderCheckout, tracking: renderTracking,
      notifications: renderNotifications, profile: renderProfile, loyalty: renderLoyalty,
      otp: renderOtp, chat: () => { if (!state.chatReady) initChat(); }
    };
    if (renderers[screen]) renderers[screen]();

    if (opts.scrollTop !== false) window.scrollTo(0, 0);
  }

  function getScreenTitle(s) {
    const titles = { landing: 'SUBLIME FOOD', home: 'Accueil', catalog: 'Menu', cart: 'Panier', checkout: 'Commande', tracking: 'Suivi', notifications: 'Notifications', chat: 'Support', profile: 'Profil', loyalty: 'Fidélité', auth: 'Connexion', forgot: 'Mot de passe', otp: 'Vérification' };
    return titles[s] || 'SUBLIME FOOD';
  }

  function getReviews(productId) {
    const all = JSON.parse(localStorage.getItem('sublime_reviews') || '[]');
    return productId ? all.filter(r => r.productId === productId) : all;
  }

  function getPromotions() {
    return Catalog.getPromotions();
  }

  function getProducts() { return Catalog.getProducts(); }
  function getCategories() { return Catalog.getCategories(); }

  function needsCompanyInfo(pmId) {
    const pm = SUBLIME_DATA.paymentMethods.find(m => m.id === pmId);
    return pm && (pm.needsCompanyInfo || pm.id === 'physical');
  }

  function companyPaymentHTML(mode) {
    const b = SUBLIME_DATA.brand;
    const acc = b.companyAccounts;
    const physical = mode === 'physical';
    return `<div class="company-payment-box">
      <h4>${physical ? '🏪 Paiement en boutique' : '💳 Payer via le compte Sublime Food'}</h4>
      <p>${physical ? 'Rendez-vous chez Sublime Food ou payez via nos numéros entreprise :' : 'Effectuez votre paiement à l\'un de nos numéros entreprise :'}</p>
      <div class="company-nums">
        <a href="tel:0822624705" class="company-num">📞 0822624705</a>
        <a href="tel:0839297545" class="company-num">📞 0839297545</a>
      </div>
      <div class="company-accounts">
        <p>Orange Money : <strong>${acc.orangeMoney}</strong></p>
        <p>Airtel Money : <strong>${acc.airtelMoney}</strong></p>
      </div>
      <p class="company-wa">WhatsApp : <a href="https://wa.me/243839297545" target="_blank" rel="noopener">0839297545</a> · <a href="https://wa.me/243822624705" target="_blank" rel="noopener">0822624705</a></p>
      <p class="company-social">Facebook : <strong>${b.facebook}</strong> · Instagram : <strong>${b.instagram}</strong></p>
      <p class="company-note">${acc.note}</p>
      <p class="company-note"><em>Après paiement et confirmation par l'admin, votre commande sera préparée.</em></p>
    </div>`;
  }

  const imgFallback = () => SUBLIME_DATA.imageFallback || 'assets/image-menu.png';

  function productCardHTML(p) {
    const price = p.priceNote ? formatPrice(p.price) : formatPrice(p.price);
    const fb = imgFallback();
    return `<div class="product-card" data-id="${p.id}">
      <img class="product-card-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
      <div class="product-card-body">
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-price">${price}</div>
      </div>
    </div>`;
  }

  function renderCategories(container, clickable) {
    const el = $(container);
    if (!el) return;
    el.innerHTML = getCategories().map(c => `
      <div class="category-card" data-cat="${c.id}">
        ${c.image ? `<img class="cat-img" src="${c.image}" alt="${c.name}" onerror="this.style.display='none'">` : ''}
        <div class="cat-icon">${c.icon}</div>
        <div class="cat-name">${c.name}</div>
      </div>`).join('');
    if (clickable) {
      el.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
          state.catalogFilter = card.dataset.cat;
          navigate('catalog');
        });
      });
    }
  }

  function renderProducts(container, products) {
    const el = $(container);
    if (!el) return;
    el.innerHTML = products.map(p => productCardHTML(p)).join('');
    el.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => openProduct(card.dataset.id));
    });
  }

  function renderLanding() {
    $('#promo-banner').innerHTML = `
      <div class="promo-icon">✨</div>
      <div><strong>${SUBLIME_DATA.brand.name}</strong><span> — ${SUBLIME_DATA.brand.slogan}</span></div>`;
    renderCategories('#landing-categories', true);
    renderProducts('#landing-popular', getProducts().slice(0, 6));
    const promos = getPromotions();
    $('#landing-promos').innerHTML = promos.length ? promos.map(p => `
      <div class="promo-card"><img src="${p.image || 'assets/image-acceuil.jpeg'}" alt="${p.title}"><div class="promo-card-info">
        <h4>${p.title}</h4><p>${p.subtitle || ''}</p></div></div>`).join('')
      : '<p style="color:#888;text-align:center;padding:20px">Aucune promotion active pour le moment</p>';
    const reviews = getReviews();
    $('#landing-testimonials').innerHTML = reviews.length ? reviews.slice(0, 5).map(t => `
      <div class="testimonial"><div class="testimonial-header">
        <div class="testimonial-avatar">${(t.userName || 'C').charAt(0).toUpperCase()}</div>
        <div><strong>${t.userName || 'Client'}</strong><div class="testimonial-stars">${'⭐'.repeat(t.rating)}</div></div>
      </div><p class="testimonial-text">${t.text}</p></div>`).join('')
      : '<p style="color:#888;text-align:center;padding:20px">Aucun avis client pour le moment. Soyez le premier à laisser un avis !</p>';
  }

  function renderHome() {
    renderCategories('#home-categories', true);
    let products = getProducts();
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q));
    }
    renderProducts('#home-popular', products.slice(0, 6));
    renderProducts('#home-recommended', products.slice(6, 10));
    const promos = getPromotions();
    $('#home-promos').innerHTML = promos.length ? promos.map(p => `
      <div class="promo-card"><img src="${p.image || 'assets/image-acceuil.jpeg'}" alt="${p.title}"><div class="promo-card-info">
        <h4>${p.title}</h4><p>${p.subtitle || ''}</p></div></div>`).join('')
      : '<p style="color:#888;text-align:center;padding:20px">Aucune promotion active</p>';
    renderProducts('#home-new', products.slice(-4));
  }

  function renderCatalog() {
    const filters = [{ id: 'all', name: 'Tout' }, ...getCategories().map(c => ({ id: c.id, name: c.name }))];
    $('#catalog-filters').innerHTML = filters.map(f =>
      `<button class="filter-chip ${state.catalogFilter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.name}</button>`).join('');
    $('#catalog-filters').querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => { state.catalogFilter = chip.dataset.filter; renderCatalog(); });
    });
    let products = getProducts();
    if (state.catalogFilter !== 'all') products = products.filter(p => p.category === state.catalogFilter);
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q));
    }
    const grid = $('#catalog-products');
    grid.className = 'products-grid';
    grid.innerHTML = products.map(p => productCardHTML(p)).join('');
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => openProduct(card.dataset.id));
    });
  }

  function openProduct(id) {
    state.currentProduct = Catalog.getProduct(id);
    navigate('product');
  }

  function renderProduct(p) {
    if (!p) return;
    const isFav = Auth.isFavorite(p.id);
    const reviews = getReviews(p.id);
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
    const priceDisplay = p.priceNote ? `${formatPrice(p.price)} <small style="color:#888">(${p.priceNote})</small>` : formatPrice(p.price);
    $('#product-detail').innerHTML = `
      <img class="product-detail-img" src="${p.image}" alt="${p.name}" onerror="this.onerror=null;this.src='${imgFallback()}'">
      <div class="product-detail">
        <h2>${p.name}</h2>
        ${avgRating ? `<div class="product-detail-rating">⭐ ${avgRating} · ${reviews.length} avis</div>` : ''}
        <div class="product-detail-price">${priceDisplay}</div>
        <div class="product-actions">
          <div class="qty-control">
            <button class="qty-btn" id="pd-minus">−</button>
            <span class="qty-value" id="pd-qty">1</span>
            <button class="qty-btn" id="pd-plus">+</button>
          </div>
          <button class="fav-btn ${isFav ? 'active' : ''}" id="pd-fav">${isFav ? '❤️' : '🤍'}</button>
          <button class="btn btn-primary" id="pd-add" style="flex:1">Ajouter au panier</button>
        </div>
        <div class="product-reviews">
          <h3>Avis clients</h3>
          ${reviews.length ? reviews.map(r => `<div class="review-item">${'⭐'.repeat(r.rating)} "${r.text}" — ${r.userName || 'Client'}</div>`).join('') : '<p style="color:#888">Aucun avis pour ce produit.</p>'}
          ${Auth.isLoggedIn() ? `<div class="form-group" style="margin-top:16px"><label>Votre avis</label>
            <select id="review-rating"><option value="5">5 étoiles</option><option value="4">4 étoiles</option><option value="3">3 étoiles</option><option value="2">2 étoiles</option><option value="1">1 étoile</option></select>
            <textarea id="review-text" rows="2" placeholder="Partagez votre expérience..." style="margin-top:8px;width:100%"></textarea>
            <button class="btn btn-secondary btn-sm" id="btn-add-review" style="margin-top:8px">Publier mon avis</button></div>` : ''}
        </div>
      </div>`;

    let qty = 1;
    $('#pd-minus').onclick = () => { if (qty > 1) { qty--; $('#pd-qty').textContent = qty; } };
    $('#pd-plus').onclick = () => { qty++; $('#pd-qty').textContent = qty; };
    $('#pd-fav').onclick = () => {
      if (!Auth.isLoggedIn()) { showToast('Connectez-vous pour ajouter aux favoris'); navigate('auth'); return; }
      const fav = Auth.toggleFavorite(p.id);
      $('#pd-fav').classList.toggle('active', fav);
      $('#pd-fav').textContent = fav ? '❤️' : '🤍';
      showToast(fav ? 'Ajouté aux favoris' : 'Retiré des favoris');
    };
    $('#pd-add').onclick = () => {
      Cart.add(p, qty);
      updateCartBadge();
      showToast(`${p.name} ajouté au panier`);
    };
    const reviewBtn = $('#btn-add-review');
    if (reviewBtn) reviewBtn.onclick = () => {
      const text = $('#review-text').value.trim();
      if (!text) { showToast('Écrivez votre avis'); return; }
      const all = JSON.parse(localStorage.getItem('sublime_reviews') || '[]');
      const user = Auth.getUser();
      all.push({ productId: p.id, productName: p.name, rating: +$('#review-rating').value, text, userName: user.name, date: new Date().toISOString() });
      localStorage.setItem('sublime_reviews', JSON.stringify(all));
      showToast('Avis publié');
      renderProduct(p);
    };
  }

  function renderCart() {
    const items = Cart.getItems();
    const calc = Cart.calculate(state.promoCode);
    if (!items.length) {
      $('#cart-content').innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><h3>Votre panier est vide</h3><p style="color:#888;margin:8px 0 20px">Découvrez nos délicieux plats</p><button class="btn btn-primary" id="cart-go-menu">Voir le menu</button></div>`;
      $('#cart-go-menu').onclick = () => navigate('catalog');
      return;
    }
    $('#cart-content').innerHTML = `
      ${items.map(i => `<div class="cart-item" data-id="${i.id}">
        <img class="cart-item-img" src="${i.image}" alt="${i.name}" onerror="this.onerror=null;this.src='${imgFallback()}'">
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-price">${formatPrice(i.price)}</div>
          <div class="cart-item-actions">
            <div class="qty-control"><button class="qty-btn cart-minus" data-id="${i.id}">−</button>
            <span class="qty-value">${i.qty}</span><button class="qty-btn cart-plus" data-id="${i.id}">+</button></div>
            <button class="cart-item-remove" data-id="${i.id}">Supprimer</button>
          </div>
        </div>
      </div>`).join('')}
      <div class="promo-input-group">
        <input type="text" id="promo-input" placeholder="Code promo" value="${state.promoCode}">
        <button class="btn btn-secondary btn-sm" id="apply-promo">Appliquer</button>
      </div>
      <div class="cart-summary">
        <div class="cart-summary-row"><span>Sous-total</span><span>${formatPrice(calc.subtotal)}</span></div>
        ${calc.discount ? `<div class="cart-summary-row"><span>Réduction (${calc.promo.label})</span><span>-${formatPrice(calc.discount)}</span></div>` : ''}
        <div class="cart-summary-row"><span>TVA (16%)</span><span>${formatPrice(calc.tva)}</span></div>
        <div class="cart-summary-row"><span>Livraison</span><span>${formatPrice(calc.delivery)}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>${formatPrice(calc.total)}</span></div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" id="btn-checkout">Passer la commande</button>`;

    $$('.cart-minus').forEach(b => b.onclick = () => { const item = items.find(i => i.id === b.dataset.id); Cart.updateQty(b.dataset.id, item.qty - 1); updateCartBadge(); renderCart(); });
    $$('.cart-plus').forEach(b => b.onclick = () => { const item = items.find(i => i.id === b.dataset.id); Cart.updateQty(b.dataset.id, item.qty + 1); updateCartBadge(); renderCart(); });
    $$('.cart-item-remove').forEach(b => b.onclick = () => { Cart.remove(b.dataset.id); updateCartBadge(); renderCart(); });
    $('#apply-promo').onclick = () => {
      state.promoCode = $('#promo-input').value.trim();
      const calc2 = Cart.calculate(state.promoCode);
      if (state.promoCode && !calc2.promo) showToast('Code promo invalide');
      else showToast(calc2.promo ? 'Code promo appliqué !' : 'Code retiré');
      renderCart();
    };
    $('#btn-checkout').onclick = () => {
      if (!Auth.isLoggedIn()) { showToast('Connectez-vous pour commander'); navigate('auth'); return; }
      state.checkoutStep = 1;
      navigate('checkout');
    };
  }

  function renderCheckout() {
    const steps = $$('.step');
    steps.forEach(s => {
      const n = +s.dataset.step;
      s.classList.toggle('active', n === state.checkoutStep);
      s.classList.toggle('done', n < state.checkoutStep);
    });
    const calc = Cart.calculate(state.promoCode);
    const panels = [
      `<div class="checkout-panel"><h3 style="color:var(--gold);margin-bottom:16px">Adresse de livraison</h3>
        <div class="form-group"><label>Nom complet</label><input type="text" id="co-name" value="${Auth.getUser()?.name || ''}"></div>
        <div class="form-group"><label>Adresse</label><input type="text" id="co-address" placeholder="Quartier, avenue, numéro..."></div>
        <div class="form-group"><label>Téléphone</label><input type="tel" id="co-phone" value="${Auth.getUser()?.phone || ''}"></div>
        <button class="btn btn-primary btn-block" id="co-next1">Continuer</button></div>`,
      `<div class="checkout-panel"><h3 style="color:var(--gold);margin-bottom:16px">Mode de livraison</h3>
        <div class="delivery-banner"><div class="delivery-icon">🛵</div><div><strong>Livraison rapide</strong><p>30-45 min · Suivi en temps réel</p></div></div>
        <button class="btn btn-primary btn-block" style="margin-top:16px" id="co-next2">Continuer</button></div>`,
      `<div class="checkout-panel"><h3 style="color:var(--gold);margin-bottom:16px">Mode de paiement</h3>
        <div class="payment-methods">${SUBLIME_DATA.paymentMethods.map(pm =>
          `<div class="payment-method ${state.selectedPayment === pm.id ? 'selected' : ''}" data-pm="${pm.id}">
            <span class="pm-icon">${pm.icon}</span>${pm.name}</div>`).join('')}</div>
        <div id="company-pay-info">${needsCompanyInfo(state.selectedPayment) ? companyPaymentHTML(state.selectedPayment) : ''}</div>
        <div class="cart-summary" style="margin-top:16px">
          <div class="cart-summary-row total"><span>Total à payer</span><span>${formatPrice(calc.total)}</span></div>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:16px" id="co-next3">Valider la commande ${formatPrice(calc.total)}</button></div>`,
      `<div class="checkout-panel order-confirm"><div class="order-confirm-icon">⏳</div>
        <h2>Commande enregistrée !</h2>
        <p style="color:#888;margin:12px 0">Commande <strong>#${state.activeOrder?.id || ''}</strong></p>
        <p style="margin-bottom:12px">Votre paiement est <strong>en attente de confirmation</strong> par Sublime Food.</p>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px">Une fois le paiement confirmé par l'administration, votre commande sera préparée et livrée (30-45 min).</p>
        <div class="company-payment-box" style="margin-bottom:16px;text-align:left">
          <p><strong>Besoin d'aide ?</strong></p>
          <p>📞 0822624705 · 0839297545</p>
          <p>💬 WhatsApp : 0839297545 · 0822624705</p>
        </div>
        <button class="btn btn-primary btn-block" id="co-track">Voir le statut</button>
        <button class="btn btn-secondary btn-block" style="margin-top:8px" id="co-home">Retour à l'accueil</button></div>`
    ];
    $('#checkout-content').innerHTML = panels[state.checkoutStep - 1];

    if (state.checkoutStep === 1) $('#co-next1').onclick = () => {
      if (!$('#co-address').value.trim()) { showToast('Veuillez entrer votre adresse'); return; }
      state.checkoutStep = 2; renderCheckout();
    };
    if (state.checkoutStep === 2) $('#co-next2').onclick = () => { state.checkoutStep = 3; renderCheckout(); };
    if (state.checkoutStep === 3) {
      $$('.payment-method').forEach(pm => pm.onclick = () => {
        state.selectedPayment = pm.dataset.pm;
        renderCheckout();
      });
      $('#co-next3').onclick = () => {
        if (!state.selectedPayment) { showToast('Choisissez un mode de paiement'); return; }
        placeOrder(calc);
      };
    }
    if (state.checkoutStep === 4) {
      $('#co-track').onclick = () => navigate('tracking');
      $('#co-home').onclick = () => navigate('home');
    }
  }

  function placeOrder(calc) {
    const user = Auth.getUser();
    const order = {
      id: 'CMD' + Date.now().toString().slice(-6),
      userId: user?.id,
      customerName: user?.name || $('#co-name')?.value || '',
      customerPhone: user?.phone || $('#co-phone')?.value || '',
      items: Cart.getItems(),
      total: calc.total,
      payment: state.selectedPayment,
      address: $('#co-address')?.value || '',
      paymentStatus: 'pending',
      status: 'awaiting_payment',
      statusIndex: 0,
      createdAt: new Date().toISOString(),
      deliverer: null
    };
    state.activeOrder = order;
    const orders = Catalog.getOrders();
    orders.unshift(order);
    Catalog.saveOrders(orders);
    Cart.clear();
    updateCartBadge();
    addNotification('⏳', 'Commande enregistrée', `Commande ${order.id} — en attente de confirmation du paiement.`);
    state.checkoutStep = 4;
    state.promoCode = '';
    renderCheckout();
  }

  function startTrackingSimulation(order) {
    const statuses = ['received', 'preparing', 'onway', 'delivered'];
    const messages = ['Commande reçue', 'En préparation', 'Le livreur est en route', 'Commande livrée !'];
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= statuses.length) { clearInterval(interval); return; }
      order.status = statuses[step];
      order.statusIndex = step;
      const orders = Catalog.getOrders();
      const idx = orders.findIndex(o => o.id === order.id);
      if (idx >= 0) { orders[idx] = order; Catalog.saveOrders(orders); }
      addNotification('🛵', messages[step], `Commande ${order.id} : ${messages[step]}`);
      if (state.screen === 'tracking') renderTracking();
    }, 8000);
  }

  function renderTracking() {
    const orders = Catalog.getOrders();
    const order = state.activeOrder || orders.find(o => o.paymentStatus === 'confirmed') || orders[0];
    if (!order) {
      $('#tracking-content').innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">📦</div><h3>Aucune commande en cours</h3><button class="btn btn-primary" style="margin-top:16px" onclick="navigate('catalog')">Commander</button></div>`;
      return;
    }
    if (order.paymentStatus === 'pending') {
      $('#tracking-content').innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">⏳</div>
        <h3>Paiement en attente</h3><p style="color:#888;margin:12px 0">Commande <strong>${order.id}</strong></p>
        <p style="margin-bottom:16px">Votre commande sera traitée après confirmation du paiement par Sublime Food.</p>
        ${companyPaymentHTML(order.payment)}
        <button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="navigate('home')">Retour</button></div>`;
      if (!state._trackPoll) {
        state._trackPoll = setInterval(() => {
          if (state.screen !== 'tracking') { clearInterval(state._trackPoll); state._trackPoll = null; return; }
          const fresh = Catalog.getOrders().find(o => o.id === order.id);
          if (fresh && fresh.paymentStatus !== 'pending') { clearInterval(state._trackPoll); state._trackPoll = null; state.activeOrder = fresh; renderTracking(); }
        }, 5000);
      }
      return;
    }
    if (order.paymentStatus === 'rejected') {
      $('#tracking-content').innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">❌</div>
        <h3>Paiement non confirmé</h3><p style="color:#888">Commande ${order.id} — contactez-nous au 0822624705</p></div>`;
      return;
    }
    const idx = order.statusIndex || 0;
    const eta = Math.max(5, 35 - idx * 10);
    $('#tracking-content').innerHTML = `
      <div class="tracking-eta"><p>Temps estimé</p><strong>${eta} min</strong></div>
      <div class="tracking-map"><div class="tracking-map-bg"></div>
        <div class="tracking-marker" style="left:${30 + idx * 15}%;top:${40 - idx * 5}%">🛵</div>
        <div class="tracking-marker" style="right:20%;bottom:20%">📍</div>
      </div>
      <p style="text-align:center;color:#888;margin-bottom:16px;font-size:0.85rem">Commande ${order.id} · Livreur : ${order.deliverer?.name || 'En attente d\'assignation'}</p>
      <div class="tracking-steps">${SUBLIME_DATA.deliveryStatuses.map((s, i) => `
        <div class="tracking-step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}">
          <div class="tracking-step-icon">${s.icon}</div>
          <div class="tracking-step-info"><strong>${s.label}</strong><span>${i <= idx ? 'Terminé' : 'En attente'}</span></div>
        </div>`).join('')}</div>`;
  }

  function addNotification(icon, title, body) {
    state.notifications.unshift({ icon, title, body, time: new Date().toISOString(), unread: true });
    localStorage.setItem('sublime_notifications', JSON.stringify(state.notifications));
    updateNotifBadge();
  }

  function loadNotifications() {
    state.notifications = JSON.parse(localStorage.getItem('sublime_notifications') || '[]');
  }

  function renderNotifications() {
    $('#notifications-list').innerHTML = state.notifications.map(n => `
      <div class="notification-item ${n.unread ? 'unread' : ''}">
        <div class="notification-icon">${n.icon}</div>
        <div class="notification-body"><strong>${n.title}</strong><p>${n.body}</p>
        <div class="notification-time">${new Date(n.time).toLocaleString('fr-FR')}</div></div>
      </div>`).join('') || '<p style="text-align:center;color:#888;padding:40px">Aucune notification</p>';
    state.notifications.forEach(n => n.unread = false);
    localStorage.setItem('sublime_notifications', JSON.stringify(state.notifications));
    updateNotifBadge();
  }

  function renderProfile() {
    const user = Auth.getUser();
    if (!user) { navigate('auth'); return; }
    const orders = Catalog.getOrders();
    const badge = SUBLIME_DATA.loyaltyBadges.filter(b => (user.points || 0) >= b.minPoints).pop();
    $('#profile-content').innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="profile-name">${user.name}</div>
        <div class="profile-email">${user.email}</div>
        <div style="margin-top:8px"><span class="promo-badge">${badge?.name || 'Bronze'} · ${user.points || 0} pts</span></div>
      </div>
      <div class="profile-menu">
        <button class="profile-menu-item" data-action="orders"><span class="pm-icon">📦</span> Historique commandes <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="favorites"><span class="pm-icon">❤️</span> Favoris <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="addresses"><span class="pm-icon">📍</span> Adresses <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="payments"><span class="pm-icon">💳</span> Paiements <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="loyalty"><span class="pm-icon">🏆</span> Programme fidélité <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="settings"><span class="pm-icon">⚙️</span> Paramètres <span class="pm-arrow">›</span></button>
        <button class="profile-menu-item" data-action="logout" style="color:var(--red)"><span class="pm-icon">🚪</span> Déconnexion</button>
      </div>
      <div id="profile-sub" style="margin-top:16px"></div>`;

    $$('.profile-menu-item').forEach(item => {
      item.onclick = () => {
        const action = item.dataset.action;
        if (action === 'logout') { Auth.logout(); showToast('Déconnecté'); navigate('landing'); return; }
        if (action === 'loyalty') { navigate('loyalty'); return; }
        if (action === 'orders') {
          const payLabel = { pending: '⏳ En attente', confirmed: '✅ Confirmé', rejected: '❌ Rejeté' };
          $('#profile-sub').innerHTML = `<h3 style="color:var(--gold);margin-bottom:12px">Mes commandes</h3>` +
            (orders.length ? orders.map(o => `<div class="order-history-item"><div class="order-id">${o.id}</div>
            <div class="order-date">${new Date(o.createdAt).toLocaleString('fr-FR')}</div>
            <div style="font-size:0.85rem;color:#888">${payLabel[o.paymentStatus] || o.paymentStatus}</div>
            <div class="order-total">${formatPrice(o.total)}</div></div>`).join('') : '<p style="color:#888">Aucune commande</p>');
        }
        if (action === 'favorites') {
          const favs = getProducts().filter(p => user.favorites?.includes(p.id));
          $('#profile-sub').innerHTML = `<h3 style="color:var(--gold);margin-bottom:12px">Mes favoris</h3>` +
            (favs.length ? `<div class="products-grid">${favs.map(p => productCardHTML(p)).join('')}</div>` : '<p style="color:#888">Aucun favori</p>');
          $('#profile-sub').querySelectorAll('.product-card').forEach(c => c.onclick = () => openProduct(c.dataset.id));
        }
        if (action === 'addresses') $('#profile-sub').innerHTML = `<h3 style="color:var(--gold);margin-bottom:12px">Mes adresses</h3><p style="color:#888">Aucune adresse enregistrée. Ajoutez-en lors de votre prochaine commande.</p>`;
        if (action === 'payments') $('#profile-sub').innerHTML = `<h3 style="color:var(--gold);margin-bottom:12px">Méthodes de paiement</h3>${SUBLIME_DATA.paymentMethods.map(pm => `<div class="profile-menu-item" style="margin-bottom:4px"><span class="pm-icon">${pm.icon}</span> ${pm.name}</div>`).join('')}`;
        if (action === 'settings') {
          const theme = document.documentElement.getAttribute('data-theme') || 'dark';
          $('#profile-sub').innerHTML = `<h3 style="color:var(--gold);margin-bottom:12px">Paramètres</h3>
            <div class="form-group"><label>Apparence</label>
              <select id="setting-theme"><option value="dark" ${theme === 'dark' ? 'selected' : ''}>Mode sombre</option><option value="light" ${theme === 'light' ? 'selected' : ''}>Mode clair</option></select>
            </div>
            <div class="form-group"><label>Notifications push</label><select><option>Activées</option><option>Désactivées</option></select></div>
            <div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="setting-password" placeholder="Laisser vide pour ne pas changer"></div>
            <button class="btn btn-primary btn-sm" id="btn-save-settings">Enregistrer</button>`;
          $('#setting-theme').onchange = (e) => setTheme(e.target.value);
          $('#btn-save-settings').onclick = () => {
            const pw = $('#setting-password').value;
            if (pw) Auth.updateProfile({ password: pw });
            showToast('Paramètres enregistrés');
          };
        }
      };
    });
  }

  function renderLoyalty() {
    const user = Auth.getUser();
    if (!user) { navigate('auth'); return; }
    const pts = user.points || 0;
    const currentBadge = SUBLIME_DATA.loyaltyBadges.filter(b => pts >= b.minPoints).pop();
    $('#loyalty-content').innerHTML = `
      <div class="loyalty-card"><div class="loyalty-points">${pts}</div><div>points fidélité</div>
        <div class="loyalty-badge-display">${currentBadge?.name || 'Bronze'}</div></div>
      <h3 style="color:var(--gold);margin-bottom:12px">Badges</h3>
      <div class="loyalty-badges">${SUBLIME_DATA.loyaltyBadges.map(b => `
        <div class="badge-item ${pts >= b.minPoints ? 'earned' : ''}"><div class="badge-icon">🏅</div><div style="font-size:0.8rem">${b.name}</div><div style="font-size:0.7rem;color:#888">${b.minPoints} pts</div></div>`).join('')}</div>
      <h3 style="color:var(--gold);margin-bottom:12px">Récompenses</h3>
      ${SUBLIME_DATA.loyaltyRewards.map(r => `
        <div class="reward-item"><div><strong>${r.name}</strong><div style="font-size:0.8rem;color:#888">${r.description} · ${r.points} pts</div></div>
        <button class="btn btn-sm ${pts >= r.points ? 'btn-primary' : 'btn-secondary'}" data-reward="${r.id}" ${pts < r.points ? 'disabled' : ''}>Échanger</button></div>`).join('')}`;
    $$('[data-reward]').forEach(btn => {
      if (!btn.disabled) btn.onclick = () => {
        const reward = SUBLIME_DATA.loyaltyRewards.find(r => r.id === btn.dataset.reward);
        Auth.updateProfile({ points: pts - reward.points });
        showToast(`Récompense "${reward.name}" échangée !`);
        renderLoyalty();
      };
    });
  }

  function renderOtp() {
    const pending = Auth.getPendingOtp();
    const hint = $('#otp-hint');
    if (pending?.localMode && pending?.otp) {
      hint.classList.remove('hidden');
      hint.innerHTML = `Code de vérification (SMS en attente de configuration) :<strong>${pending.otp}</strong>`;
      $('#otp-subtitle').textContent = `Entrez le code envoyé au ${pending.phone}`;
    } else if (pending?.phone) {
      hint.classList.add('hidden');
      $('#otp-subtitle').textContent = `Entrez le code à 6 chiffres envoyé au ${pending.phone}`;
    }
  }

  async function askAssistant(text) {
    const msgs = $('#chat-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot typing';
    typing.textContent = 'L\'assistant réfléchit...';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    state.chatHistory.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: state.chatHistory })
      });
      const data = await res.json();
      typing.remove();
      const reply = data.reply || 'Contactez-nous au 0822624705 pour une assistance immédiate.';
      state.chatHistory.push({ role: 'assistant', content: reply });
      msgs.innerHTML += `<div class="chat-msg bot">${reply}</div>`;
    } catch {
      typing.remove();
      const fallback = getLocalAdvice(text);
      state.chatHistory.push({ role: 'assistant', content: fallback });
      msgs.innerHTML += `<div class="chat-msg bot">${fallback}</div>`;
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function getLocalAdvice(text) {
    const m = text.toLowerCase();
    if (/commande|suivre/.test(m)) return 'Allez dans Profil → Historique commandes pour suivre votre commande, ou utilisez l\'écran Suivi.';
    if (/livraison|délai/.test(m)) return 'La livraison prend 30 à 45 minutes avec suivi GPS en temps réel.';
    if (/paiement|payer/.test(m)) return 'Payez via les numéros entreprise Sublime Food : 0822624705 ou 0839297545 (Orange Money / Airtel Money). WhatsApp : 0839297545. Après paiement, l\'admin confirme votre commande. Paiement physique en boutique aussi disponible.';
    if (/menu|plat|prix/.test(m)) return 'Consultez l\'onglet Menu pour voir tous nos plats et prix en FC.';
    return 'Pour une aide personnalisée, appelez le 0822624705 ou 0839297545 (WhatsApp disponible).';
  }

  function initChat() {
    if (state.chatReady) return;
    state.chatReady = true;
    const msgs = $('#chat-messages');
    msgs.innerHTML = `<div class="chat-msg bot">Bonjour ! Je suis l'assistant Sublime Food. Je peux vous conseiller sur vos commandes, la livraison, le menu et les paiements. Comment puis-je vous aider ?</div>`;

    function sendChat() {
      const input = $('#chat-input');
      const text = input.value.trim();
      if (!text) return;
      msgs.innerHTML += `<div class="chat-msg user">${escapeHtml(text)}</div>`;
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;
      askAssistant(text);
    }

    $('#btn-send-chat').onclick = sendChat;
    $('#chat-input').onkeydown = (e) => { if (e.key === 'Enter') sendChat(); };
    $$('.suggestion-chip').forEach(chip => {
      chip.onclick = () => { $('#chat-input').value = chip.dataset.msg; sendChat(); };
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateCartBadge() {
    const count = Cart.count();
    $('#cart-badge').textContent = count;
    $('#cart-badge').style.display = count ? 'flex' : 'none';
  }

  function updateNotifBadge() {
    const unread = state.notifications.filter(n => n.unread).length;
    $('#notif-badge').textContent = unread;
    $('#notif-badge').style.display = unread ? 'flex' : 'none';
  }

  function initAuth() {
    $$('.auth-tab').forEach(tab => tab.onclick = () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.auth-form').forEach(f => f.classList.remove('active'));
      $(`#form-${tab.dataset.auth}`).classList.add('active');
    });

    $('#form-login').onsubmit = (e) => {
      e.preventDefault();
      const res = Auth.login($('#login-email').value, $('#login-password').value);
      if (res.success) { showToast('Bienvenue ' + res.user.name + ' !'); navigate('home'); }
      else showToast(res.message);
    };

    $('#form-register').onsubmit = async (e) => {
      e.preventDefault();
      const res = await Auth.register($('#reg-name').value, $('#reg-email').value, $('#reg-phone').value, $('#reg-password').value);
      if (res.success) {
        showToast(res.message || 'Code OTP envoyé par SMS');
        navigate('otp');
        renderOtp();
      } else showToast(res.message);
    };

    $('#btn-google').onclick = () => openSocialModal('google');
    $('#btn-facebook').onclick = () => openSocialModal('facebook');
    $('#btn-forgot').onclick = () => navigate('forgot');
    $('#form-forgot').onsubmit = (e) => {
      e.preventDefault();
      const r = Auth.forgotPassword($('#forgot-email').value);
      showToast(r.message);
      if (r.success) setTimeout(() => navigate('auth'), 2000);
    };

    $$('.otp-digit').forEach((input, i, arr) => {
      input.oninput = () => { if (input.value && i < arr.length - 1) arr[i + 1].focus(); };
      input.onkeydown = (e) => { if (e.key === 'Backspace' && !input.value && i > 0) arr[i - 1].focus(); };
    });
    $('#form-otp').onsubmit = async (e) => {
      e.preventDefault();
      const code = [...$$('.otp-digit')].map(i => i.value).join('');
      const res = await Auth.verifyOtp(code);
      if (res.success) { showToast('Compte vérifié !'); navigate('home'); }
      else showToast(res.message);
    };
    $('#btn-resend-otp').onclick = async () => {
      const r = await Auth.resendOtp();
      showToast(r.message);
      renderOtp();
    };
  }

  function openSocialModal(provider) {
    state.socialProvider = provider;
    $('#social-modal-title').textContent = provider === 'google' ? 'Connexion Google' : 'Connexion Facebook';
    $('#social-modal').classList.remove('hidden');
  }

  function closeSocialModal() {
    $('#social-modal').classList.add('hidden');
    state.socialProvider = null;
  }

  function initSocialModal() {
    $('#social-cancel').onclick = closeSocialModal;
    $('#social-modal-backdrop').onclick = closeSocialModal;
    $('#social-form').onsubmit = (e) => {
      e.preventDefault();
      const res = Auth.socialLogin(state.socialProvider, {
        name: $('#social-name').value.trim(),
        email: $('#social-email').value.trim(),
        phone: $('#social-phone').value.trim()
      });
      if (res.success) {
        closeSocialModal();
        showToast('Bienvenue ' + res.user.name + ' !');
        navigate('home');
      }
    };
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sublime_theme', theme);
    $('#theme-icon').textContent = theme === 'light' ? '☀️' : '🌙';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#F5F5F5' : '#121212';
  }

  function initTheme() {
    const saved = localStorage.getItem('sublime_theme') || 'dark';
    setTheme(saved);
    $('#btn-theme').onclick = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  }

  function initEvents() {
    $('#btn-back').onclick = () => {
      const backMap = { product: 'catalog', cart: 'home', checkout: 'cart', tracking: 'home', forgot: 'auth', otp: 'auth', loyalty: 'profile', notifications: 'home' };
      navigate(backMap[state.screen] || 'home');
    };
    $('#btn-order-now').onclick = () => {
      if (Auth.isLoggedIn()) navigate('home');
      else navigate('auth');
    };
    $('#btn-cart-header').onclick = () => navigate('cart');
    $('#btn-notifications').onclick = () => navigate('notifications');
    $$('.nav-item').forEach(item => item.onclick = () => navigate(item.dataset.nav));
    $$('[data-nav]').forEach(el => el.onclick = () => navigate(el.dataset.nav));
    $('#search-input')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.screen === 'home') renderHome();
    });
    $('#search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { state.searchQuery = e.target.value; navigate('catalog'); }
    });
  }

  function initSplash() {
    setTimeout(() => {
      $('#splash').classList.add('fade-out');
      $('#app').classList.remove('hidden');
      if (Auth.isLoggedIn()) navigate('home');
      else navigate('landing');
    }, 2500);
  }

  window.navigate = navigate;

  document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    initTheme();
    initSplash();
    initAuth();
    initSocialModal();
    initEvents();
    updateCartBadge();
    updateNotifBadge();
  });
})();
