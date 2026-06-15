// POST /api/admin-update  (header x-admin-pass)  body: { id, fields:{...} }
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.ADMIN_PASSWORD;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.FROM_EMAIL || 'The Ring <onboarding@resend.dev>';

const ADMIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILS = 6;
const ALLOWED = ['alias', 'first_name', 'last_name', 'city', 'nationality', 'driving_style', 'status', 'hidden'];

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
  if (now > b.resetAt) {
    globalThis.__ttrAdminFails.delete(ip);
    return false;
  }
  return b.count >= ADMIN_MAX_FAILS;
}

function recordAdminFail(ip) {
  const now = Date.now();
  globalThis.__ttrAdminFails = globalThis.__ttrAdminFails || new Map();
  const b = globalThis.__ttrAdminFails.get(ip) || { count: 0, resetAt: now + ADMIN_WINDOW_MS };
  if (now > b.resetAt) {
    b.count = 0;
    b.resetAt = now + ADMIN_WINDOW_MS;
  }
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
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); }
      catch { resolve({}); }
    });
  });
}

function cleanText(value, max = 80) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function validatePatch(patch) {
  const out = {};
  const countries = ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco', 'Canada', 'Autre'];
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40}$/;
  const aliasRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]{2,10}$/;
  const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/;

  for (const k of ALLOWED) {
    if (!(k in patch)) continue;
    const v = patch[k];

    if (k === 'hidden') {
      out.hidden = !!v;
      continue;
    }

    if (k === 'status') {
      if (!['published', 'pending', 'rejected'].includes(String(v))) throw new Error('Statut invalide.');
      out.status = String(v);
      continue;
    }

    if (k === 'alias') {
      const x = cleanText(v, 10);
      if (!aliasRegex.test(x)) throw new Error('Pseudo invalide : 2 à 10 caractères, lettres, chiffres, tiret ou underscore.');
      out.alias = x;
      continue;
    }

    if (k === 'first_name' || k === 'last_name') {
      const x = cleanText(v, 40);
      if (!nameRegex.test(x)) throw new Error('Nom ou prénom invalide.');
      out[k] = x;
      continue;
    }

    if (k === 'city') {
      const x = cleanText(v, 60);
      if (!cityRegex.test(x)) throw new Error('Ville invalide.');
      out.city = x;
      continue;
    }

    if (k === 'nationality') {
      const x = cleanText(v, 30);
      if (!countries.includes(x)) throw new Error('Pays invalide.');
      out.nationality = x;
      continue;
    }

    if (k === 'driving_style') {
      const x = cleanText(v, 34);
      if (/[<>]/.test(x)) throw new Error('Style invalide.');
      out.driving_style = x;
    }
  }
  return out;
}

async function sendEmail(to, subject, html) {
  if (!RESEND || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
}

// Mail de félicitations envoyé au pilote au moment de la publication (passage -> published).
function congratsHtml(row, base) {
  const en = (row.language === 'en');
  const first = row.first_name || '';
  const link = `${base}/drivers/${row.slug}`;
  const logo = `${base}/ttr-logo.png`;
  const site = 'https://www.thering-drive.com/';
  const tx = en ? {
    hi: `Welcome aboard, ${first}!`,
    l1: `It's official — you're now part of <b style="color:#fff">The Ring · La League — Season&nbsp;0 · Founders</b>. 🏁`,
    l2: `Your official Driver Card is live — here's your exclusive, personalized card:`,
    btn: 'VIEW MY DRIVER CARD',
    invite: `Spread the word — tell your friends and family about The Ring 👇`
  } : {
    hi: `Bienvenue dans l'aventure, ${first} !`,
    l1: `C'est officiel — tu fais désormais partie de <b style="color:#fff">The Ring · La League — Season&nbsp;0 · Founders</b>. 🏁`,
    l2: `Ta Driver Card officielle est en ligne — voici ta carte exclusive et personnalisée :`,
    btn: 'VOIR MA DRIVER CARD',
    invite: `Fais grandir la communauté : parle de The Ring autour de toi 👇`
  };
  return `
<div style="margin:0;padding:0;background:#050507">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050507">
<tr><td align="center" style="padding:30px 14px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#0b0c12;border-radius:16px;overflow:hidden">
  <tr><td align="center" style="background:#050507;padding:26px 0 18px">
    <img src="${logo}" width="160" alt="The Ring" style="display:block;border:0">
  </td></tr>
  <tr><td style="height:5px;background:linear-gradient(90deg,#34b8ff,#2e54ff,#7a33f0,#e22ed0);font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:30px 30px 8px">
    <div style="font-family:Arial,sans-serif;font-weight:800;font-size:30px;color:#ffffff;text-transform:uppercase">${tx.hi}</div>
  </td></tr>
  <tr><td style="padding:6px 30px 0">
    <p style="margin:0 0 16px;color:#c9cbd8;font-size:16px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.l1}</p>
    <p style="margin:0 0 12px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.l2}</p>
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:6px auto 22px"><tr><td style="border-radius:10px;background-image:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0)">
      <a href="${link}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#ffffff;text-decoration:none">${tx.btn}</a>
    </td></tr></table>
    <p style="margin:0 0 6px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.invite}</p>
    <p style="margin:0 0 22px"><a href="${site}" style="color:#34b8ff;font-family:Arial,Helvetica,sans-serif;font-size:15px">${site}</a></p>
  </td></tr>
  <tr><td style="height:1px;background:#1d1e28;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td align="center" style="padding:16px;color:#5c5e6e;font-size:12px;font-family:Arial,Helvetica,sans-serif">The Ring · thering-drive.com</td></tr>
</table>
</td></tr></table></div>`;
}

module.exports = async (req, res) => {
  const ip = getIp(req);

  if (isBlocked(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives admin. Réessaie plus tard.' });
  }

  if (!PASS || req.headers['x-admin-pass'] !== PASS) {
    recordAdminFail(ip);
    return res.status(401).json({ error: 'unauthorized' });
  }

  clearAdminFails(ip);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  try {
    const body = await readBody(req);
    if (!body.id) return res.status(400).json({ error: 'id manquant' });

    const patch = validatePatch(body.fields || {});

    // Détecter une transition vers "published" pour féliciter le pilote (1 seul envoi).
    let wasPublished = null;
    if (patch.status === 'published') {
      try {
        const g = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(body.id)}&select=status`, {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
        });
        const gj = await g.json();
        wasPublished = (Array.isArray(gj) && gj[0]) ? (gj[0].status === 'published') : null;
      } catch (e) { wasPublished = null; }
    }

    const r = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(body.id)}`, {
      method: 'PATCH',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(patch)
    });

    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch { json = {}; }

    if (!r.ok) return res.status(500).json({ error: (json && (json.message || json.error)) || text || 'Erreur Supabase' });

    // Mail de félicitations uniquement au passage non-publié -> publié.
    if (patch.status === 'published' && wasPublished === false) {
      const row = Array.isArray(json) ? json[0] : json;
      if (row && row.email) {
        const base = `https://${req.headers.host}`;
        const subject = (row.language === 'en')
          ? "You're in! The Ring · La League 🏁"
          : 'Bienvenue dans The Ring · La League 🏁';
        await sendEmail(row.email, subject, congratsHtml(row, base)).catch(() => {});
      }
    }

    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
