// POST /api/admin-thanks  (header x-admin-pass)  body: { id }
// Envoie manuellement à un pilote (ancien inscrit) un mail de remerciement + la
// plaquette tarifs_TR.pdf en pièce jointe, avec les options listées dans le corps.
// Le pilote répond directement à contact@thering-drive.com avec ses choix.

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.ADMIN_PASSWORD;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.FROM_EMAIL || 'The Ring <onboarding@resend.dev>';
const CONTACT = process.env.CONTACT_EMAIL || 'contact@thering-drive.com';

const ADMIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILS = 6;

function getIp(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '')
    .split(',')[0].trim() || 'unknown';
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
function clearAdminFails(ip) { if (globalThis.__ttrAdminFails) globalThis.__ttrAdminFails.delete(ip); }

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

async function sendEmail(to, subject, html, attachments, replyTo) {
  if (!RESEND || !to) return false;
  const payload = { from: FROM, to: [to], subject, html };
  if (attachments) payload.attachments = attachments;
  if (replyTo) payload.reply_to = replyTo;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return r.ok;
}

async function tryAttachTarifs(base) {
  try {
    const r = await fetch(`${base}/tarifs_TR.pdf`);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    if (!ab || ab.byteLength === 0) return null;
    return [{ filename: 'tarifs_TR.pdf', content: Buffer.from(ab).toString('base64') }];
  } catch (e) { return null; }
}

function thanksHtml(row, contact) {
  const en = (row.language === 'en');
  const first = row.first_name || '';
  const logo = 'https://www.thering-drive.com/ttr-logo-2x.png';

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
</table></td></tr></table></div>`;
  const P = (t, mb = 16) => `<p style="margin:0 0 ${mb}px;color:#c9cbd8;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif">${t}</p>`;

  if (en) {
    return head + `
  <tr><td style="padding:28px 30px 6px"><div style="font-family:Arial,sans-serif;font-weight:800;font-size:27px;color:#fff;text-transform:uppercase">Thank you, ${first}!</div></td></tr>
  <tr><td style="padding:6px 30px 0">
    ${P(`Thanks for being one of the first drivers of <b style="color:#fff">La League — Season&nbsp;0 · Founders</b>. 🏁 You'll find the full <b style="color:#fff">pricing &amp; plans</b> in the attached PDF.`)}
    ${P(`<b style="color:#fff">The options you can choose from:</b>`, 8)}
    ${P(`• <b style="color:#fff">Rental</b> — official machine provided & maintained on site.<br>
        • <b style="color:#fff">Purchase</b> — your own machine: Chassis kit <b style="color:#fff">365 €</b> (kit form) or <b style="color:#fff">435 €</b> (built), body ready to paint <b style="color:#fff">45 €</b>, optional Paint&nbsp;+&nbsp;Stickers pack <b style="color:#fff">+100 €</b>, optional Home Practice Kit <b style="color:#fff">+185 €</b>.`)}
    ${P(`<b style="color:#fff">To get your quote:</b> just reply to this email at <a href="mailto:${contact}" style="color:#34b8ff">${contact}</a> with your choices (plan + options), and we'll send it over.`)}
  </td></tr>` + foot;
  }
  return head + `
  <tr><td style="padding:28px 30px 6px"><div style="font-family:Arial,sans-serif;font-weight:800;font-size:27px;color:#fff;text-transform:uppercase">Merci, ${first} !</div></td></tr>
  <tr><td style="padding:6px 30px 0">
    ${P(`Merci de faire partie des tout premiers pilotes de <b style="color:#fff">La League — Saison&nbsp;0 · Founders</b>. 🏁 Tu trouveras l'ensemble des <b style="color:#fff">tarifs &amp; formules</b> dans le PDF joint.`)}
    ${P(`<b style="color:#fff">Les options que tu peux choisir :</b>`, 8)}
    ${P(`• <b style="color:#fff">Location</b> — machine officielle fournie et entretenue sur place.<br>
        • <b style="color:#fff">Achat</b> — ta propre machine : Kit châssis <b style="color:#fff">365 €</b> (à monter) ou <b style="color:#fff">435 €</b> (monté), carrosserie prête à peindre <b style="color:#fff">45 €</b>, option Forfait Peinture&nbsp;+&nbsp;Stickage <b style="color:#fff">+100 €</b>, option Kit Pilotage Maison <b style="color:#fff">+185 €</b>.`)}
    ${P(`<b style="color:#fff">Pour recevoir ton devis :</b> réponds simplement à cet email à <a href="mailto:${contact}" style="color:#34b8ff">${contact}</a> avec tes choix (formule + options), et on te l'envoie.`)}
  </td></tr>` + foot;
}

module.exports = async (req, res) => {
  const ip = getIp(req);
  if (isBlocked(ip)) return res.status(429).json({ error: 'Trop de tentatives admin. Réessaie plus tard.' });
  if (!PASS || req.headers['x-admin-pass'] !== PASS) { recordAdminFail(ip); return res.status(401).json({ error: 'unauthorized' }); }
  clearAdminFails(ip);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  try {
    if (!SB || !KEY) return res.status(500).json({ error: 'Variables Supabase manquantes.' });
    const body = await readBody(req);
    if (!body.id) return res.status(400).json({ error: 'id manquant' });

    const g = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(body.id)}&select=id,email,first_name,alias,language`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    const gj = await g.json();
    const row = Array.isArray(gj) ? gj[0] : null;
    if (!row) return res.status(404).json({ error: 'Candidat introuvable.' });
    if (!row.email) return res.status(400).json({ error: "Ce candidat n'a pas d'email." });

    const base = `https://${req.headers.host}`;
    const attachments = await tryAttachTarifs(base);
    const en = (row.language === 'en');
    const subject = en ? 'La League — pricing & plans 🏁' : 'La League — tarifs & formules 🏁';

    const ok = await sendEmail(row.email, subject, thanksHtml(row, CONTACT), attachments || undefined, CONTACT);
    if (!ok) return res.status(500).json({ error: "L'email n'a pas pu être envoyé (Resend)." });

    return res.status(200).json({ ok: true, attached: !!attachments });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
