// GET /api/driver?slug=tonton
// Affiche la Driver Card publique depuis Supabase.
// Version consolidée : on utilise uniquement api/driver.js.
// Supprime api/public-driver.js pour éviter les doublons.

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSlug(req) {
  if (req.query && req.query.slug) return slugify(req.query.slug);

  try {
    const host = req.headers.host || 'localhost';
    const u = new URL(req.url, `https://${host}`);
    return slugify(u.searchParams.get('slug') || '');
  } catch {
    return '';
  }
}

async function getDriver(slug) {
  const url = `${SB}/rest/v1/drivers?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`;

  const r = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`
    }
  });

  const text = await r.text();
  let json = [];
  try { json = JSON.parse(text || '[]'); } catch { json = []; }

  if (!r.ok) {
    throw new Error((json && (json.message || json.error)) || text || 'Erreur Supabase');
  }

  return Array.isArray(json) ? json[0] : null;
}

module.exports = async (req, res) => {
  try {
    if (!SB || !KEY) {
      return res.status(500).send('Variables Supabase manquantes.');
    }

    const slug = getSlug(req);

    if (!slug) {
      return res.status(400).send('Slug manquant.');
    }

    const d = await getDriver(slug);

    if (!d) {
      return res.status(404).send('Carte introuvable.');
    }

    if (d.hidden === true || d.hidden === 'true') {
      return res.status(404).send('Carte introuvable.');
    }

    if (d.status && d.status !== 'published') {
      return res.status(404).send('Carte introuvable.');
    }

    const alias = esc(d.alias || slug);
    const first = esc(d.first_name || '');
    const last = esc(d.last_name || '');
    const city = esc(d.city || '');
    const country = esc(d.nationality || '');
    const style = esc(d.driving_style || '');
    const age = d.age ? esc(d.age) : '';
    const card = esc(d.card_url || '');
    const title = `The Ring League · ${alias}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Driver Card officielle The Ring League">
${card ? `<meta property="og:image" content="${card}">` : ''}
<style>
*{box-sizing:border-box}
body{
  margin:0;
  min-height:100vh;
  background:radial-gradient(800px 500px at 80% -10%,rgba(122,51,240,.22),transparent 60%),#050507;
  color:#fff;
  font-family:Arial,Helvetica,sans-serif;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}
.wrap{width:100%;max-width:620px;text-align:center}
.logo{width:150px;margin:0 auto 18px;display:block}
.card{
  background:#0b0c12;
  border:1px solid #242532;
  border-radius:22px;
  padding:20px;
  box-shadow:0 20px 60px rgba(0,0,0,.45);
}
.cardimg{width:100%;border-radius:16px;display:block;background:#111}
h1{font-size:28px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:1px}
.meta{color:#c9cbd8;line-height:1.55;font-size:15px;margin:0 0 14px}
.badge{
  display:inline-block;
  margin-top:8px;
  padding:8px 12px;
  border-radius:999px;
  background:linear-gradient(90deg,#2e54ff,#7a33f0,#e22ed0);
  font-weight:800;
  font-size:12px;
  letter-spacing:1px;
}
</style>
</head>
<body>
  <main class="wrap">
    <img class="logo" src="/ttr-logo.png" alt="The Ring">
    <section class="card">
      ${card ? `<img class="cardimg" src="${card}" alt="Driver Card ${alias}">` : ''}
      <h1>${alias}</h1>
      <p class="meta">
        ${first || last ? `${first} ${last}<br>` : ''}
        ${age ? `${age} ans<br>` : ''}
        ${city || country ? `${city}${city && country ? ' · ' : ''}${country}<br>` : ''}
        ${style ? `Style : ${style}` : ''}
      </p>
      <div class="badge">THE RING LEAGUE · SEASON 0</div>
    </section>
  </main>
</body>
</html>`);
  } catch (e) {
    return res.status(500).send(`Erreur driver: ${esc(e && e.message ? e.message : e)}`);
  }
};
