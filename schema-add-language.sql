-- Optionnel : à exécuter dans Supabase SQL Editor si tu veux conserver la langue en base
-- et pouvoir créer un KPI FR / EN dans le dashboard.
alter table drivers add column if not exists language text default 'fr';

-- Optionnel : sécurise les valeurs autorisées.
alter table drivers drop constraint if exists drivers_language_check;
alter table drivers add constraint drivers_language_check check (language in ('fr', 'en'));
