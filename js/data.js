const IMG = {
  fallback: 'assets/image-menu.png',
  pouletFrit: 'menu photo/poulet roti.jpeg',
  pouletRoti: 'menu photo/poulet roti.jpeg',
  pouletRoti2: 'menu photo/poulet roti.jpeg',
  tacos: 'menu photo/tacos viande.jpeg',
  tacos2: 'menu photo/tacos viande.jpeg',
  tacosPoulet: 'menu photo/tacos poulet.jpeg',
  burger: 'menu photo/hamberger.jpg',
  shawarma: 'menu photo/shawarma viande.jpeg',
  shawarmaPoulet: 'menu photo/shawarma poulet.jpeg',
  samoussa: 'menu photo/tacos viande.jpeg',
  samoussa2: 'menu photo/tacos poulet.jpeg',
  pates: 'menu photo/plat fites.jpeg',
  salade: 'menu photo/salade.jpg',
  frites: 'menu photo/plat fites.jpeg',
  plantain: 'menu photo/banane plantain.jpeg',
  boulettes: 'menu photo/boulette de viande.jpeg',
  gateau: 'menu photo/gateau d\'anniversaire normal.jpeg',
  gateau2: 'menu photo/gateaux d\'anniversaire personnalisé .jpeg',
  cupcake: 'menu photo/cupcakes.jpeg',
  cookieBlanc: 'menu photo/cookies chocolat blanc.jpeg',
  cookieNoir: 'menu photo/cookies chocolat noir.jpeg',
  gaufreChoco: 'menu photo/gaufres chocolat.jpeg',
  gaufreSpec: 'menu photo/gaufres speculos.jpeg',
  crepeNutella: 'menu photo/crepes au nutela.jpeg',
  crepeOreo: 'menu photo/crepe chocolat oreo.jpeg',
  coca: 'menu photo/coca.jpg',
  fanta: 'menu photo/fanta.jpg',
  sprite: 'menu photo/sprite.jpg',
  eau: 'menu photo/eau mineral.jpg'
};
const SUBLIME_DATA = {
  brand: {
    name: 'SUBLIME FOOD',
    slogan: "Le goût de l'excellence à chaque bouchée.",
    phone: ['0822624705'],
    whatsapp: ['0822624705'],
    facebook: 'Sublime Food',
    instagram: 'Sublime Food',
    companyAccounts: {
      mpesa: '0822624705',
      note: 'Envoyez votre paiement via M-Pesa au 0822624705, puis attendez la confirmation de l\'administration.'
    }
  },  imageFallback: IMG.fallback,
  promoCodes: {},
  deliveryFee: 0,
  tvaRate: 0.16,
  categories: [
    { id: 'plats', name: 'Plats principaux', icon: '🍗', image: 'menu photo/plat fites.jpeg' },
    { id: 'accompagnements', name: 'Accompagnements', icon: '🍟', image: IMG.frites },
    { id: 'desserts', name: 'Desserts & Pâtisserie', icon: '🎂', image: IMG.gateau },
    { id: 'boissons', name: 'Boissons', icon: '🥤', image: IMG.coca }
  ],
  products: [
    { id: 'pf-4', name: 'Poulet frit - 4 morceaux', category: 'plats', price: 12000, image: IMG.pouletFrit },
    { id: 'pf-6', name: 'Poulet frit - 6 morceaux', category: 'plats', price: 18000, image: IMG.pouletFrit },
    { id: 'pf-8', name: 'Poulet frit - 8 morceaux', category: 'plats', price: 24000, image: IMG.pouletFrit },
    { id: 'pr-q', name: 'Poulet rôti - Quart', category: 'plats', price: 6000, image: IMG.pouletRoti2 },
    { id: 'pr-d', name: 'Poulet rôti - Demi', category: 'plats', price: 12000, image: IMG.pouletRoti2 },
    { id: 'pr-e', name: 'Poulet rôti - Entier', category: 'plats', price: 24000, image: IMG.pouletRoti },
    { id: 'tv-l', name: 'Tacos viande - Taille L', category: 'plats', price: 22000, image: IMG.tacos2 },
    { id: 'tv-m', name: 'Tacos viande - Taille M', category: 'plats', price: 17000, image: IMG.tacos },
    { id: 'tp-l', name: 'Tacos poulet - Taille L', category: 'plats', price: 15000, image: IMG.tacosPoulet },
    { id: 'tp-m', name: 'Tacos poulet - Taille M', category: 'plats', price: 12000, image: IMG.tacosPoulet },
    { id: 'hb-v', name: 'Hamburger viande', category: 'plats', price: 8000, image: IMG.burger },
    { id: 'sw-v', name: 'Shawarma viande', category: 'plats', price: 7500, image: IMG.shawarma },
    { id: 'sw-p', name: 'Shawarma poulet', category: 'plats', price: 6000, image: IMG.shawarmaPoulet },
    { id: 'sm-v', name: 'Samoussa viande', category: 'plats', price: 1500, image: IMG.samoussa },
    { id: 'sm-p', name: 'Samoussa poulet', category: 'plats', price: 1000, image: IMG.samoussa2 },
    { id: 'pb', name: 'Pâtes bolognaises', category: 'plats', price: 3500, image: IMG.pates },
    { id: 'acc-sal', name: 'Salade', category: 'accompagnements', price: 1500, image: IMG.salade },
    { id: 'acc-fri', name: 'Frites', category: 'accompagnements', price: 2500, image: IMG.frites },
    { id: 'acc-ban', name: 'Bananes plantains', category: 'accompagnements', price: 2000, image: IMG.plantain },
    { id: 'acc-boul', name: 'Boulettes de viande', category: 'accompagnements', price: 1500, image: IMG.boulettes },
    { id: 'gt-n', name: "Gâteau d'anniversaire - Normal", category: 'desserts', price: 25000, priceNote: '20 000 à 30 000 FC', image: IMG.gateau },
    { id: 'gt-p', name: "Gâteau d'anniversaire - Personnalisé", category: 'desserts', price: 35000, priceNote: '20 à 50 USD', image: IMG.gateau2 },
    { id: 'cup', name: 'Cupcakes', category: 'desserts', price: 1500, image: IMG.cupcake },
    { id: 'ck-bl', name: 'Cookies - Chocolat blanc', category: 'desserts', price: 2000, image: IMG.cookieBlanc },
    { id: 'ck-no', name: 'Cookies - Chocolat noir', category: 'desserts', price: 2000, image: IMG.cookieNoir },
    { id: 'gf-ch', name: 'Gaufres - Chocolat', category: 'desserts', price: 4000, image: IMG.gaufreChoco },
    { id: 'gf-sp', name: 'Gaufres - Spéculoos', category: 'desserts', price: 5000, image: IMG.gaufreSpec },
    { id: 'cr-nu', name: 'Crêpes - Nutella', category: 'desserts', price: 5000, image: IMG.crepeNutella },
    { id: 'cr-or', name: 'Crêpes - Chocolat + Oreo', category: 'desserts', price: 6500, image: IMG.crepeOreo },
    { id: 'cc', name: 'Coca-Cola', category: 'boissons', price: 3000, image: IMG.coca },
    { id: 'fa', name: 'Fanta', category: 'boissons', price: 3000, image: IMG.fanta },
    { id: 'sp', name: 'Sprite', category: 'boissons', price: 3000, image: IMG.sprite },
    { id: 'ea', name: 'Eau minérale', category: 'boissons', price: 500, image: IMG.eau }
  ],
  paymentMethods: [
    { id: 'mpesa', name: 'M-Pesa', icon: '💚', needsCompanyInfo: true },
    { id: 'physical', name: 'Paiement physique (boutique)', icon: '🏪', needsCompanyInfo: true },
    { id: 'cash', name: 'Paiement en espèces', icon: '💵' }
  ],  loyaltyBadges: [
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
