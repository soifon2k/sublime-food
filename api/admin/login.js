const crypto = require('crypto');

function createToken(secret) {
  const payload = { role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64');
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;

  if (!adminUser || !adminPass || !secret) {
    return res.status(500).json({ error: 'Configuration administrateur manquante sur le serveur.' });
  }

  const { username, password } = req.body || {};

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
  }

  const token = createToken(secret);
  return res.status(200).json({ success: true, token });
};
