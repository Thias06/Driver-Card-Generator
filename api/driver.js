// GET /api/driver?slug=...  (réécrit depuis /drivers/:slug)
// Renvoie la page publique de la carte, rendue depuis les données.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function htmlEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

module.exports = async (req, res) => {
  const slug = (req.query && req.query.slug) || '';
  let row = null;

  try {
    const r = await fetch(`${SB}/rest/v1/drivers?slug=eq.${encodeURIComponent(slug)}&status=eq.published&hidden=eq.false&select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    const a = await r.json();
    row = Array.isArray(a) && a[0];
  } catch (e) {}

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!row) {
    return res.status(404).send(`<!doctype html><meta charset="utf-8"><body style="background:#050507;color:#9092a4;font-family:sans-serif;text-align:center;padding:80px">Carte introuvable.</body>`);
  }

  const D = {
    first: row.first_name || '',
    last: row.last_name || '',
    alias: row.alias || '',
    city: row.city || '',
    nationality: row.nationality || '',
    style: row.driving_style || '',
    overall: row.overall || 50,
    level: row.level || 'ROOKIE'
  };

  const title = `${row.alias || 'Pilote'} — The Ring League · Season 0`;
  const og = row.card_url || '';

  res.status(200).send(`<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEsc(title)}</title>
<meta property="og:title" content="${htmlEsc(title)}">
<meta property="og:description" content="Driver Card officielle The Ring League — Season 0 Founders.">
${og ? `<meta property="og:image" content="${htmlEsc(og)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${htmlEsc(og)}">` : ''}
<link rel="stylesheet" href="/card.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(900px 600px at 85% -10%,rgba(122,51,240,.16),transparent 60%),radial-gradient(800px 600px at -10% 110%,rgba(46,84,255,.14),transparent 60%),var(--bg);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 16px;gap:22px}
.wrap{width:100%;max-width:560px;display:flex;justify-content:center}
.cta{font-family:var(--ft);font-size:11px;letter-spacing:3px}
.cta a{background:var(--brand);color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px}
</style></head><body>
<div class="wrap"><div class="cardPost" id="card"></div></div>
<div class="cta"><a href="/">DEVIENS PILOTE OFFICIEL →</a></div>
<script src="/card.js"></script>
<script>
var D=${JSON.stringify(D)}; var P=${JSON.stringify(row.photo_url || '')};
mountPostCard(document.getElementById('card'), D, P);
function fit(){var w=document.querySelector('.wrap'),el=document.getElementById('card');var s=Math.min(1,Math.min(w.clientWidth,520)/1080);el.style.transform='scale('+s+')';w.style.height=(1080*s)+'px';}
window.addEventListener('resize',fit);window.addEventListener('load',fit);setTimeout(fit,300);fit();
</script></body></html>`);
};
