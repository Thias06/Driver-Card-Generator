<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Ring · Season 0</title>
<link rel="stylesheet" href="/card.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:var(--fb);min-height:100vh}
body.locked{overflow:hidden}

/* ===== SPLASH (choix de langue) ===== */
#splash{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:30px;
  background:radial-gradient(1000px 700px at 80% -10%,rgba(122,51,240,.30),transparent 60%),radial-gradient(900px 700px at -10% 110%,rgba(46,84,255,.26),transparent 60%),#040406;
  transition:opacity .6s ease}
#splash.hide{opacity:0;pointer-events:none}
#splash::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px;mask:radial-gradient(circle at 50% 40%,#000,transparent 75%);-webkit-mask:radial-gradient(circle at 50% 40%,#000,transparent 75%);animation:grid 24s linear infinite}
@keyframes grid{from{background-position:0 0,0 0}to{background-position:46px 460px,460px 0}}
.sp-logo{width:180px;max-width:55vw;filter:drop-shadow(0 10px 40px rgba(122,51,240,.5));z-index:2}
.sp-tag{z-index:2;text-align:center}
.sp-tag .l1{font-family:var(--ft);font-size:13px;letter-spacing:4px;background:var(--brand);-webkit-background-clip:text;background-clip:text;color:transparent}
.sp-tag .l2{color:var(--muted);font-size:12px;letter-spacing:2px;margin-top:8px}
.flags{z-index:2;display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
.flagbtn{background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px}
.flagwrap{width:124px;height:82px;border-radius:12px;overflow:hidden;box-shadow:0 14px 38px rgba(0,0,0,.55);border:2px solid rgba(255,255,255,.10);transition:transform .2s,border-color .2s;transform-style:preserve-3d}
.flagbtn:hover .flagwrap{transform:translateY(-4px) scale(1.04);border-color:var(--violet)}
.flagwrap svg{display:block;width:100%;height:100%;animation:wave 3.2s ease-in-out infinite;transform-origin:left center}
.flagbtn:nth-child(2) .flagwrap svg{animation-delay:.5s}
@keyframes wave{0%,100%{transform:perspective(260px) rotateY(-7deg) skewY(1.1deg)}50%{transform:perspective(260px) rotateY(7deg) skewY(-1.1deg)}}
.flaglbl{font-family:var(--ft);font-size:12px;letter-spacing:3px;color:#fff}
.flagsub{font-size:10px;color:var(--muted);letter-spacing:1px;margin-top:-6px}

/* ===== CONTRÔLES FLOTTANTS (langue + musique) ===== */
#topctl{position:fixed;top:14px;right:14px;z-index:90;display:flex;gap:8px;align-items:center;background:rgba(10,11,16,.82);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:11px;padding:6px}
#topctl.hidden{display:none}
.lang2{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.lang2 button{background:#0c0d13;border:none;color:var(--muted);font-family:var(--ft);font-size:10px;letter-spacing:1px;padding:7px 10px;cursor:pointer}
.lang2 button.on{background:var(--brand);color:#fff}

/* ===== APP ===== */
.app{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:380px 1fr;gap:34px;align-items:start;padding:26px 18px 60px}
@media(max-width:920px){.app{grid-template-columns:1fr;gap:24px}}
.controls{background:linear-gradient(180deg,#0e0f15,#090a0e);border:1px solid var(--line);border-radius:18px;padding:22px 20px;position:sticky;top:18px}
@media(max-width:920px){.controls{position:static}}
.bh{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.bh img{width:62px;height:auto}.bh h1{font-family:var(--ft);font-size:12px;letter-spacing:2.5px}
.bh h1 small{display:block;color:var(--muted);font-size:8.5px;letter-spacing:3px;margin-top:3px}
.intro{color:var(--muted);font-size:12px;margin-bottom:18px;line-height:1.5}.intro b{color:#fff}
.field{margin-bottom:13px}
.field label{display:block;font-family:var(--ft);font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
.req{color:#ff4d4d;margin-left:3px}
.field input{width:100%;background:#070809;border:1px solid var(--line);color:var(--txt);border-radius:9px;padding:10px 12px;font-family:var(--fb);font-size:14px;font-weight:600}
.field input:focus{outline:none;border-color:var(--violet);box-shadow:0 0 0 3px rgba(122,51,240,.18)}
.field.invalid input,.field.invalid select{border-color:#ff4d4d;box-shadow:0 0 0 3px rgba(255,77,77,.16)}
.hint-err{display:block;color:#ff8a8a;font-size:10.5px;line-height:1.35;margin-top:5px;font-weight:600}
.hint-err:empty{display:none}
.field select{width:100%;background:#070809 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path fill='%239092a4' d='M0 0h12L6 8z'/></svg>") no-repeat right 12px center;border:1px solid var(--line);color:var(--txt);border-radius:9px;padding:10px 30px 10px 12px;font-family:var(--fb);font-size:14px;font-weight:600;-webkit-appearance:none;appearance:none;cursor:pointer}
.field select:focus{outline:none;border-color:var(--violet);box-shadow:0 0 0 3px rgba(122,51,240,.18)}
.field select option{background:#0e0f15;color:var(--txt)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.photobtn{display:block;text-align:center;background:#070809;border:1px dashed #2c2d3a;color:var(--muted);border-radius:9px;padding:11px;font-size:12px;cursor:pointer;font-family:var(--ft);letter-spacing:1px}
.photobtn:hover{border-color:var(--violet);color:var(--txt)}
.hintinfo{color:#6f7183;font-size:10.5px;line-height:1.45;margin:-2px 0 10px}
.equip{display:grid;gap:9px}
.equip .opt{position:relative;display:block;text-transform:none;letter-spacing:normal;background:#070809;border:1px solid var(--line);border-radius:12px;padding:13px 38px 13px 14px;cursor:pointer;transition:border-color .15s,box-shadow .15s,background .15s}
.equip .opt:hover{border-color:#3a3b4a}
.equip .opt input{position:absolute;opacity:0;pointer-events:none}
.equip .opt .t{display:block;color:#fff;font-family:var(--fb);font-weight:700;font-size:13px;margin-bottom:4px}
.equip .opt .d{display:block;color:var(--muted);font-family:var(--fb);font-size:11px;line-height:1.45}
.equip .opt::after{content:"";position:absolute;top:14px;right:13px;width:18px;height:18px;border-radius:50%;border:2px solid #3a3b4a;box-sizing:border-box}
.equip .opt::before{content:"";position:absolute;top:20px;right:19px;width:6px;height:6px;border-radius:50%;background:transparent;z-index:1}
.equip .opt.sel{border-color:var(--violet);box-shadow:0 0 0 2px rgba(122,51,240,.22);background:#0c0a16}
.equip .opt.sel::after{border-color:var(--violet);background:var(--violet)}
.equip .opt.sel::before{background:#fff}
.fixed{display:flex;gap:8px;margin:14px 0 4px}
.fixed div{flex:1;background:#070809;border:1px solid var(--line);border-radius:9px;padding:9px;text-align:center}
.fixed div span{display:block;font-family:var(--ft);font-size:7.5px;letter-spacing:1.5px;color:var(--muted)}
.fixed div b{font-family:var(--fd);font-style:italic;font-weight:800;font-size:20px;color:#fff}
.fixed div.r b{color:var(--cyan);font-size:15px}
.consent{display:flex;gap:10px;align-items:flex-start;margin:16px 0 12px;color:var(--muted);font-size:11px;line-height:1.45;cursor:pointer}
.consent input{margin-top:2px;accent-color:#7a33f0;width:16px;height:16px;flex:0 0 auto}
.dlbtn{width:100%;background:var(--brand);border:none;color:#fff;font-family:var(--ft);letter-spacing:1.5px;font-size:12px;padding:15px;border-radius:11px;cursor:pointer;box-shadow:0 8px 24px rgba(122,51,240,.35)}
.dlbtn[disabled]{opacity:.45;cursor:not-allowed}.dlbtn:active{transform:translateY(1px)}
.afterReg{margin-top:16px;display:none}.afterReg.show{display:block}
.afterReg .ok{font-family:var(--fd);font-style:italic;font-weight:800;font-size:23px;color:#2bff9e;text-transform:uppercase;line-height:1.05;margin-bottom:6px}
.afterReg .ok2{color:#c9cbd8;font-size:13px;margin-bottom:16px;line-height:1.45}
.afterReg .lbl{font-family:var(--ft);font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:7px}
.afterReg .linkbox{display:flex;gap:8px;background:#070809;border:1px solid var(--violet);border-radius:12px;padding:13px 12px;align-items:center}
.afterReg .linkbox input{flex:1;background:transparent;border:none;color:#fff;font-size:14px;font-weight:600}
.afterReg .linkbox button{background:var(--brand);border:none;color:#fff;border-radius:9px;padding:10px 15px;font-size:11px;font-family:var(--ft);letter-spacing:1px;cursor:pointer}
.afterReg .err{color:#ff8a8a;background:#1a0d10;border:1px solid #5a2330;border-radius:11px;padding:13px;font-size:13px;line-height:1.45;font-weight:600}
.stage{display:flex;justify-content:center}
.previewWrap{width:100%;max-width:480px;display:flex;justify-content:center}
</style></head>
<body class="locked">

<!-- ============ SPLASH ============ -->
<div id="splash">
  <img class="sp-logo" src="/ttr-logo.png" alt="The Ring">
  <div class="sp-tag"><div class="l1">THE RING LEAGUE · SEASON 0</div><div class="l2">Choisis ta langue · Choose your language</div></div>
  <div class="flags">
    <button class="flagbtn" data-lang="fr">
      <span class="flagwrap"><svg viewBox="0 0 90 60"><rect width="30" height="60" x="0" fill="#0b2ea0"/><rect width="30" height="60" x="30" fill="#fff"/><rect width="30" height="60" x="60" fill="#e1000f"/></svg></span>
      <span class="flaglbl">FRANÇAIS</span><span class="flagsub">FR</span>
    </button>
    <button class="flagbtn" data-lang="en">
      <span class="flagwrap"><svg viewBox="0 0 90 60"><clipPath id="uk"><rect width="90" height="60"/></clipPath><g clip-path="url(#uk)"><rect width="90" height="60" fill="#012169"/><path d="M0,0 90,60 M90,0 0,60" stroke="#fff" stroke-width="12"/><path d="M0,0 90,60 M90,0 0,60" stroke="#C8102E" stroke-width="6"/><rect x="37" width="16" height="60" fill="#fff"/><rect y="22" width="90" height="16" fill="#fff"/><rect x="40" width="10" height="60" fill="#C8102E"/><rect y="25" width="90" height="10" fill="#C8102E"/></g></svg></span>
      <span class="flaglbl">ENGLISH</span><span class="flagsub">EN</span>
    </button>
  </div>
</div>

<!-- ============ CONTRÔLES ============ -->
<div id="topctl" class="hidden">
  <div class="lang2"><button data-setlang="fr">FR</button><button data-setlang="en">EN</button></div>
</div>

<!-- ============ FORMULAIRE ============ -->
<div class="app">
  <div class="controls">
    <div class="bh"><img src="/ttr-logo.png" alt="The Ring"><h1><span data-i18n="h1">DEVIENS PILOTE OFFICIEL</span><small>THE RING LEAGUE · SEASON 0</small></h1></div>
    <p class="intro" data-i18n="intro"></p>
    <div class="row2">
      <div class="field"><label><span data-i18n="l_first"></span><span class="req">*</span></label><input id="i_first" maxlength="40" data-ph="ph_first"></div>
      <div class="field"><label><span data-i18n="l_last"></span><span class="req">*</span></label><input id="i_last" maxlength="40" data-ph="ph_last"></div>
    </div>
    <div class="field"><label><span data-i18n="l_alias"></span><span class="req">*</span></label><input id="i_alias" maxlength="20" data-ph="ph_alias"></div>
    <div class="row2">
      <div class="field"><label><span data-i18n="l_age"></span><span class="req">*</span></label><input id="i_age" inputmode="numeric" maxlength="2" data-ph="ph_age"></div>
      <div class="field"><label><span data-i18n="l_country"></span><span class="req">*</span></label><select id="i_nat"></select></div>
    </div>
    <div class="field"><label><span data-i18n="l_city"></span><span class="req">*</span></label><input id="i_city" maxlength="60" data-ph="ph_city"></div>
    <div class="field"><label><span data-i18n="l_email"></span><span class="req">*</span></label><input id="i_email" type="email" maxlength="80" data-ph="ph_email"></div>
    <div class="field"><label data-i18n="l_style"></label><input id="i_style" maxlength="90" data-ph="ph_style"></div>

    <div class="field"><label><span data-i18n="l_formule"></span><span class="req">*</span></label>
      <p class="hintinfo" data-i18n="hint_formule"></p>
      <div class="equip" id="equip">
        <label class="opt"><input type="radio" name="equip" value="achat">
          <span class="t" data-i18n="opt_achat_t"></span><span class="d" data-i18n="opt_achat_d"></span></label>
        <label class="opt"><input type="radio" name="equip" value="location">
          <span class="t" data-i18n="opt_loc_t"></span><span class="d" data-i18n="opt_loc_d"></span></label>
      </div>
    </div>

    <div class="field" style="margin-top:4px"><label data-i18n="l_photo"></label>
      <label class="photobtn" for="i_photo" data-i18n="btn_photo"></label>
      <input id="i_photo" type="file" accept="image/*" style="display:none"></div>
    <div class="fixed">
      <div><span data-i18n="f_overall">OVERALL</span><b>50</b></div><div class="r"><span data-i18n="f_level">NIVEAU</span><b>ROOKIE</b></div><div><span data-i18n="f_season">SAISON</span><b style="font-size:15px">S0</b></div>
    </div>
    <label class="consent"><input type="checkbox" id="i_consent"><span data-i18n="consent"></span></label>
    <button class="dlbtn" id="inscription" disabled data-i18n="btn_submit"></button>
    <div id="afterReg" class="afterReg"></div>
  </div>
  <div class="stage"><div class="previewWrap"><div class="cardPost" id="card"></div></div></div>
</div>

<script src="/card.js"></script>
<script>
const $=id=>document.getElementById(id);
let photoData='', LANG='fr';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ===== Pays (valeur stockée = libellé FR ; affichage localisé) ===== */
const COUNTRIES=[
 {v:'France',fr:'France',en:'France'},{v:'Belgique',fr:'Belgique',en:'Belgium'},
 {v:'Suisse',fr:'Suisse',en:'Switzerland'},{v:'Luxembourg',fr:'Luxembourg',en:'Luxembourg'},
 {v:'Monaco',fr:'Monaco',en:'Monaco'},{v:'Canada',fr:'Canada',en:'Canada'},
 {v:'Espagne',fr:'Espagne',en:'Spain'},{v:'Italie',fr:'Italie',en:'Italy'},
 {v:'Portugal',fr:'Portugal',en:'Portugal'},{v:'Allemagne',fr:'Allemagne',en:'Germany'},
 {v:'Royaume-Uni',fr:'Royaume-Uni',en:'United Kingdom'},{v:'Maroc',fr:'Maroc',en:'Morocco'},
 {v:'Algérie',fr:'Algérie',en:'Algeria'},{v:'Tunisie',fr:'Tunisie',en:'Tunisia'},
 {v:'Autre',fr:'Autre',en:'Other'}
];

/* ===== Traductions ===== */
const I18N={
 fr:{
  h1:'DEVIENS PILOTE OFFICIEL',
  intro:'Rejoins la première ligue officielle The Ring. Obtiens ta Driver Card et entre dans le classement.',
  l_first:'Prénom',l_last:'Nom',l_alias:'Pseudo',l_age:'Âge',l_country:'Pays',l_city:'Ville',l_email:'Email',l_style:'Style de conduite',
  ph_first:'Prénom',ph_last:'Nom',ph_alias:'Ton pseudo de pilote',ph_age:'16 à 99',ph_city:'Ta ville',ph_email:'ton@email.com',ph_style:'Définis-toi en quelques mots (optionnel)',
  l_formule:'Formule',hint_formule:"Purement informatif, sans engagement : ça permet juste à The Ring de te recontacter au sujet de ton futur équipement.",
  opt_achat_t:"J'achète mon équipement",opt_achat_d:"Mon véhicule RC haut de gamme à moi. L'équipement de téléopération (caméra + système de communication) est monté puis démonté sur place à chaque venue.",
  opt_loc_t:'Je loue (pré-équipé)',opt_loc_d:'Véhicule prêt à rouler fourni par The Ring. Idéal pour débuter et découvrir.',
  l_photo:'Photo du pilote (optionnel)',btn_photo:'⇪ IMPORTER UNE PHOTO',f_overall:'OVERALL',f_level:'NIVEAU',f_season:'SAISON',
  consent:"J'ai 16 ans ou plus et j'accepte que ma Driver Card (photo + infos) soit publiée par The Ring et qu'un lien public soit créé.",
  btn_submit:"S'INSCRIRE",gen:'GÉNÉRATION…',
  ok_title:'✓ Inscription enregistrée !',ok_text:'Ta carte est téléchargée. Tu vas recevoir un email de confirmation — pense à vérifier tes spams / courriers indésirables. Nos équipes reviennent vers toi très vite.',
  link_label:'TON LIEN PERSONNEL À PARTAGER',copy:'COPIER',copied:'COPIÉ ✓',
  err_email:"Adresse email invalide. Vérifie le format (ex. prenom@mail.com).",err_age:"L'âge doit être un nombre entre 16 et 99.",err_generic:'Inscription impossible.'
 },
 en:{
  h1:'BECOME AN OFFICIAL DRIVER',
  intro:'Join the first official The Ring league. Get your Driver Card and enter the ranking.',
  l_first:'First name',l_last:'Last name',l_alias:'Nickname',l_age:'Age',l_country:'Country',l_city:'City',l_email:'Email',l_style:'Driving style',
  ph_first:'First name',ph_last:'Last name',ph_alias:'Your driver nickname',ph_age:'16 to 99',ph_city:'Your city',ph_email:'you@email.com',ph_style:'Describe yourself in a few words (optional)',
  l_formule:'Plan',hint_formule:'For information only, no commitment: it just lets The Ring contact you about your future equipment.',
  opt_achat_t:'I buy my equipment',opt_achat_d:'My own high-end RC car. The teleoperation gear (camera + comms) is fitted then removed on site at each visit.',
  opt_loc_t:'I rent (pre-equipped)',opt_loc_d:'Ready-to-drive vehicle provided by The Ring. Perfect to start and discover.',
  l_photo:'Driver photo (optional)',btn_photo:'⇪ UPLOAD A PHOTO',f_overall:'OVERALL',f_level:'LEVEL',f_season:'SEASON',
  consent:'I am 16 or older and I agree that my Driver Card (photo + info) is published by The Ring and that a public link is created.',
  btn_submit:'SIGN UP',gen:'GENERATING…',
  ok_title:'✓ Registration saved!',ok_text:'Your card has been downloaded. You will receive a confirmation email — please check your spam / junk folder. Our team will get back to you very soon.',
  link_label:'YOUR PERSONAL LINK TO SHARE',copy:'COPY',copied:'COPIED ✓',
  err_email:'Invalid email address. Check the format (e.g. name@mail.com).',err_age:'Age must be a number between 16 and 99.',err_generic:'Registration failed.'
 }
};
const T=k=>I18N[LANG][k]||k;

function buildCountries(){const s=$('i_nat');s.innerHTML='';COUNTRIES.forEach((c,i)=>{const o=document.createElement('option');o.value=c.v;o.textContent=c[LANG];if(i===0)o.selected=true;s.appendChild(o);});}
function applyLang(lang){
  LANG=(lang==='en')?'en':'fr';
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=T(el.getAttribute('data-i18n'));});
  document.querySelectorAll('[data-ph]').forEach(el=>{el.placeholder=T(el.getAttribute('data-ph'));});
  // libellés pays
  const cur=$('i_nat').value;[...$('i_nat').options].forEach((o,i)=>{o.textContent=COUNTRIES[i][LANG];});$('i_nat').value=cur;
  // boutons langue
  document.querySelectorAll('[data-setlang]').forEach(b=>b.classList.toggle('on',b.getAttribute('data-setlang')===LANG));
  // bouton submit (si pas en cours de génération)
  if(!$('inscription').dataset.busy)$('inscription').textContent=T('btn_submit');
  if(typeof validateEmailField==='function'){validateEmailField();validateAgeField();}
  render();checkForm();
}

function eq(){const e=document.querySelector('input[name=equip]:checked');return e?e.value:'';}
function data(){return{first:$('i_first').value,last:$('i_last').value,alias:$('i_alias').value,age:$('i_age').value,nationality:$('i_nat').value,city:$('i_city').value,style:$('i_style').value,email:$('i_email').value,equipment:eq(),language:LANG,overall:50,level:'ROOKIE',season:'S0'};}
function render(){mountPostCard($('card'),data(),photoData);fit();}
function onField(){render();checkForm();}
function clean(el,re){const p=el.selectionStart;el.value=el.value.replace(re,'');try{el.setSelectionRange(p,p);}catch(e){}}
$('i_first').addEventListener('input',()=>{clean($('i_first'),/[^\p{L} \-']/gu);onField();});
$('i_last').addEventListener('input',()=>{clean($('i_last'),/[^\p{L} \-']/gu);onField();});
$('i_city').addEventListener('input',()=>{clean($('i_city'),/[^\p{L} \-']/gu);onField();});
$('i_alias').addEventListener('input',()=>{clean($('i_alias'),/[^\p{L}0-9_\-]/gu);onField();});
$('i_age').addEventListener('input',()=>{$('i_age').value=$('i_age').value.replace(/\D/g,'').slice(0,2);validateAgeField();onField();});
$('i_style').addEventListener('input',onField);
$('i_nat').addEventListener('change',onField);
$('i_email').addEventListener('input',()=>{validateEmailField();checkForm();});
$('i_consent').addEventListener('change',checkForm);
$('i_photo').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{photoData=ev.target.result;render();};r.readAsDataURL(f);});
document.querySelectorAll('input[name=equip]').forEach(r=>r.addEventListener('change',()=>{document.querySelectorAll('.equip .opt').forEach(o=>o.classList.remove('sel'));r.closest('.opt').classList.add('sel');checkForm();}));

function fit(){const w=document.querySelector('.previewWrap'),el=$('card');const s=Math.min(1,Math.min(w.clientWidth,460)/1080);el.style.transform=`scale(${s})`;w.style.height=(1080*s)+'px';}
window.addEventListener('resize',fit);
function checkForm(){const v=data();const ok=$('i_consent').checked&&v.first.trim()&&v.last.trim()&&v.alias.trim()&&v.age.trim()&&v.nationality.trim()&&v.city.trim()&&v.email.trim()&&v.equipment;$('inscription').disabled=!ok;}
const slugify=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function showErr(msg){$('afterReg').innerHTML=`<div class="err">${msg}</div>`;$('afterReg').classList.add('show');$('afterReg').scrollIntoView({behavior:'smooth',block:'nearest'});}

/* ===== Validation par champ : bordure rouge + texte d'aide ===== */
function fieldOf(input){return input.closest('.field');}
function setHint(input,msg){const f=fieldOf(input);if(!f)return;f.classList.add('invalid');let h=f.querySelector('.hint-err');if(!h){h=document.createElement('small');h.className='hint-err';f.appendChild(h);}h.textContent=msg;}
function clearHint(input){const f=fieldOf(input);if(!f)return;f.classList.remove('invalid');const h=f.querySelector('.hint-err');if(h)h.textContent='';}
function validateEmailField(){const v=$('i_email').value.trim();if(v&&!EMAIL_RE.test(v)){setHint($('i_email'),T('err_email'));return false;}clearHint($('i_email'));return EMAIL_RE.test(v);}
function validateAgeField(){const v=$('i_age').value.trim();const n=parseInt(v,10);if(v&&!(n>=16&&n<=99)){setHint($('i_age'),T('err_age'));return false;}clearHint($('i_age'));return n>=16&&n<=99;}

async function generateCard(){
  const stage=document.createElement('div');
  stage.style.cssText='position:fixed;left:-10000px;top:0;width:1080px;height:1080px;z-index:-1';
  const card=document.createElement('div');stage.appendChild(card);document.body.appendChild(stage);
  mountPostCard(card,data(),photoData);
  await (document.fonts&&document.fonts.ready);
  const img=card.querySelector('img');
  if(img&&!img.complete){await new Promise(r=>{img.onload=r;img.onerror=r;});}
  await new Promise(r=>setTimeout(r,60));
  const cv=await html2canvas(card,{width:1080,height:1080,windowWidth:1080,windowHeight:1080,scale:1,backgroundColor:'#040406',useCORS:true});
  document.body.removeChild(stage);
  return cv;
}

$('inscription').onclick=async()=>{
  unlockAudio();
  const eOk=validateEmailField(), aOk=validateAgeField();
  if(!eOk||!aOk){const bad=!eOk?$('i_email'):$('i_age');bad.focus();bad.scrollIntoView({behavior:'smooth',block:'center'});return;}
  const btn=$('inscription');btn.dataset.busy='1';btn.disabled=true;btn.textContent=T('gen');
  $('afterReg').classList.remove('show');$('afterReg').innerHTML='';
  try{
    const cv=await generateCard();
    const cardPng=cv.toDataURL('image/png');
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
    const slug=slugify($('i_alias').value||$('i_last').value);
    const res=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload:data(),photo:photoData,card:cardPng})});
    const t=await res.text();let j={};try{j=JSON.parse(t);}catch(e){}
    if(!res.ok){throw new Error(j.error||T('err_generic'));}
    playRevV6();
    const link=location.origin+'/drivers/'+(j.slug||slug);
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.download=`TTR_S0_${slug}.png`;a.href=url;a.click();
    $('afterReg').innerHTML=`<div class="ok">${T('ok_title')}</div><div class="ok2">${T('ok_text')}</div>
      <div class="lbl">${T('link_label')}</div>
      <div class="linkbox"><input value="${link}" readonly><button id="cp">${T('copy')}</button></div>`;
    $('afterReg').classList.add('show');$('afterReg').scrollIntoView({behavior:'smooth',block:'nearest'});
    $('cp').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(link);$('cp').textContent=T('copied');};
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }catch(e){showErr((e&&e.message)?e.message:T('err_generic'));}
  delete btn.dataset.busy;btn.textContent=T('btn_submit');checkForm();
};

/* ===== SON V6 (Web Audio synthétisé — joué à l'inscription validée) ===== */
let revCtx=null;
function unlockAudio(){ /* appelé DANS le clic (obligatoire iOS) */
  try{ if(!revCtx){const C=window.AudioContext||window.webkitAudioContext; if(!C)return; revCtx=new C();}
       if(revCtx.state==='suspended') revCtx.resume(); }catch(e){}
}
function playRevV6(){
  if(!revCtx) return;
  try{
    const ctx=revCtx, t0=ctx.currentTime;
    const master=ctx.createGain(); master.gain.value=0.0001; master.connect(ctx.destination);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=7;
    lp.frequency.setValueAtTime(420,t0); lp.frequency.exponentialRampToValueAtTime(4800,t0+1.5);
    const trem=ctx.createGain(); trem.gain.value=0.72; lp.connect(trem); trem.connect(master);
    const f0=68, f1=250; // ralenti -> haut régime
    [[1,0.5],[2,0.30],[3,0.17],[4,0.09]].forEach(([mult,vol])=>{
      const o=ctx.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(f0*mult,t0);
      o.frequency.exponentialRampToValueAtTime(f1*mult,t0+1.45);
      const g=ctx.createGain(); g.gain.value=vol; o.connect(g); g.connect(lp);
      o.start(t0); o.stop(t0+2.0);
    });
    // pulsation moteur (allumage) qui accélère
    const lfo=ctx.createOscillator(); lfo.type='square';
    lfo.frequency.setValueAtTime(16,t0); lfo.frequency.exponentialRampToValueAtTime(80,t0+1.45);
    const lfoG=ctx.createGain(); lfoG.gain.value=0.28; lfo.connect(lfoG); lfoG.connect(trem.gain);
    lfo.start(t0); lfo.stop(t0+2.0);
    // grain
    const nb=ctx.createBuffer(1, Math.floor(ctx.sampleRate*2), ctx.sampleRate); const nd=nb.getChannelData(0);
    for(let i=0;i<nd.length;i++) nd[i]=(Math.random()*2-1);
    const noise=ctx.createBufferSource(); noise.buffer=nb; const ng=ctx.createGain(); ng.gain.value=0.06;
    noise.connect(ng); ng.connect(lp); noise.start(t0); noise.stop(t0+1.9);
    // enveloppe : montée franche, tenue, coupe (vrooom)
    master.gain.setValueAtTime(0.0001,t0);
    master.gain.exponentialRampToValueAtTime(0.25,t0+0.16);
    master.gain.setValueAtTime(0.25,t0+1.45);
    master.gain.exponentialRampToValueAtTime(0.0001,t0+1.95);
  }catch(e){}
}

/* ===== SPLASH -> choix langue ===== */
document.querySelectorAll('.flagbtn').forEach(b=>b.addEventListener('click',()=>{
  applyLang(b.getAttribute('data-lang'));
  $('splash').classList.add('hide');
  $('topctl').classList.remove('hidden');
  document.body.classList.remove('locked');
  setTimeout(()=>{$('splash').style.display='none';fit();},650);
}));
document.querySelectorAll('[data-setlang]').forEach(b=>b.addEventListener('click',()=>applyLang(b.getAttribute('data-setlang'))));

/* init */
buildCountries();applyLang('fr');
window.addEventListener('load',fit);setTimeout(fit,300);
</script>
</body></html>
