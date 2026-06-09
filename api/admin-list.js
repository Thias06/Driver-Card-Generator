// GET /api/admin-list  (header x-admin-pass)
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

  try {
    const r = await fetch(`${SB}/rest/v1/drivers?select=*&order=created_at.desc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });

    const text = await r.text();
    let json = [];
    try { json = JSON.parse(text || '[]'); } catch { json = []; }

    if (!r.ok) return res.status(500).json({ error: (json && (json.message || json.error)) || text || 'Erreur Supabase' });
    return res.status(200).json(Array.isArray(json) ? json : []);
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
