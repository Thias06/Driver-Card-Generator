// Source unique de la Driver Card (format Post 1080x1080).
// Utilisé par le formulaire, la page publique et l'admin.
(function (g) {
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function up(s) { return esc(s).toUpperCase(); }

  // data = {first,last,alias,city,nationality,style, overall=50, level='ROOKIE'}
  // photoUrl = url de la photo (ou vide -> placeholder)
  g.buildPostCard = function (data, photoUrl) {
    var first = up(data.first), last = up(data.last), alias = up(data.alias || data.last);
    var loc = [up(data.city), up(data.nationality)].filter(Boolean).join(' · ');
    var styleRaw = (data.style || '').trim();
    var style = styleRaw ? '« ' + esc(styleRaw) + ' »' : '';
    var overall = data.overall || 50, level = esc(data.level || 'ROOKIE');
    var full = (first + ' ' + last).trim();
    var showName = (data.showName !== false);
    var photo = photoUrl
      ? '<div class="phimg" style="background-image:url(' + esc(photoUrl) + ')"></div>'
      : '<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><radialGradient id="dbg" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".55"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/></radialGradient><linearGradient id="dsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9edf5"/><stop offset="1" stop-color="#b9c0cf"/></linearGradient><linearGradient id="dvi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2330"/><stop offset="1" stop-color="#070a12"/></linearGradient><linearGradient id="dsn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd8ff" stop-opacity="0"/><stop offset=".45" stop-color="#9fd8ff" stop-opacity=".75"/><stop offset=".6" stop-color="#ffffff" stop-opacity=".15"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0"/></linearGradient></defs><rect width="600" height="600" fill="#0c0d14"/><rect width="600" height="600" fill="url(#dbg)"/><path d="M300 96 C212 96 150 168 146 268 C144 322 150 372 168 420 C182 458 210 486 252 498 L348 498 C390 486 418 458 432 420 C450 372 456 322 454 268 C450 168 388 96 300 96 Z" fill="url(#dsh)" stroke="#8f97a8" stroke-width="5"/><path d="M300 112 C236 112 188 156 172 224 C214 196 262 184 300 184 C338 184 386 196 428 224 C412 156 364 112 300 112 Z" fill="#ffffff" opacity=".14"/><path d="M168 250 C220 224 380 224 432 250 L432 262 C380 238 220 238 168 262 Z" fill="#000" opacity=".22"/><path d="M176 278 C232 250 368 250 424 278 C420 330 392 366 348 384 L252 384 C208 366 180 330 176 278 Z" fill="url(#dvi)"/><path d="M192 286 C240 264 360 264 408 286 C402 326 380 354 344 368 L256 368 C220 354 198 326 192 286 Z" fill="#bfe9ff" opacity=".30"/><path d="M210 292 C250 274 300 272 300 272 L246 360 C224 352 212 330 210 292 Z" fill="url(#dsn)"/><path d="M214 430 C214 414 256 408 300 408 C344 408 386 414 386 430 C386 452 360 472 300 472 C240 472 214 452 214 430 Z" fill="url(#dsh)" stroke="#8f97a8" stroke-width="4"/><rect x="276" y="430" width="48" height="13" rx="6" fill="#070a12"/><path d="M289 110 C295 108 305 108 311 110 L309 246 L291 246 Z" fill="#aab2c2"/><path d="M196 244 C232 228 280 222 300 222 C320 222 368 228 404 244" fill="none" stroke="#aab2c2" stroke-width="6" stroke-linecap="round" opacity=".9"/></svg>';
    return '' +
      '<div class="side"><span>DRIVER CARD LA LEAGUE</span></div>' +
      '<div class="content">' +
        '<div class="top"><div class="kick">SEASON&nbsp;0 — FOUNDERS</div>' +
          '<img class="ttrlogo" src="/ttr-logo.png" alt="The Ring"></div>' +
        '<div class="frame">' +
          '<div class="ph">' + photo + '</div>' +
          '<div class="nameband">' +
            (showName && full ? '<div class="nb-name">' + full + '</div>' : '') +
            '<div class="nb-alias">' + alias + '</div>' +
          '</div>' +
          (style ? '<div class="styleband">' + style + '</div>' : '') +
        '</div>' +
        '<div class="stats">' +
          '<div class="stat"><div class="lbl">OVERALL</div><div class="val"><div class="badge"><b>' + overall + '</b></div></div></div>' +
          '<div class="stat"><div class="lbl">STATUS</div><div class="val"><div class="rookie">' + level + '</div></div></div>' +
        '</div>' +
        '<div class="foot"><div class="u">thering-drive.com</div></div>' +
      '</div>';
  };

  // Monte la carte dans un conteneur .cardPost
  g.mountPostCard = function (el, data, photoUrl) {
    el.className = 'cardPost';
    el.innerHTML = g.buildPostCard(data, photoUrl);
    // auto-ajuste le pseudo pour qu'il ne déborde jamais de la bande
    var a = el.querySelector('.nb-alias');
    if (a) {
      var size = 80, guard = 0;
      a.style.fontSize = size + 'px';
      while (a.scrollWidth > a.clientWidth && size > 30 && guard < 80) {
        size -= 2; a.style.fontSize = size + 'px'; guard++;
      }
    }
  };
})(window);
