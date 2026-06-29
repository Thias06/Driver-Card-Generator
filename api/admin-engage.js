// POST /api/admin-engage  (header x-admin-pass)  body: { id }
// Génère un jeton, passe engagement_status -> 'sent', et envoie au candidat le
// "mail formulaire d'engagement" (même charte que les autres emails The Ring).
// Le candidat coche ses cases sur la page hébergée /engage.html?t=<token>.

const crypto = require('crypto');

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.ADMIN_PASSWORD;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.FROM_EMAIL || 'The Ring <onboarding@resend.dev>';

const ADMIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILS = 6;

function getIp(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim() || 'unknown';
}
function isBlocked(ip) {
  const now = Date.now();
  globalThis.__ttrAdminFails = globalThis.__ttrAdminFails || new Map();
  const b = globalThis.__ttrAdminFails.get(ip);
  if (!b) return false;
  if (now > b.resetAt) { globalThis.__ttrAdminFails.delete(ip); return false; }
  return b.count >= ADMIN_MAX_FAILS;
}
function recordAdminFail(ip) {
  const now = Date.now();
  globalThis.__ttrAdminFails = globalThis.__ttrAdminFails || new Map();
  const b = globalThis.__ttrAdminFails.get(ip) || { count: 0, resetAt: now + ADMIN_WINDOW_MS };
  if (now > b.resetAt) { b.count = 0; b.resetAt = now + ADMIN_WINDOW_MS; }
  b.count += 1;
  globalThis.__ttrAdminFails.set(ip, b);
}
function clearAdminFails(ip) {
  if (globalThis.__ttrAdminFails) globalThis.__ttrAdminFails.delete(ip);
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

async function sendEmail(to, subject, html, attachments) {
  if (!RESEND || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, attachments })
  });
}

// Tente de joindre tarifs_TR.pdf (déposé plus tard dans le repo). Silencieux s'il n'existe pas encore.
async function tryAttachTarifs(base) {
  try {
    const r = await fetch(`${base}/tarifs_TR.pdf`);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    if (!ab || ab.byteLength === 0) return null;
    return [{ filename: 'tarifs_TR.pdf', content: Buffer.from(ab).toString('base64') }];
  } catch (e) { return null; }
}

