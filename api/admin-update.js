// POST /api/admin-update  (header x-admin-pass)  body: { id, fields:{...} }
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.ADMIN_PASSWORD;

const ADMIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILS = 6;
const ALLOWED = ['alias', 'first_name', 'last_name', 'city', 'nationality', 'driving_style', 'status', 'hidden'];

// Liste de pays unifiée avec le formulaire (valeurs stockées = libellés FR)
const COUNTRIES = ['France','Belgique','Suisse','Luxembourg','Monaco','Canada','Espagne','Italie','Portugal','Allemagne','Royaume-Uni','Maroc','Algérie','Tunisie','Autre'];

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
    let d = ''; req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}
function cleanText(value, max = 80) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max); }

function validatePatch(patch) {
  const out = {};
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40}$/;
  const aliasRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]{2,20}$/;
  const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/;
  for (const k of ALLOWED) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (k === 'hidden') { out.hidden = !!v; continue; }
    if (k === 'status') { if (!['published','pending','rejected'].includes(String(v))) throw new Error('Statut invalide.'); out.status = String(v); continue; }
    if (k === 'alias') { const x = cleanText(v, 20); if (!aliasRegex.test(x)) throw new Error('Pseudo invalide : 2 à 20 caractères (lettres, chiffres, tiret, underscore).'); out.alias = x; continue; }
    if (k === 'first_name' || k === 'last_name') { const x = cleanText(v, 40); if (!nameRegex.test(x)) throw new Error('Nom ou prénom invalide.'); out[k] = x; continue; }
    if (k === 'city') { const x = cleanText(v, 60); if (!cityRegex.test(x)) throw new Error('Ville invalide.'); out.city = x; continue; }
    if (k === 'nationality') { const x = cleanText(v, 30); if (!COUNTRIES.includes(x)) throw new Error('Pays invalide.'); out.nationality = x; continue; }
    if (k === 'driving_style') { const x = cleanText(v, 90); if (/[<>]/.test(x)) throw new Error('Style invalide.'); out.driving_style = x; }
  }
  return out;
}

module.exports = async (req, res) => {
  const ip = getIp(req);
  if (isBlocked(ip)) return res.status(429).json({ error: 'Trop de tentatives admin. Réessaie plus tard.' });
  if (!PASS || req.headers['x-admin-pass'] !== PASS) { recordAdminFail(ip); return res.status(401).json({ error: 'unauthorized' }); }
  clearAdminFails(ip);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const body = await readBody(req);
    if (!body.id) return res.status(400).json({ error: 'id manquant' });
    const patch = validatePatch(body.fields || {});
    const r = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(body.id)}`, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(patch)
    });
    const text = await r.text();
    let json = {}; try { json = JSON.parse(text || '{}'); } catch { json = {}; }
    if (!r.ok) return res.status(500).json({ error: (json && (json.message || json.error)) || text || 'Erreur Supabase' });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
