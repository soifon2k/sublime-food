const crypto = require('crypto');

const DEFAULT_ADMIN = {
  username: 'sublime food admin',
  password: 'food 123',
  secret: 'sublime-food-admin-secret-2026'
};

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

  const adminUser = process.env.ADMIN_USERNAME || DEFAULT_ADMIN.username;
  const adminPass = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN.password;
  const secret = process.env.ADMIN_SECRET || DEFAULT_ADMIN.secret;

  const { username, password } = req.body || {};

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
  }

  const token = createToken(secret);
  return res.status(200).json({ success: true, token });
};
