const crypto = require('crypto');

function verifyOtpToken(token, secret) {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString());
    const body = JSON.stringify(parsed.payload);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (parsed.sig !== expected) return null;
    if (Date.now() > parsed.payload.exp) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuration serveur manquante' });

  const { code, token } = req.body || {};
  const payload = verifyOtpToken(token, secret);

  if (!payload || payload.otp !== code) {
    return res.status(401).json({ success: false, error: 'Code OTP incorrect ou expiré' });
  }

  return res.status(200).json({ success: true, userId: payload.userId, phone: payload.phone });
};
