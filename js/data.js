const SUBLIME_DATA = {
  brand: {
    name: 'SUBLIME FOOD',
    slogan: "Le goût de l'excellence à chaque bouchée.",
    phone: ['0822624705', '0839297545'],
    whatsapp: ['0822624705', '0839297545']
  },
  promoCodes: {},
  deliveryFee: 0,
  tvaRate: 0.16,
  categories: [
    { id: 'plats', name: 'Plats principaux', icon: '🍗' },
    { id: 'accompagnements', name: 'Accompagnements', icon: '🍟' },
    { id: 'desserts', name: 'Desserts & Pâtisserie', icon: '🎂' },
    { id: 'boissons', name: 'Boissons', icon: '🥤' }
  ],
  products: [
    { id: 'pf-4', name: 'Poulet frit - 4 morceaux', category: 'plats', price: 12000, image: 'assets/image-menu.png' },
    { id: 'pf-6', name: 'Poulet frit - 6 morceaux', category: 'plats', price: 18000, image: 'assets/image-menu.png' },
    { id: 'pf-8', name: 'Poulet frit - 8 morceaux', category: 'plats', price: 24000, image: 'assets/image-menu.png' },
    { id: 'pr-q', name: 'Poulet rôti - Quart', category: 'plats', price: 6000, image: 'assets/image-menu.png' },
    { id: 'pr-d', name: 'Poulet rôti - Demi', category: 'plats', price: 12000, image: 'assets/image-menu.png' },
    { id: 'pr-e', name: 'Poulet rôti - Entier', category: 'plats', price: 24000, image: 'assets/image-menu.png' },
    { id: 'tv-l', name: 'Tacos viande - Taille L', category: 'plats', price: 22000, image: 'assets/image-menu.png' },
    { id: 'tv-m', name: 'Tacos viande - Taille M', category: 'plats', price: 17000, image: 'assets/image-menu.png' },
    { id: 'tp-l', name: 'Tacos poulet - Taille L', category: 'plats', price: 15000, image: 'assets/image-menu.png' },
    { id: 'tp-m', name: 'Tacos poulet - Taille M', category: 'plats', price: 12000, image: 'assets/image-menu.png' },
    { id: 'hb-v', name: 'Hamburger viande', category: 'plats', price: 8000, image: 'assets/image-menu.png' },
    { id: 'sw-v', name: 'Shawarma viande', category: 'plats', price: 7500, image: 'assets/image-menu.png' },
    { id: 'sw-p', name: 'Shawarma poulet', category: 'plats', price: 6000, image: 'assets/image-menu.png' },
    { id: 'sm-v', name: 'Samoussa viande', category: 'plats', price: 1500, image: 'assets/image-menu.png' },
    { id: 'sm-p', name: 'Samoussa poulet', category: 'plats', price: 1000, image: 'assets/image-menu.png' },
    { id: 'pb', name: 'Pâtes bolognaises', category: 'plats', price: 3500, image: 'assets/image-menu.png' },
    { id: 'acc-sal', name: 'Salade', category: 'accompagnements', price: 1500, image: 'assets/image-menu.png' },
    { id: 'acc-fri', name: 'Frites', category: 'accompagnements', price: 2500, image: 'assets/image-menu.png' },
    { id: 'acc-ban', name: 'Bananes plantains', category: 'accompagnements', price: 2000, image: 'assets/image-menu.png' },
    { id: 'acc-boul', name: 'Boulettes de viande', category: 'accompagnements', price: 1500, image: 'assets/image-menu.png' },
    { id: 'gt-n', name: "Gâteau d'anniversaire - Normal", category: 'desserts', price: 25000, priceNote: '20 000 à 30 000 FC', image: 'assets/image-menu.png' },
    { id: 'gt-p', name: "Gâteau d'anniversaire - Personnalisé", category: 'desserts', price: 35000, priceNote: '20 à 50 USD', image: 'assets/image-menu.png' },
    { id: 'cup', name: 'Cupcakes', category: 'desserts', price: 1500, image: 'assets/image-menu.png' },
    { id: 'ck-bl', name: 'Cookies - Chocolat blanc', category: 'desserts', price: 2000, image: 'assets/image-menu.png' },
    { id: 'ck-no', name: 'Cookies - Chocolat noir', category: 'desserts', price: 2000, image: 'assets/image-menu.png' },
    { id: 'gf-ch', name: 'Gaufres - Chocolat', category: 'desserts', price: 4000, image: 'assets/image-menu.png' },
    { id: 'gf-sp', name: 'Gaufres - Spéculoos', category: 'desserts', price: 5000, image: 'assets/image-menu.png' },
    { id: 'cr-nu', name: 'Crêpes - Nutella', category: 'desserts', price: 5000, image: 'assets/image-menu.png' },
    { id: 'cr-or', name: 'Crêpes - Chocolat + Oreo', category: 'desserts', price: 6500, image: 'assets/image-menu.png' },
    { id: 'cc', name: 'Coca-Cola', category: 'boissons', price: 3000, image: 'assets/image-menu.png' },
    { id: 'fa', name: 'Fanta', category: 'boissons', price: 3000, image: 'assets/image-menu.png' },
    { id: 'sp', name: 'Sprite', category: 'boissons', price: 3000, image: 'assets/image-menu.png' },
    { id: 'ea', name: 'Eau minérale', category: 'boissons', price: 500, image: 'assets/image-menu.png' }
  ],
  paymentMethods: [
    { id: 'mobile-money', name: 'Mobile Money', icon: '📱' },
    { id: 'orange', name: 'Orange Money', icon: '🟠' },
    { id: 'airtel', name: 'Airtel Money', icon: '🔴' },
    { id: 'mpesa', name: 'M-Pesa', icon: '💚' },
    { id: 'visa', name: 'Visa', icon: '💳' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️' },
    { id: 'cash', name: 'Paiement à la livraison', icon: '💵' }
  ],
  loyaltyBadges: [
    { id: 'bronze', name: 'Bronze', minPoints: 0, color: '#CD7F32' },
    { id: 'silver', name: 'Argent', minPoints: 500, color: '#C0C0C0' },
    { id: 'gold', name: 'Or', minPoints: 1500, color: '#D4AF37' },
    { id: 'platinum', name: 'Platine VIP', minPoints: 5000, color: '#E5E4E2' }
  ],
  loyaltyRewards: [
    { id: 'r1', name: 'Réduction VIP', points: 500, description: 'Réduction sur votre prochaine commande' },
    { id: 'r2', name: 'Récompense fidélité', points: 1000, description: 'Avantage réservé aux clients fidèles' },
    { id: 'r3', name: 'Badge Or', points: 1500, description: 'Accès aux offres VIP' }
  ],
  deliveryStatuses: [
    { id: 'received', label: 'Commande reçue', icon: '📋' },
    { id: 'preparing', label: 'En préparation', icon: '👨‍🍳' },
    { id: 'onway', label: 'En route', icon: '🛵' },
    { id: 'delivered', label: 'Livrée', icon: '✅' }
  ]
};
