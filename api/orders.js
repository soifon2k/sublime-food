const fs = require('fs');
const path = require('path');

const ORDERS_FILE = '/tmp/sublime-orders.json';

function ensureStore() {
  fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
}

function readOrders() {
  try {
    ensureStore();
    if (!fs.existsSync(ORDERS_FILE)) return [];
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  return orders;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(readOrders());
  }

  const body = parseBody(req);

  if (req.method === 'POST') {
    if (Array.isArray(body.orders)) {
      return res.status(200).json(writeOrders(body.orders));
    }
    if (body.order && typeof body.order === 'object') {
      const orders = readOrders();
      orders.unshift(body.order);
      return res.status(200).json(writeOrders(orders));
    }
    return res.status(400).json({ error: 'Données de commande requises.' });
  }

  if (req.method === 'PUT') {
    const { id, updates } = body;
    if (!id) return res.status(400).json({ error: 'Identifiant de commande requis.' });
    const orders = readOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Commande introuvable.' });
    orders[idx] = { ...orders[idx], ...updates };
    return res.status(200).json(writeOrders(orders));
  }

  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'Identifiant de commande requis.' });
    const orders = readOrders().filter((o) => o.id !== id);
    return res.status(200).json(writeOrders(orders));
  }

  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