function engageHtml(row, base, token) {
  const en = (row.language === 'en');
  const first = row.first_name || '';
  const logo = `${base}/ttr-logo-2x.png`;
  const track = `${base}/new_track.jpg`;
  const tarifs = `${base}/tarifs_TR.pdf`;
  const link = `${base}/engage.html?t=${encodeURIComponent(token)}`;
  const site = 'https://www.thering-drive.com/';

  // Bloc commun : carte sombre, logo, bande dégradée, footer.
  const head = `
<div style="margin:0;padding:0;background:#050507">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050507">
<tr><td align="center" style="padding:30px 14px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#0b0c12;border-radius:16px;overflow:hidden">
  <tr><td align="center" style="background:#050507;padding:26px 0 18px">
    <img src="${logo}" width="150" alt="The Ring" style="display:block;border:0;width:150px;max-width:150px;height:auto">
  </td></tr>
  <tr><td style="height:5px;background:linear-gradient(90deg,#34b8ff,#2e54ff,#7a33f0,#e22ed0);font-size:0;line-height:0">&nbsp;</td></tr>`;

  const foot = `
  <tr><td style="height:1px;background:#1d1e28;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td align="center" style="padding:16px;color:#5c5e6e;font-size:12px;font-family:Arial,Helvetica,sans-serif">The Ring · thering-drive.com</td></tr>
</table>
</td></tr></table></div>`;

  const P = (txt, size = 15, mb = 16) =>
    `<p style="margin:0 0 ${mb}px;color:#c9cbd8;font-size:${size}px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${txt}</p>`;

  if (en) {
    return head + `
  <tr><td style="padding:28px 30px 6px">
    <div style="font-family:Arial,sans-serif;font-weight:800;font-size:27px;color:#ffffff;text-transform:uppercase">Ready to enter the arena, ${first}?</div>
  </td></tr>
  <tr><td style="padding:6px 30px 0">
    ${P(`You applied to <b style="color:#fff">La League — Season&nbsp;0 · Founders</b>, and we'd love to have you on the grid. 🏁 No pressure — just the chance to be one of the very first drivers, with <b style="color:#fff">exclusive access to promo, training and competition sessions</b> on the new tracks to come.`)}
    ${P(`<b style="color:#fff">Two rankings, two rewards.</b> The <b style="color:#fff">Championship</b> rewards race results (🥇 10 · 🥈 7 · 🥉 5 · 4th 3 pts). The <b style="color:#fff">The Ring™ Index</b> measures your real driving level — everyone starts at <b style="color:#fff">50.0 / 100</b>: Pace 35% · Consistency 25% · Race results 15% · Cleanliness 15% · Reliability 10%.`)}
    ${P(`<b style="color:#fff">How it runs:</b> about <b style="color:#fff">one event every 3 months</b> — not always full competition. Every session feeds the data that builds both rankings.`)}
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:6px auto 22px"><tr><td align="center" bgcolor="#7a33f0" style="border-radius:11px;background-color:#7a33f0;background-image:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0);border:1px solid #c08bff">
      <a href="${link}" style="display:inline-block;border-radius:11px;padding:16px 30px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#ffffff;text-decoration:none">I'M IN FOR SEASON 0 →</a>
    </td></tr></table>
    ${P(`Pricing & packages are in the attached <b style="color:#fff">tarifs_TR.pdf</b> · <a href="${tarifs}" style="color:#34b8ff">open</a>`, 13, 8)}
    ${P(`<a href="${site}" style="color:#34b8ff">${site}</a>`, 14, 22)}
  </td></tr>` + foot;
  }

  // FR
  return head + `
  <tr><td style="padding:28px 30px 6px">
    <div style="font-family:Arial,sans-serif;font-weight:800;font-size:27px;color:#ffffff;text-transform:uppercase">Prêt à entrer dans l'arène, ${first} ?</div>
  </td></tr>
  <tr><td style="padding:6px 30px 0">
    ${P(`Tu as candidaté à <b style="color:#fff">La League — Saison&nbsp;0 · Founders</b>, et franchement, on aimerait te voir sur la grille. 🏁 Aucune pression : juste l'occasion d'être parmi les <b style="color:#fff">tout premiers pilotes</b>, avec un <b style="color:#fff">accès exclusif aux sessions de promo, d'entraînement et de compétition</b> sur les nouveaux circuits à venir.`)}
    ${P(`<b style="color:#fff">Deux classements, deux récompenses.</b> Le <b style="color:#fff">Championnat</b> récompense les résultats en course (🥇 10 · 🥈 7 · 🥉 5 · 4ᵉ 3 pts). L'<b style="color:#fff">Indice The Ring™</b> mesure ton vrai niveau de pilotage — tout le monde démarre à <b style="color:#fff">50,0 / 100</b> : Chrono 35% · Régularité 25% · Résultats 15% · Propreté 15% · Fiabilité 10%.`)}
    ${P(`<b style="color:#fff">Comment ça se joue :</b> environ <b style="color:#fff">1 évènement tous les 3 mois</b> — pas systématiquement en compétition. Chaque session alimente les données qui construisent les deux classements.`)}
    ${P(`Il te reste une chose à faire : nous dire que <b style="color:#fff">tu embarques</b>, et choisir ta formule (Location ou Achat). 👇`)}
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:6px auto 18px"><tr><td align="center" bgcolor="#7a33f0" style="border-radius:11px;background-color:#7a33f0;background-image:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0);border:1px solid #c08bff">
      <a href="${link}" style="display:inline-block;border-radius:11px;padding:16px 30px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#ffffff;text-decoration:none">JE M'ENGAGE POUR LA SAISON 0 →</a>
    </td></tr></table>
    ${P(`Les <b style="color:#fff">tarifs et formules</b> sont dans la pièce jointe <b style="color:#fff">tarifs_TR.pdf</b> · <a href="${tarifs}" style="color:#34b8ff">ouvrir</a>`, 13, 8)}
    ${P(`<a href="${site}" style="color:#34b8ff">${site}</a>`, 14, 22)}
  </td></tr>` + foot;
}

async function sbPatch(id, patch) {
  const r = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(id)}`, {
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
      throw new Error("Colonnes d'engagement manquantes : exécute schema-engagement.sql dans Supabase.");
    }
    throw new Error(msg || 'Erreur Supabase');
  }
  return Array.isArray(json) ? json[0] : json;
}

module.exports = async (req, res) => {
  const ip = getIp(req);
  if (isBlocked(ip)) return res.status(429).json({ error: 'Trop de tentatives admin. Réessaie plus tard.' });
  if (!PASS || req.headers['x-admin-pass'] !== PASS) {
    recordAdminFail(ip);
    return res.status(401).json({ error: 'unauthorized' });
  }
  clearAdminFails(ip);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  try {
    if (!SB || !KEY) return res.status(500).json({ error: 'Variables Supabase manquantes.' });

    const body = await readBody(req);
    if (!body.id) return res.status(400).json({ error: 'id manquant' });

    // Récupère le candidat
    const g = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(body.id)}&select=id,email,first_name,alias,language,status`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    const gj = await g.json();
    const row = Array.isArray(gj) ? gj[0] : null;
    if (!row) return res.status(404).json({ error: 'Candidat introuvable.' });
    if (!row.email) return res.status(400).json({ error: "Ce candidat n'a pas d'email." });
    if (row.status === 'published') return res.status(400).json({ error: 'Déjà publié.' });

    const token = crypto.randomUUID();
    const updated = await sbPatch(body.id, {
      engagement_status: 'sent',
      engagement_token: token,
      engagement_sent_at: new Date().toISOString()
    });

    const base = `https://${req.headers.host}`;
    const attachments = await tryAttachTarifs(base);
    const en = (row.language === 'en');
    const subject = en
      ? "La League — your spot for Season 0 🏁"
      : "La League — ta place pour la Saison 0 🏁";

    await sendEmail(row.email, subject, engageHtml(row, base, token), attachments || undefined).catch(() => {});

    return res.status(200).json({ ok: true, row: updated, attached: !!attachments });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
