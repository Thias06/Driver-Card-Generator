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
    var photo = photoUrl
      ? '<img src="' + esc(photoUrl) + '" alt="" crossorigin="anonymous">'
      : '<div class="pl"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.7-9 6v2h18v-2c0-3.3-4-6-9-6Z"/></svg><span>PHOTO PILOTE</span></div>';
    return '' +
      '<div class="lay">' +
        '<div class="top"><div class="kick">SEASON&nbsp;0 · FOUNDERS</div>' +
          '<img class="ttrlogo" src="/ttr-logo.png" alt="The Ring"></div>' +
        '<div class="ph">' + photo + '</div>' +
        '<div class="pseudo">' + alias + '</div>' +
        '<div class="name">' + full + '</div>' +
        '<div class="loc">' + loc + '</div>' +
        (style ? '<div class="style">' + style + '</div>' : '') +
        '<div class="ovr"><div class="badge"><b>' + overall + '</b></div><div class="rookie">' + level + '</div></div>' +
        '<div class="foot"><div class="s0">SEASON 0 — FOUNDERS</div><div class="u">thering-drive.com</div></div>' +
      '</div>';
  };

  // Monte la carte dans un conteneur .cardPost
  g.mountPostCard = function (el, data, photoUrl) {
    el.className = 'cardPost';
    el.innerHTML = g.buildPostCard(data, photoUrl);
  };
})(window);
