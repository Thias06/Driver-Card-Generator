-- À coller dans Supabase → SQL Editor → Run
-- Stockage de la configuration Achat choisie par le pilote (affichée au back-office).
alter table drivers add column if not exists config_brand text;
alter table drivers add column if not exists config_model text;
alter table drivers add column if not exists config_type  text;
alter table drivers add column if not exists config_kit   text;   -- 'monte' | 'amonter'
alter table drivers add column if not exists config_paint boolean;
alter table drivers add column if not exists config_home  boolean;
alter table drivers add column if not exists config_total int;
