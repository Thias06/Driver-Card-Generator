// POST /api/register  { payload:{...}, photo:dataURL, card:dataURL, website?: honeypot }
// Stocke photo + carte (Supabase Storage), insère la candidature, envoie 2 emails (Resend).

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const TEAM = process.env.TEAM_EMAIL || 'mtthias@hotmail.com';
const FROM = process.env.FROM_EMAIL || 'The Ring <onboarding@resend.dev>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'contact@thering-drive.com';

// Anti-spam simple en mémoire Vercel : utile contre les rafales basiques.
// Pour une protection très forte, ajouter ensuite Cloudflare Turnstile.
const rateMap = global.__TTR_REGISTER_RATE__ || new Map();
global.__TTR_REGISTER_RATE__ = rateMap;

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

function getIp(req) {
  return String(
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
}

function tooManyAttempts(ip, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const attempts = (rateMap.get(ip) || []).filter(t => now - t < windowMs);
  attempts.push(now);
  rateMap.set(ip, attempts);
  return attempts.length > limit;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cut(value, max) {
  return cleanText(value).slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dataUrlToBuffer(d, allowed = []) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(d || '');
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (allowed.length && !allowed.includes(mime)) return null;
  return { mime, buf: Buffer.from(m[2], 'base64') };
}

function equipmentLabel(value) {
  if (value === 'achat') return "Achat de l'équipement";
  if (value === 'location') return 'Location (pré-équipé)';
  return '-';
}

const COUNTRIES = new Set([
  'France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco',
  'Canada', 'Royaume-Uni', 'Italie', 'Espagne', 'Allemagne', 'Autre'
]);

function validatePayload(payload) {
  const first = cut(payload.first, 30);
  const last = cut(payload.last, 30);
  const alias = cut(payload.alias, 10);
  const city = cut(payload.city, 45);
  const style = cut(payload.style, 60);
  const email = cut(payload.email, 120).toLowerCase();
  const equipment = cleanText(payload.equipment);
  const ageText = cleanText(payload.age);
  const ageNum = Number.parseInt(ageText, 10);
  let country = cut(payload.nationality, 30) || 'France';

  if (!COUNTRIES.has(country)) country = 'Autre';

  const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{1,30}$/;
  const aliasRe = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]{2,10}$/;
  const cityRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{1,45}$/;
  const styleRe = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9'.,!?() _-]{0,60}$/;
  const emailRe = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

  if (!first || !last || !alias || !email || !city) throw new Error('Champs obligatoires manquants.');
  if (!nameRe.test(first)) throw new Error('Le prénom doit contenir uniquement des lettres.');
  if (!nameRe.test(last)) throw new Error('Le nom doit contenir uniquement des lettres.');
  if (!aliasRe.test(alias)) throw new Error('Le pseudo doit faire 2 à 10 caractères et peut contenir lettres, chiffres, tiret ou underscore.');
  if (!/^\d+$/.test(ageText) || !Number.isInteger(ageNum) || ageNum < 16 || ageNum > 99) throw new Error('L’âge doit être compris entre 16 et 99 ans.');
  if (!cityRe.test(city)) throw new Error('La ville doit contenir uniquement des lettres.');
  if (!emailRe.test(email)) throw new Error('Adresse email invalide.');
  if (equipment !== 'achat' && equipment !== 'location') throw new Error('Merci de choisir une formule.');
  if (!styleRe.test(style)) throw new Error('Le style de conduite contient des caractères non autorisés.');

  return { first, last, alias, age: ageNum, nationality: country, city, style, email, equipment };
}

async function sbGetDriversForDuplicateCheck() {
  const r = await fetch(`${SB}/rest/v1/drivers?select=email,alias`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });

  const text = await r.text();
  let json = [];
  try { json = JSON.parse(text || '[]'); }
  catch { json = []; }

  if (!r.ok) {
    throw new Error((json && (json.message || json.error)) || text || 'Erreur lecture Supabase');
  }

  return Array.isArray(json) ? json : [];
}

