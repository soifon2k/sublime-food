const Catalog = {
  orderId(id) {
    return id == null ? '' : String(id);
  },

  getDeletedOrderIds() {
    try {
      const saved = JSON.parse(localStorage.getItem('sublime_deleted_order_ids') || '[]');
      return Array.isArray(saved) ? saved.map((id) => this.orderId(id)).filter(Boolean) : [];
    } catch {
      return [];
    }
  },

  markOrderDeleted(id) {
    const orderId = this.orderId(id);
    if (!orderId) return;
    const deleted = this.getDeletedOrderIds();
    if (!deleted.includes(orderId)) {
      deleted.push(orderId);
      localStorage.setItem('sublime_deleted_order_ids', JSON.stringify(deleted));
    }
  },

  filterDeletedOrders(orders) {
    const deletedIds = new Set(this.getDeletedOrderIds());
    if (!Array.isArray(orders)) return [];
    return orders.filter((order) => order?.id && !deletedIds.has(this.orderId(order.id)));
  },

  getStoredOrders() {
    try {
      const saved = JSON.parse(localStorage.getItem('sublime_orders') || '[]');
      return this.filterDeletedOrders(Array.isArray(saved) ? saved : []);
    } catch {
      return [];
    }
  },

  normalizeOrders(orders) {
    if (!Array.isArray(orders)) return [];
    return orders.filter(Boolean).sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  },

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

  pickNewerOrder(a, b) {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return aTime >= bTime ? { ...b, ...a } : { ...a, ...b };
  },

  mergeOrders(localOrders, serverOrders) {
    const merged = new Map();
    const normalizedServer = this.normalizeOrders(this.filterDeletedOrders(serverOrders));
    const normalizedLocal = this.normalizeOrders(this.filterDeletedOrders(localOrders));

    const upsert = (order) => {
      if (!order?.id) return;
      const key = this.orderId(order.id);
      if (merged.has(key)) {
        merged.set(key, this.pickNewerOrder(merged.get(key), order));
      } else {
        merged.set(key, order);
      }
    };

    normalizedServer.forEach(upsert);
    normalizedLocal.forEach(upsert);

    return Array.from(merged.values()).sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  },

  ordersEqual(a, b) {
    if (a.length !== b.length) return false;
    const mapB = new Map(b.map((order) => [this.orderId(order.id), order]));
    return a.every((order) => {
      const other = mapB.get(this.orderId(order.id));
      if (!other) return false;
      const stamp = (entry) => entry.updatedAt || entry.createdAt || '';
      return stamp(order) === stamp(other);
    });
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

  async syncOrdersToServer(orders) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: this.normalizeOrders(orders),
          deletedOrderIds: this.getDeletedOrderIds()
        })
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
    const localOrders = this.getStoredOrders();
    const serverOrders = await this.requestOrdersFromServer();

    if (!Array.isArray(serverOrders)) {
      return localOrders;
    }

    const merged = this.mergeOrders(localOrders, serverOrders);
    const serverSnapshot = this.normalizeOrders(this.filterDeletedOrders(serverOrders));

    await this.saveOrders(merged);

    if (!this.ordersEqual(merged, serverSnapshot)) {
      await this.syncOrdersToServer(merged);
    }

    return merged;
  },

  async saveOrders(orders) {
    const normalized = this.normalizeOrders(this.filterDeletedOrders(orders));
    localStorage.setItem('sublime_orders', JSON.stringify(normalized));
  },

  async updateOrder(id, updates) {
    const orderId = this.orderId(id);
    const orders = await this.getOrders();
    const idx = orders.findIndex((order) => this.orderId(order.id) === orderId);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
      await this.saveOrders(orders);
      await this.updateOrderOnServer(id, orders[idx]);
    }
    return orders[idx];
  },

  async deleteOrder(id) {
    const orderId = this.orderId(id);
    this.markOrderDeleted(orderId);

    const orders = this.getStoredOrders().filter((order) => this.orderId(order.id) !== orderId);
    await this.saveOrders(orders);
    await this.deleteOrderOnServer(orderId);
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
