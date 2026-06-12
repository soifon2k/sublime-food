const crypto = require('crypto');

function signOtp(payload, secret) {
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

  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({ error: 'Configuration serveur manquante' });

  const { phone, userId } = req.body || {};
  if (!phone || !userId) return res.status(400).json({ error: 'Téléphone et identifiant requis' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = signOtp({ phone, userId, otp, exp: Date.now() + 10 * 60 * 1000 }, secret);

  // Intégration SMS à configurer (Twilio, Africa's Talking, etc.)
  const response = {
    success: true,
    message: `Code de vérification envoyé au ${phone}`,
    token
  };

  return res.status(200).json(response);
};
