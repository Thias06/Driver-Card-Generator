# The Ring — La League · Season 0 (Founders)

Site d'inscription des premiers pilotes + page publique de chaque carte + back-office.

## Ce que ça fait

Quand un visiteur remplit le formulaire et clique **S'INSCRIRE** :
1. sa **Driver Card** est générée et **téléchargée** sur son appareil ;
2. sur smartphone, le **partage** s'ouvre (Instagram apparaît dans la liste) ;
3. un **lien personnalisé** est créé : `ton-projet.vercel.app/drivers/pseudo` (consultable à tout moment) ;
4. un **email de confirmation** part vers le pilote (avec son lien) ;
5. un **email part vers l'équipe** (`mtthias@hotmail.com`) avec **toutes les infos + la carte en pièce jointe** (Manon peut poster directement).

Une page **/admin** permet de lister, prévisualiser, **modifier les infos** (modération), masquer/réafficher et télécharger les visuels.

---

## Mise en ligne — 3 comptes gratuits, ~30 min

> Les **pilotes n'ont aucun compte à créer**. Ces 3 comptes sont uniquement pour toi (l'équipe), une seule fois.

### 1) Supabase (base de données + stockage des photos) — gratuit
1. Va sur **supabase.com** → *Start your project* → crée un projet (note le mot de passe).
2. Menu **SQL Editor** → *New query* → colle le contenu de `schema.sql` → **Run**.
3. Menu **Storage** → *New bucket* → nom **`media`** → coche **Public** → créer.
4. Menu **Settings → API** → copie **Project URL** et la clé **`service_role`** (la longue, secrète).

### 2) Resend (envoi des emails) — gratuit
1. Va sur **resend.com** → inscris-toi **avec l'email `mtthias@hotmail.com`**.
2. Menu **API Keys** → *Create* → copie la clé (`re_...`).
3. *(Optionnel mais recommandé)* Menu **Domains** → ajoute `thering-drive.com` et colle les 3 enregistrements DNS chez ton hébergeur de domaine. Tant que ce n'est pas fait :
   - l'email **vers l'équipe** fonctionne (il arrive sur `mtthias@hotmail.com`, ton adresse de compte) ;
   - l'email **vers le pilote** (adresse quelconque) ne partira qu'une fois le domaine vérifié. Aucune inscription n'est perdue pour autant (l'équipe reçoit tout).

### 3) Vercel (hébergement du site) — gratuit
1. Va sur **vercel.com** → inscris-toi (avec GitHub, c'est le plus simple).
2. *Add New… → Project* → importe ce dossier (glisser-déposer le ZIP, ou via GitHub).
3. Avant de déployer, ouvre **Environment Variables** et ajoute (valeurs du `.env.example`) :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`
   - `TEAM_EMAIL` = `mtthias@hotmail.com`
   - `FROM_EMAIL` = `The Ring <onboarding@resend.dev>` (puis `league@thering-drive.com` après vérif domaine)
   - `ADMIN_PASSWORD` = un mot de passe de ton choix (pour /admin)
4. **Deploy**. Vercel te donne une URL du type `ton-projet.vercel.app`.

C'est en ligne. Le formulaire = la page d'accueil ; l'admin = `…vercel.app/admin`.

---

## Tester
1. Ouvre l'URL → remplis, ajoute une photo, coche le consentement → **S'INSCRIRE**.
2. La carte se télécharge ; va sur `…/admin` (mot de passe) → l'inscription apparaît.
3. Ouvre `…/drivers/ton-pseudo` → la carte publique s'affiche.
4. Vérifie l'email reçu sur `mtthias@hotmail.com`.

## Pour Manon
- Chaque inscription arrive par email avec la carte en pièce jointe (prête à poster).
- Sinon, tout est dans **/admin** : aperçu, infos, téléchargement de la carte, lien public.

## Modération (propos injurieux, etc.)
Dans **/admin**, modifie les champs (pseudo, style…) → **Enregistrer** : la page publique se met à jour aussitôt. Bouton **Masquer** pour retirer une carte de la diffusion.

## Passer sur thering-drive.com
Dans Vercel → *Settings → Domains* → ajoute `thering-drive.com` (ou un sous-domaine) et suis les instructions DNS. Les liens deviennent `thering-drive.com/drivers/pseudo` sans rien changer au code.

---

## Structure
```
index.html        formulaire public (inscription)
admin.html        back-office
card.css / card.js  design de la carte (source unique)
ttr-logo.png      logo officiel
api/register.js   inscription : stockage + emails
api/driver.js     page publique /drivers/:slug
api/admin-list.js / api/admin-update.js   back-office
schema.sql        base de données
vercel.json       réécriture des liens /drivers/
.env.example      variables à renseigner
```
