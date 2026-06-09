-- À coller dans Supabase → SQL Editor → Run
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text default 'published',         -- published | pending | rejected
  hidden boolean default false,
  first_name text,
  last_name text,
  alias text unique,
  age int,
  nationality text,
  city text,
  driving_style text,
  email text,
  photo_url text,
  card_url text,
  slug text unique,
  season text default 'S0',
  overall int default 50,
  level text default 'ROOKIE',
  equipment text
);

-- Si la table existe déjà (déploiement précédent), ajoute la colonne formule :
alter table drivers add column if not exists equipment text;

-- Accès uniquement via les fonctions serveur (clé service_role), donc on garde la table
-- protégée : RLS activé sans policy publique. La clé service_role contourne RLS.
alter table drivers enable row level security;

-- IMPORTANT (Storage) : créer un bucket PUBLIC nommé "media"
-- Dashboard → Storage → New bucket → name = media → Public = ON


-- Sécurité / intégrité supplémentaire recommandée
-- Empêche deux inscriptions avec le même email.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'drivers_email_unique'
  ) then
    alter table drivers add constraint drivers_email_unique unique (email);
  end if;
end $$;

-- Contraintes simples côté base. Si la table contient déjà des valeurs invalides,
-- corrige-les avant d'activer ces contraintes.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'drivers_age_range') then
    alter table drivers add constraint drivers_age_range check (age between 16 and 99);
  end if;
end $$;
