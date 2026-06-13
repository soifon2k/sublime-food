const SYSTEM_PROMPT = `Tu es l'assistant virtuel de Sublime Food, restaurant de livraison à domicile.
Tu donnes UNIQUEMENT des conseils utiles aux clients : commandes, menu, livraison, paiement, problèmes.
Sois poli, concis (max 3 phrases), en français.
Contacts humains : 0822624705 (téléphone et WhatsApp).
Paiements acceptés : M-Pesa, paiement en espèces et paiement physique en boutique.
Livraison : 30-45 minutes avec suivi en temps réel.
Ne invente pas de prix : renvoie vers le menu de l'application pour les tarifs exacts.`;

function localAssistant(message, history) {
  const m = message.toLowerCase();
  const phones = '0822624705';

  if (/commande|suivre|statut|où est/.test(m)) {
    return "Pour suivre votre commande, allez dans Profil → Historique commandes, ou utilisez l'écran Suivi après validation. Si besoin, contactez-nous au " + phones + ".";
  }
  if (/livraison|délai|temps|arrive/.test(m)) {
    return "La livraison prend généralement 30 à 45 minutes. Vous pouvez suivre le livreur en temps réel depuis l'application après confirmation de commande.";
  }
  if (/paiement|payer|mpesa|m-pesa|esp[eè]ces|physique/.test(m)) {
    return "Nous acceptons M-Pesa et paiement en espèces/physique. Envoyez votre paiement au 0822624705 et attendez la confirmation.";
  }
  if (/menu|plat|poulet|tacos|burger|dessert|boisson|prix/.test(m)) {
    return "Consultez l'onglet Menu pour voir tous nos plats, desserts et boissons avec les prix en FC. Les populaires : poulet frit, tacos, hamburger et gâteaux d'anniversaire.";
  }
  if (/problème|erreur|rembours|réclam|plainte|pas reçu/.test(m)) {
    return "Je suis désolé pour ce désagrément. Décrivez votre numéro de commande et appelez-nous immédiatement au " + phones + ".";
  }
  if (/compte|connexion|mot de passe|inscription|otp/.test(m)) {
    return "Pour créer un compte, utilisez Inscription avec email et téléphone. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié ». Besoin d'aide ? Appelez le " + phones + ".";
  }
  if (/promo|réduction|fidélité|points/.test(m)) {
    return "Consultez la section Promotions et le Programme fidélité dans votre profil pour les offres et points disponibles.";
  }
  if (/bonjour|salut|hello|bonsoir/.test(m)) {
    return "Bonjour ! Je suis l'assistant Sublime Food. Comment puis-je vous aider ? (commande, livraison, paiement, menu...)";
  }
  return "Merci pour votre message. Pour une assistance personnalisée, contactez notre équipe au " + phones + " (téléphone/WhatsApp). Je peux vous conseiller sur les commandes, la livraison, le menu et les paiements.";
}

async function callOpenAI(message, history) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 250,
      temperature: 0.7
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { message, history = [] } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message requis' });

  try {
    const aiReply = await callOpenAI(message, history);
    const reply = aiReply || localAssistant(message, history);
    return res.status(200).json({ reply, source: aiReply ? 'ai' : 'assistant' });
  } catch {
    return res.status(200).json({ reply: localAssistant(message, history), source: 'assistant' });
  }
};
