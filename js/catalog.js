const Catalog = {
  getCategories() {
    try {
      const saved = JSON.parse(localStorage.getItem('sublime_categories'));
      if (saved?.length) return saved;
    } catch { /* ignore */ }
    return [...SUBLIME_DATA.categories];
  },

  saveCategories(cats) {
    localStorage.setItem('sublime_categories', JSON.stringify(cats));
  },

  getProducts() {
    const overrides = JSON.parse(localStorage.getItem('sublime_product_overrides') || '{}');
    const deleted = JSON.parse(localStorage.getItem('sublime_deleted_products') || '[]');
    const extras = JSON.parse(localStorage.getItem('sublime_extra_products') || '[]');
    const reviews = JSON.parse(localStorage.getItem('sublime_reviews') || '[]');

    const products = [...SUBLIME_DATA.products, ...extras]
      .filter(p => !deleted.includes(p.id))
      .map(p => {
        const o = overrides[p.id] || {};
        const pr = reviews.filter(r => r.productId === p.id);
        const rating = pr.length ? +(pr.reduce((s, r) => s + r.rating, 0) / pr.length).toFixed(1) : null;
        return { ...p, ...o, rating, reviewCount: pr.length };
      });
    return products;
  },

  getProduct(id) {
    return this.getProducts().find(p => p.id === id);
  },

  saveProductOverride(id, data) {
    const overrides = JSON.parse(localStorage.getItem('sublime_product_overrides') || '{}');
    overrides[id] = { ...overrides[id], ...data };
    localStorage.setItem('sublime_product_overrides', JSON.stringify(overrides));
  },

  deleteProduct(id) {
    const deleted = JSON.parse(localStorage.getItem('sublime_deleted_products') || '[]');
    if (!deleted.includes(id)) deleted.push(id);
    localStorage.setItem('sublime_deleted_products', JSON.stringify(deleted));
  },

  addProduct(product) {
    const extras = JSON.parse(localStorage.getItem('sublime_extra_products') || '[]');
    extras.push(product);
    localStorage.setItem('sublime_extra_products', JSON.stringify(extras));
  },

  getOrders() {
    return JSON.parse(localStorage.getItem('sublime_orders') || '[]');
  },

  saveOrders(orders) {
    localStorage.setItem('sublime_orders', JSON.stringify(orders));
  },

  updateOrder(id, updates) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...updates };
      this.saveOrders(orders);
    }
    return orders[idx];
  },

  deleteOrder(id) {
    this.saveOrders(this.getOrders().filter(o => o.id !== id));
  },

  getUsers() {
    return JSON.parse(localStorage.getItem('sublime_users') || '[]');
  },

  deleteUser(id) {
    localStorage.setItem('sublime_users', JSON.stringify(this.getUsers().filter(u => u.id !== id)));
  },

  getDeliverers() {
    return JSON.parse(localStorage.getItem('sublime_deliverers') || '[]');
  },

  saveDeliverers(list) {
    localStorage.setItem('sublime_deliverers', JSON.stringify(list));
  },

  getPromotions() {
    return JSON.parse(localStorage.getItem('sublime_promotions') || '[]');
  },

  savePromotions(list) {
    localStorage.setItem('sublime_promotions', JSON.stringify(list));
  }
};
