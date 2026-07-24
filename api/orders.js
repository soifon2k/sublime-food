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

function readRawStore(filePath) {
  try {
    ensureStore(filePath);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function normalizeOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.filter(Boolean).sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function normalizeDeletedIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(Boolean).map((id) => String(id)))];
}

function filterDeletedOrders(orders, deletedIds = []) {
  const deleted = new Set(normalizeDeletedIds(deletedIds));
  return normalizeOrders(orders).filter((order) => order?.id && !deleted.has(String(order.id)));
}

function readStoreState() {
  const candidates = [ORDERS_FILE];
  if (ORDERS_FILE !== FALLBACK_ORDERS_FILE) candidates.push(FALLBACK_ORDERS_FILE);
  if (ORDERS_FILE !== '/tmp/sublime-orders.json') candidates.push('/tmp/sublime-orders.json');

  for (const candidate of candidates) {
    const raw = readRawStore(candidate);
    if (!raw || !raw.trim()) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { orders: normalizeOrders(parsed), deletedOrderIds: [] };
      }
      if (parsed && typeof parsed === 'object') {
        return {
          orders: filterDeletedOrders(parsed.orders || [], parsed.deletedOrderIds || []),
          deletedOrderIds: normalizeDeletedIds(parsed.deletedOrderIds || [])
        };
      }
    } catch {
      // ignore and try the next candidate
    }
  }
  return { orders: [], deletedOrderIds: [] };
}

function mergeOrders(existingOrders, incomingOrders, deletedIds = []) {
  const merged = new Map();
  const normalizedExisting = filterDeletedOrders(existingOrders, deletedIds);
  const normalizedIncoming = filterDeletedOrders(incomingOrders, deletedIds);

  normalizedExisting.forEach((order) => {
    if (order?.id) merged.set(String(order.id), order);
  });
  normalizedIncoming.forEach((order) => {
    if (!order?.id) return;
    const key = String(order.id);
    if (merged.has(key)) {
      merged.set(key, { ...merged.get(key), ...order });
    } else {
      merged.set(key, order);
    }
  });

  return Array.from(merged.values()).sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function writeOrders(orders, deletedIds = []) {
  const normalizedOrders = normalizeOrders(orders);
  const normalizedDeletedIds = normalizeDeletedIds(deletedIds);
  const payload = { orders: normalizedOrders, deletedOrderIds: normalizedDeletedIds };
  const serialized = JSON.stringify(payload, null, 2);
  const candidates = [ORDERS_FILE];
  if (ORDERS_FILE !== FALLBACK_ORDERS_FILE) candidates.push(FALLBACK_ORDERS_FILE);
  if (ORDERS_FILE !== '/tmp/sublime-orders.json') candidates.push('/tmp/sublime-orders.json');

  let wrote = false;
  for (const candidate of candidates) {
    try {
      ensureStore(candidate);
      fs.writeFileSync(candidate, serialized);
      wrote = true;
    } catch {
      // continue to next candidate
    }
  }
  if (!wrote) {
    ensureStore(ORDERS_FILE);
    fs.writeFileSync(ORDERS_FILE, serialized);
  }
  return payload;
}

function readOrders() {
  return readStoreState().orders;
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
    const state = readStoreState();
    if (Array.isArray(body.orders)) {
      const merged = mergeOrders(state.orders, body.orders, state.deletedOrderIds);
      const stored = writeOrders(merged, state.deletedOrderIds);
      return res.status(200).json(stored.orders);
    }
    if (body.order && typeof body.order === 'object') {
      const merged = mergeOrders(state.orders, [body.order], state.deletedOrderIds);
      const stored = writeOrders(merged, state.deletedOrderIds);
      return res.status(200).json(stored.orders);
    }
    return res.status(400).json({ error: 'Données de commande requises.' });
  }

  if (req.method === 'PUT') {
    const { id, updates } = body;
    if (!id) return res.status(400).json({ error: 'Identifiant de commande requis.' });
    const state = readStoreState();
    const orders = state.orders.slice();
    const idx = orders.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Commande introuvable.' });
    orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
    const stored = writeOrders(orders, state.deletedOrderIds);
    return res.status(200).json(stored.orders);
  }

  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'Identifiant de commande requis.' });
    const state = readStoreState();
    const deletedOrderId = String(id);
    const deletedIds = normalizeDeletedIds([...state.deletedOrderIds, deletedOrderId]);
    const orders = filterDeletedOrders(state.orders, deletedIds);
    const stored = writeOrders(orders, deletedIds);
    return res.status(200).json(stored.orders);
  }

  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
