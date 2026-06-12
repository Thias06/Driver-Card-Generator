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
      : '<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="ds" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#39c4ff"/><stop offset="1" stop-color="#1f93e0"/></linearGradient><radialGradient id="dg" cx="50%" cy="36%" r="62%"><stop offset="0" stop-color="#8fe3ff" stop-opacity=".5"/><stop offset="1" stop-color="#8fe3ff" stop-opacity="0"/></radialGradient></defs><rect width="600" height="600" fill="#0c0d14"/><rect width="600" height="600" fill="url(#dg)"/><path d="M205 430 L205 470 C205 484 216 495 230 495 L370 495 C384 495 395 484 395 470 L395 430 Z" fill="url(#ds)" stroke="#0a3550" stroke-width="6" stroke-linejoin="round"/><path d="M150 332 C150 222 215 150 300 150 C385 150 450 222 450 332 L450 374 C450 410 421 439 385 439 L215 439 C179 439 150 410 150 374 Z" fill="url(#ds)" stroke="#0a3550" stroke-width="6" stroke-linejoin="round"/><path d="M190 300 C250 278 350 278 410 300 L410 344 C350 332 250 332 190 344 Z" fill="#06223a"/><path d="M190 300 C250 278 350 278 410 300 L410 344 C350 332 250 332 190 344 Z" fill="#8fe3ff" opacity=".55"/><path d="M212 312 C260 298 300 297 300 297 L250 340 C228 340 214 332 212 312 Z" fill="#ffffff" opacity=".22"/><path d="M300 150 C330 150 357 160 378 178 L300 200 L222 178 C243 160 270 150 300 150 Z" fill="#fff"/><rect x="288" y="150" width="24" height="285" fill="#fff" opacity=".9"/><rect x="270" y="455" width="60" height="20" rx="10" fill="#06223a"/></svg>';
    return '' +
      '<div class="side"><span>DRIVER CARD THE LEAGUE</span></div>' +
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
