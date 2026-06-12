const Cart = {
  STORAGE_KEY: 'sublime_cart',

  getItems() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; } catch { return []; }
  },

  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  },

  add(product, qty = 1) {
    const items = this.getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) { existing.qty += qty; } else { items.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty }); }
    this.saveItems(items);
    return items;
  },

  remove(productId) {
    const items = this.getItems().filter(i => i.id !== productId);
    this.saveItems(items);
    return items;
  },

  updateQty(productId, qty) {
    const items = this.getItems();
    const item = items.find(i => i.id === productId);
    if (item) {
      if (qty <= 0) return this.remove(productId);
      item.qty = qty;
    }
    this.saveItems(items);
    return items;
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  count() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  calculate(promoCode) {
    const subtotal = this.subtotal();
    const promo = promoCode ? SUBLIME_DATA.promoCodes[promoCode.toUpperCase()] : null;
    const discount = promo ? Math.round(subtotal * promo.discount) : 0;
    const afterDiscount = subtotal - discount;
    const tva = Math.round(afterDiscount * SUBLIME_DATA.tvaRate);
    const delivery = subtotal > 0 ? SUBLIME_DATA.deliveryFee : 0;
    const total = afterDiscount + tva + delivery;
    return { subtotal, discount, promo, tva, delivery, total };
  },

  formatPrice(amount) {
    return amount.toLocaleString('fr-FR') + ' FC';
  }
};
