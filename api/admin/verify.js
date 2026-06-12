const crypto = require('crypto');

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

  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({ valid: false, error: 'Configuration manquante' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = verifyToken(token, secret);

  if (!payload) return res.status(401).json({ valid: false });
  return res.status(200).json({ valid: true, role: payload.role });
};
