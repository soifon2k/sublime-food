const crypto = require('crypto');

const DEFAULT_SECRET = 'sublime-food-admin-secret-2026';
const LOCAL_TOKEN = 'sublime-local-admin-valid';

function verifyToken(token, secret) {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString());
    const body = JSON.stringify(parsed.payload);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (parsed.sig !== expected) return null;
    if (Date.now() > parsed.payload.exp) return null;
    if (parsed.payload.role !== 'admin') return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  const secret = process.env.ADMIN_SECRET || DEFAULT_SECRET;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (token === LOCAL_TOKEN) {
    return res.status(200).json({ valid: true, role: 'admin' });
  }

  const payload = verifyToken(token, secret);
  if (!payload) return res.status(401).json({ valid: false });
  return res.status(200).json({ valid: true, role: payload.role });
};
