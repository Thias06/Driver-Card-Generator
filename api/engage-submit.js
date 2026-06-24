// POST /api/engage-submit   body: { t:<token>, choice:'achat'|'location' }
// Enregistre l'engagement du candidat (case cochée + choix formule).
// Met engagement_status -> 'engaged' (ce qui débloque "Publier" côté admin)
// et synchronise la formule (equipment) avec le choix final.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const TEAM = process.env.TEAM_EMAIL || 'mtthias@hotmail.com';
const FROM = process.env.FROM_EMAIL || 'The Ring <onboarding@resend.dev>';

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

async function sendEmail(to, subject, html) {
  if (!RESEND || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    if (!SB || !KEY) return res.status(500).json({ error: 'Config serveur manquante.' });

    const body = await readBody(req);
    const token = String(body.t || body.token || '').trim();
    const choice = String(body.choice || '').trim().toLowerCase();
    if (!token) return res.status(400).json({ error: 'token manquant' });
    if (!['achat', 'location'].includes(choice)) {
      return res.status(400).json({ error: 'Choisis une formule : location ou achat.' });
    }
    if (body.engaged === false) {
      return res.status(400).json({ error: "Coche la case d'engagement pour valider." });
    }

    // Retrouve le candidat via le jeton
    const g = await fetch(
      `${SB}/rest/v1/drivers?engagement_token=eq.${encodeURIComponent(token)}&select=id,first_name,alias,email,status&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    );
    const gj = await g.json();
    const row = Array.isArray(gj) ? gj[0] : null;
    if (!row) return res.status(404).json({ error: 'Lien invalide ou expiré.' });
    if (row.status === 'published') {
      return res.status(200).json({ ok: true, already: true });
    }

    const patch = {
      engagement_status: 'engaged',
      engagement_choice: choice,
      equipment: choice,                 // on garde la formule alignée sur le choix final
      engaged_at: new Date().toISOString()
    };

    const r = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation'
      },
      body: JSON.stringify(patch)
    });
    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch { json = {}; }
    if (!r.ok) {
      const msg = (json && (json.message || json.error)) || text || '';
      if (/engagement_/.test(String(msg)) && /column|find/i.test(String(msg))) {
        return res.status(500).json({ error: "Base non migrée : exécute schema-engagement.sql." });
      }
      return res.status(500).json({ error: msg || 'Erreur Supabase' });
    }

    // Notifie l'équipe (best-effort) qu'un candidat vient de s'engager -> à publier.
    const base = `https://${req.headers.host}`;
    const label = choice === 'achat' ? "Achat de l'équipement" : 'Location (pré-équipé)';
    sendEmail(
      TEAM,
      `✅ Engagement confirmé — ${row.alias || row.first_name || ''}`,
      `<h2>Un candidat s'est engagé pour la Saison 0</h2>
       <p><b>Pseudo :</b> ${row.alias || '-'}<br>
       <b>Prénom :</b> ${row.first_name || '-'}<br>
       <b>Email :</b> ${row.email || '-'}<br>
       <b>Formule choisie :</b> ${label}</p>
       <p>➡ Tu peux maintenant le <b>publier</b> dans l'admin : <a href="${base}/admin.html">${base}/admin.html</a></p>`
    ).catch(() => {});

    return res.status(200).json({ ok: true, choice });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
