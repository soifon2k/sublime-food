const Catalog = {
  async requestOrdersFromServer() {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch {
      // ignore
    }
    return null;
  },

  mergeOrders(localOrders, serverOrders) {
    const merged = new Map();
    serverOrders.forEach(order => {
      if (order?.id) merged.set(order.id, order);
    });
    localOrders.forEach(order => {
      if (!order?.id) return;
      if (!merged.has(order.id)) merged.set(order.id, order);
    });
    return Array.from(merged.values()).sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  },

  ordersEqual(a, b) {
    if (a.length !== b.length) return false;
    const aIds = a.map(o => o.id).sort();
    const bIds = b.map(o => o.id).sort();
    return aIds.every((id, index) => id === bIds[index]);
  },

  async syncOrderToServer(order) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async updateOrderOnServer(id, updates) {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteOrderOnServer(id) {
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getOrders() {
    const localOrders = JSON.parse(localStorage.getItem('sublime_orders') || '[]');
    const serverOrders = await this.requestOrdersFromServer();
    if (Array.isArray(serverOrders)) {
      const merged = this.mergeOrders(localOrders, serverOrders);
      localStorage.setItem('sublime_orders', JSON.stringify(merged));
      return merged;
    }
    return localOrders;
  },

  async saveOrders(orders) {
    localStorage.setItem('sublime_orders', JSON.stringify(orders));
  },

  async updateOrder(id, updates) {
    const orders = await this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
      await this.saveOrders(orders);
      await this.updateOrderOnServer(id, orders[idx]);
    }
    return orders[idx];
  },

  async deleteOrder(id) {
    const orders = (await this.getOrders()).filter(o => o.id !== id);
    await this.saveOrders(orders);
    await this.deleteOrderOnServer(id);
  },

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
