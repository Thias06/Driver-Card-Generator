// POST /api/register  { payload:{...}, photo:dataURL, card:dataURL }
// Stocke photo + carte (Supabase Storage), insère la candidature, envoie 2 emails (Resend).

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
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); }
      catch { resolve({}); }
    });
  });
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dataUrlToBuffer(d) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(d || '');
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

function equipmentLabel(value) {
  if (value === 'achat') return "Achat de l'équipement";
  if (value === 'location') return 'Location (pré-équipé)';
  return '-';
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

async function sendEmail(to, subject, html, attachments) {
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
      subject,
      html,
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

    const body = await readBody(req);
    const p = body.payload || {};
    const lang = (p.language === 'en') ? 'en' : 'fr';
    const en = lang === 'en';

    const cleanEmail = String(p.email || '').trim().toLowerCase();
    const cleanAlias = String(p.alias || '').trim();
    const cleanAliasLower = cleanAlias.toLowerCase();

    if (!p.first || !p.last || !cleanAlias || !cleanEmail) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    if (p.age && parseInt(p.age, 10) < 16) {
      return res.status(400).json({ error: 'Tu dois avoir 16 ans ou plus.' });
    }

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

    const photo = dataUrlToBuffer(body.photo);
    if (photo) {
      const ext = photo.mime.includes('png') ? 'png' : 'jpg';
      photo_url = await sbUpload(`photo/${slug}.${ext}`, photo.mime, photo.buf);
    }

    const card = dataUrlToBuffer(body.card);
    if (card) {
      card_url = await sbUpload(`card/${slug}.png`, 'image/png', card.buf);
    }

    const row = {
      status: 'published',
      hidden: false,
      first_name: p.first,
      last_name: p.last,
      alias: cleanAlias,
      age: p.age ? parseInt(p.age, 10) : null,
      nationality: p.nationality || '',
      city: p.city || '',
      driving_style: p.style || '',
      email: cleanEmail,
      photo_url,
      card_url,
      slug,
      equipment: p.equipment || '',
      language: lang,
      season: 'S0',
      overall: 50,
      level: 'ROOKIE'
    };

    await sbInsert(row);

    const base = `https://${req.headers.host}`;
    const link = `${base}/drivers/${slug}`;
    const cardB64 = card ? card.buf.toString('base64') : null;

    const teamHtml = `<h2>Nouvelle inscription — Season 0</h2>
      <p><b>Pseudo :</b> ${cleanAlias}<br><b>Nom :</b> ${p.first} ${p.last}<br>
      <b>Âge :</b> ${p.age || '-'}<br><b>Ville :</b> ${p.city || '-'} · ${p.nationality || '-'}<br>
      <b>Style :</b> ${p.style || '-'}<br><b>Email :</b> ${cleanEmail}<br>
      <b>Langue :</b> ${en ? 'EN' : 'FR'}<br>
      <b>Formule :</b> ${equipmentLabel(p.equipment)}</p>
      <p><b>Carte :</b> <a href="${card_url}">${card_url}</a><br>
      <b>Lien public :</b> <a href="${link}">${link}</a><br>
      <b>Photo :</b> <a href="${photo_url}">${photo_url}</a></p>`;

    await sendEmail(
      TEAM,
      `🏁 Inscription Season 0 — ${cleanAlias}`,
      teamHtml,
      cardB64 ? [{ filename: `TTR_S0_${slug}.png`, content: cardB64 }] : undefined
    ).catch(() => {});

    const logo = `${base}/ttr-logo.png`;

    const tx = en ? {
      hi:`Congratulations, ${p.first}!`,
      welcome:`Welcome to <b style="color:#fff">La League — Season&nbsp;0 · Founders</b>. Your registration is confirmed and your official Driver Card has been created. 🏁`,
      btn:'VIEW MY DRIVER CARD',
      back:`Our team will get back to you <b style="color:#fff">very soon</b> to finalize your registration.`,
      invite:`Grow the community: invite your friends and family to sign up 👇`
    } : {
      hi:`Félicitations, ${p.first} !`,
      welcome:`Bienvenue dans <b style="color:#fff">La League — Season&nbsp;0 · Founders</b>. Ton inscription est bien enregistrée et ta Driver Card officielle est créée. 🏁`,
      btn:'VOIR MA DRIVER CARD',
      back:`Nos équipes reviennent vers toi <b style="color:#fff">très vite</b> pour finaliser ton inscription.`,
      invite:`Fais grandir la communauté : invite tes proches, amis et famille à s'inscrire 👇`
    };

    const userHtml = `
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
    <p style="margin:0 0 16px;color:#c9cbd8;font-size:16px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.welcome}</p>
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:6px auto 22px"><tr><td style="border-radius:10px;background-image:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0)">
      <a href="${link}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;color:#ffffff;text-decoration:none">${tx.btn}</a>
    </td></tr></table>
    <p style="margin:0 0 16px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.back}</p>
    <p style="margin:0 0 6px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${tx.invite}</p>
    <p style="margin:0 0 22px"><a href="${base}/" style="color:#34b8ff;font-family:Arial,Helvetica,sans-serif;font-size:15px">${base}/</a></p>
  </td></tr>
  <tr><td style="height:1px;background:#1d1e28;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td align="center" style="padding:16px;color:#5c5e6e;font-size:12px;font-family:Arial,Helvetica,sans-serif">The Ring · thering-drive.com</td></tr>
</table>
</td></tr></table></div>`;

    const userSubject = en ? 'Welcome to La League 🏁' : 'Bienvenue dans La League 🏁';
    await sendEmail(cleanEmail, userSubject, userHtml).catch(() => {});

    return res.status(200).json({ slug, link });

  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
