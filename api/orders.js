const fs = require('fs');
const path = require('path');

function getOrdersFilePath() {
  if (process.env.ORDERS_FILE_PATH) return path.resolve(process.env.ORDERS_FILE_PATH);
  if (process.env.VERCEL_ENV) return '/tmp/sublime-orders.json';
  return path.resolve(process.cwd(), 'orders.json');
}

const ORDERS_FILE = getOrdersFilePath();
const FALLBACK_ORDERS_FILE = path.resolve(process.cwd(), 'orders.json');

function ensureStore(filePath = ORDERS_FILE) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readOrders() {
  const candidates = [ORDERS_FILE];
  if (ORDERS_FILE !== FALLBACK_ORDERS_FILE) candidates.push(FALLBACK_ORDERS_FILE);
  if (ORDERS_FILE !== '/tmp/sublime-orders.json') candidates.push('/tmp/sublime-orders.json');

  for (const candidate of candidates) {
    try {
      ensureStore(candidate);
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // ignore and try the next candidate
    }
  }
  return [];
}

function normalizeOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.filter(Boolean).sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function mergeOrders(existingOrders, incomingOrders) {
  const merged = new Map();
  normalizeOrders(existingOrders).forEach((order) => {
    if (order?.id) merged.set(order.id, order);
  });
  normalizeOrders(incomingOrders).forEach((order) => {
    if (!order?.id) return;
    if (merged.has(order.id)) {
      merged.set(order.id, { ...merged.get(order.id), ...order });
    } else {
      merged.set(order.id, order);
    }
  });
  return Array.from(merged.values()).sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function writeOrders(orders) {
  const normalized = normalizeOrders(orders);
  const candidates = [ORDERS_FILE];
  if (ORDERS_FILE !== FALLBACK_ORDERS_FILE) candidates.push(FALLBACK_ORDERS_FILE);
  if (ORDERS_FILE !== '/tmp/sublime-orders.json') candidates.push('/tmp/sublime-orders.json');

  for (const candidate of candidates) {
    try {
      ensureStore(candidate);
      fs.writeFileSync(candidate, JSON.stringify(normalized, null, 2));
      return normalized;
    } catch {
      // continue to next candidate
    }
  }
  return normalized;
}

function parseBody(req) {
  if (!req || req.body === undefined || req.body === null) return {};
  if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      const text = req.body.toString('utf8');
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }
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
      return res.status(200).json(writeOrders(mergeOrders(readOrders(), body.orders)));
    }
    if (body.order && typeof body.order === 'object') {
      const orders = mergeOrders(readOrders(), [body.order]);
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
    orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
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