async function sbInsert(row) {
  const r = await fetch(`${SB}/rest/v1/drivers`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text || '{}'); }
  catch { json = {}; }

  if (!r.ok) {
    const msg = json.message || json.error || text || 'Erreur insertion Supabase';
    if (String(msg).toLowerCase().includes('duplicate') || json.code === '23505') {
      throw new Error('Ce pseudo ou cette adresse email est déjà utilisé.');
    }
    throw new Error(msg);
  }

  return json;
}

async function sbUpload(path, mime, buf) {
  const r = await fetch(`${SB}/storage/v1/object/media/${path}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': mime,
      'x-upsert': 'true'
    },
    body: buf
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || 'Erreur upload Supabase');
  }

  return `${SB}/storage/v1/object/public/media/${path}`;
}

async function sendEmail(to, subject, html, text, attachments) {
  if (!RESEND || !to) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
      attachments
    })
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method' });
  }

  try {
    if (!SB || !KEY) {
      return res.status(500).json({ error: 'Variables Supabase manquantes.' });
    }

    const ip = getIp(req);
    if (tooManyAttempts(ip)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' });
    }

    const body = await readBody(req);

    // Honeypot anti-bot : un humain ne remplit jamais ce champ caché.
    if (cleanText(body.website)) {
      return res.status(400).json({ error: 'Inscription impossible.' });
    }

    let p;
    try {
      p = validatePayload(body.payload || {});
    } catch (validationError) {
      return res.status(400).json({ error: String(validationError && validationError.message || validationError) });
    }

    const cleanEmail = p.email;
    const cleanAlias = p.alias;
    const cleanAliasLower = cleanAlias.toLowerCase();

    const existing = await sbGetDriversForDuplicateCheck();

    const sameEmail = existing.some(x =>
      String(x.email || '').trim().toLowerCase() === cleanEmail
    );

    const sameAlias = existing.some(x =>
      String(x.alias || '').trim().toLowerCase() === cleanAliasLower
    );

    if (sameEmail && sameAlias) {
      return res.status(409).json({ error: 'Ce pseudo et cette adresse email sont déjà utilisés.' });
    }

    if (sameEmail) {
      return res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    }

    if (sameAlias) {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé.' });
    }

    const slug = slugify(cleanAlias) || slugify(p.last) || 'pilote';

    let photo_url = '';
    let card_url = '';

    const photo = dataUrlToBuffer(body.photo, ['image/jpeg', 'image/png', 'image/webp']);
    if (photo) {
      const ext = photo.mime.includes('png') ? 'png' : (photo.mime.includes('webp') ? 'webp' : 'jpg');
      photo_url = await sbUpload(`photo/${slug}.${ext}`, photo.mime, photo.buf);
    }

    const card = dataUrlToBuffer(body.card, ['image/png']);
    if (card) {
      card_url = await sbUpload(`card/${slug}.png`, 'image/png', card.buf);
    }

    const row = {
      status: 'published',
      hidden: false,
      first_name: p.first,
      last_name: p.last,
      alias: cleanAlias,
      age: p.age,
      nationality: p.nationality,
      city: p.city,
      driving_style: p.style,
      email: cleanEmail,
      photo_url,
      card_url,
      slug,
      equipment: p.equipment,
      season: 'S0',
      overall: 50,
      level: 'ROOKIE'
    };

    await sbInsert(row);

    const base = `https://${req.headers.host}`;
    const link = `${base}/drivers/${slug}`;
    const cardB64 = card ? card.buf.toString('base64') : null;

    const safe = {
      first: escapeHtml(p.first),
      last: escapeHtml(p.last),
      alias: escapeHtml(cleanAlias),
      age: escapeHtml(p.age),
      country: escapeHtml(p.nationality),
      city: escapeHtml(p.city),
      style: escapeHtml(p.style || '-'),
      email: escapeHtml(cleanEmail),
      equipment: escapeHtml(equipmentLabel(p.equipment)),
      cardUrl: escapeHtml(card_url),
      photoUrl: escapeHtml(photo_url),
      link: escapeHtml(link),
      base: escapeHtml(base)
    };

    const teamHtml = `<h2>Nouvelle inscription — Season 0</h2>
      <p><b>Pseudo :</b> ${safe.alias}<br><b>Nom :</b> ${safe.first} ${safe.last}<br>
      <b>Âge :</b> ${safe.age}<br><b>Ville :</b> ${safe.city} · ${safe.country}<br>
      <b>Style :</b> ${safe.style}<br><b>Email :</b> ${safe.email}<br>
      <b>Formule :</b> ${safe.equipment}</p>
      <p><b>Carte :</b> <a href="${safe.cardUrl}">Voir la Driver Card</a><br>
      <b>Lien public :</b> <a href="${safe.link}">Profil pilote</a><br>
      <b>Photo :</b> <a href="${safe.photoUrl}">Voir la photo</a></p>`;

    const teamText = `Nouvelle inscription The Ring League - Season 0\n\nPseudo : ${cleanAlias}\nNom : ${p.first} ${p.last}\nAge : ${p.age}\nVille : ${p.city}\nPays : ${p.nationality}\nStyle : ${p.style || '-'}\nEmail : ${cleanEmail}\nFormule : ${equipmentLabel(p.equipment)}\nProfil : ${link}`;

    await sendEmail(
      TEAM,
      `🏁 Inscription Season 0 — ${cleanAlias}`,
      teamHtml,
      teamText,
      cardB64 ? [{ filename: `TTR_S0_${slug}.png`, content: cardB64 }] : undefined
    ).catch(() => {});

    const logo = `${base}/ttr-logo.png`;
    const safeLogo = escapeHtml(logo);

    const userHtml = `
<div style="margin:0;padding:0;background:#050507">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050507">
<tr><td align="center" style="padding:30px 14px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#0b0c12;border-radius:16px;overflow:hidden">
  <tr><td align="center" style="background:#050507;padding:26px 0 18px">
    <img src="${safeLogo}" width="160" alt="The Ring" style="display:block;border:0">
  </td></tr>
  <tr><td style="height:5px;background:linear-gradient(90deg,#34b8ff,#2e54ff,#7a33f0,#e22ed0);font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:30px 30px 8px">
    <div style="font-family:Arial,sans-serif;font-weight:800;font-size:30px;color:#ffffff;text-transform:uppercase">Félicitations, ${safe.first} !</div>
  </td></tr>
  <tr><td style="padding:6px 30px 0">
    <p style="margin:0 0 16px;color:#c9cbd8;font-size:16px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">Bienvenue dans <b style="color:#fff">The Ring League — Season&nbsp;0 · Founders</b>. Ton inscription est bien enregistrée et ta Driver Card officielle est créée. 🏁</p>
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:6px auto 22px"><tr><td style="border-radius:10px;background-image:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0)">
      <a href="${safe.link}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#ffffff;text-decoration:none">VOIR MA DRIVER CARD</a>
    </td></tr></table>
    <p style="margin:0 0 16px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">Nos équipes reviennent vers toi <b style="color:#fff">très vite</b> pour finaliser ton inscription.</p>
    <p style="margin:0 0 6px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">Fais grandir la communauté : invite tes proches, amis et famille à s'inscrire 👇</p>
    <p style="margin:0 0 22px"><a href="${safe.base}/" style="color:#34b8ff;font-family:Arial,Helvetica,sans-serif;font-size:15px">The Ring League</a></p>
  </td></tr>
  <tr><td style="height:1px;background:#1d1e28;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td align="center" style="padding:16px;color:#5c5e6e;font-size:12px;font-family:Arial,Helvetica,sans-serif">The Ring · thering-drive.com</td></tr>
</table>
</td></tr></table></div>`;

    const userText = `Félicitations ${p.first} !\n\nBienvenue dans The Ring League — Season 0. Ton inscription est bien enregistrée.\n\nVoir ma Driver Card : ${link}\n\nPense à vérifier tes spams / courriers indésirables.`;

    await sendEmail(cleanEmail, 'Bienvenue dans The Ring League 🏁', userHtml, userText).catch(() => {});

    return res.status(200).json({ slug, link });

  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
