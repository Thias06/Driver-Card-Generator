// GET /api/engage-get?t=<token>
// Renvoie le minimum nécessaire pour afficher la page d'engagement du candidat.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
  try {
    const token = (req.query && (req.query.t || req.query.token)) || '';
    if (!token) return res.status(400).json({ error: 'token manquant' });
    if (!SB || !KEY) return res.status(500).json({ error: 'Config serveur manquante.' });

    const r = await fetch(
      `${SB}/rest/v1/drivers?engagement_token=eq.${encodeURIComponent(token)}&select=first_name,alias,equipment,engagement_status,engagement_choice,status&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    );
    const text = await r.text();
    let json = [];
    try { json = JSON.parse(text || '[]'); } catch { json = []; }
    if (!r.ok) return res.status(500).json({ error: (json && (json.message || json.error)) || 'Erreur Supabase' });

    const row = Array.isArray(json) ? json[0] : null;
    if (!row) return res.status(404).json({ error: 'Lien invalide ou expiré.' });

    return res.status(200).json({
      first_name: row.first_name || '',
      alias: row.alias || '',
      // pré-sélection : choix d'engagement déjà fait, sinon formule choisie à l'inscription
      choice: row.engagement_choice || row.equipment || '',
      engagement_status: row.engagement_status || 'none',
      published: row.status === 'published'
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
