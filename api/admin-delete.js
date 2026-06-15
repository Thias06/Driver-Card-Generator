// POST /api/admin-delete  (header x-admin-pass)
// body: { items: [ { id, photo_url, card_url }, ... ] }   (ou { id, photo_url, card_url } pour une seule)
// Supprime DÉFINITIVEMENT la (les) ligne(s) dans la table drivers + les fichiers Storage liés.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.ADMIN_PASSWORD;

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

// Déduit le chemin Storage ("photo/slug.jpg") depuis l'URL publique Supabase.
function storagePathFromUrl(u) {
  if (!u) return '';
  const parts = String(u).split('/object/public/media/');
  if (parts.length < 2) return '';
  return decodeURIComponent(parts[1].split('?')[0]);
}

async function deleteStorage(path) {
  if (!path) return;
  try {
    const safe = path.split('/').map(encodeURIComponent).join('/');
    await fetch(`${SB}/storage/v1/object/media/${safe}`, {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
  } catch (e) { /* best-effort : on n'échoue pas la suppression pour un fichier manquant */ }
}

async function deleteRow(id) {
  const r = await fetch(`${SB}/rest/v1/drivers?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Prefer: 'return=representation'
    }
  });
  const text = await r.text();
  if (!r.ok) {
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch { json = {}; }
    throw new Error((json && (json.message || json.error)) || text || 'Erreur suppression Supabase');
  }
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
    if (!SB || !KEY) return res.status(500).json({ error: 'Variables Supabase manquantes.' });

    const body = await readBody(req);
    let items = Array.isArray(body.items) ? body.items : null;
    if (!items && body.id) items = [{ id: body.id, photo_url: body.photo_url, card_url: body.card_url }];
    items = (items || []).filter(it => it && (it.id !== undefined && it.id !== null && it.id !== ''));

    if (!items.length) return res.status(400).json({ error: 'Aucune carte à supprimer.' });

    let deleted = 0;
    const errors = [];

    for (const it of items) {
      try {
        // 1) fichiers Storage (best-effort), 2) ligne en base
        await deleteStorage(storagePathFromUrl(it.photo_url));
        await deleteStorage(storagePathFromUrl(it.card_url));
        await deleteRow(it.id);
        deleted += 1;
      } catch (e) {
        errors.push(String(e && e.message || e));
      }
    }

    return res.status(200).json({ deleted, total: items.length, errors });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
