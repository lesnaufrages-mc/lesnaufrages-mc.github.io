-- =====================================================================
--  FORUM + COMPTES — Les Naufragés · Mot Mystère
--  À coller UNE FOIS dans Supabase : SQL Editor > New query > Run.
--  (Tu peux le relancer sans risque : il ne supprime aucune donnée.)
--
--  Ensuite, pour devenir fondateur (tous les droits) : inscris-toi sur le site, puis lance
--     update public.profils set role = 'fondateur' where pseudo = 'TonPseudo';
-- =====================================================================

-- ---------- 1. Profils (pseudo + grade) ----------
-- Grades, du plus bas au plus haut :
--   membre · helper, builder, dev, animateur (badge staff) · modo · responsable (modération)
--   · admin · fondateur (tout gérer : membres, grades, actualités)
-- L'adresse e-mail reste dans auth.users : elle n'est jamais visible.
create table if not exists public.profils (
  id      uuid primary key references auth.users (id) on delete cascade,
  pseudo  text not null check (pseudo ~ '^[A-Za-z0-9_-]{3,20}$'),
  role    text not null default 'membre' check (role in ('membre', 'helper', 'builder', 'dev', 'animateur', 'modo', 'responsable', 'admin', 'fondateur')),
  banni   boolean not null default false,
  cree_le timestamptz not null default now()
);
create unique index if not exists profils_pseudo_unique on public.profils (lower(pseudo));

-- Rôle de la personne connectée ('banni' si elle est bannie, null si visiteur).
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select case when p.banni then 'banni' else p.role end from public.profils p where p.id = auth.uid()
$$;
create or replace function public.rang(r text) returns integer
language sql immutable as $$
  select case r when 'fondateur' then 5 when 'admin' then 4 when 'responsable' then 3 when 'modo' then 2
    when 'helper' then 1 when 'builder' then 1 when 'dev' then 1 when 'animateur' then 1 else 0 end
$$;
create or replace function public.est_admin() returns boolean
language sql stable as $$ select coalesce(public.mon_role() in ('admin', 'fondateur'), false) $$;
create or replace function public.est_modo() returns boolean
language sql stable as $$ select coalesce(public.mon_role() in ('modo', 'responsable', 'admin', 'fondateur'), false) $$;
create or replace function public.peut_ecrire() returns boolean
language sql stable as $$ select coalesce(public.mon_role() <> 'banni', false) $$;

-- Le site vérifie qu'un pseudo est libre avant l'inscription.
create or replace function public.pseudo_disponible(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profils where lower(pseudo) = lower(btrim(p)))
$$;

-- Création automatique du profil à l'inscription (pseudo choisi sur le site).
create or replace function public.nouveau_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, pseudo) values (new.id, btrim(new.raw_user_meta_data ->> 'pseudo'));
  return new;
end $$;
drop trigger if exists nouveau_profil on auth.users;
create trigger nouveau_profil after insert on auth.users
  for each row execute function public.nouveau_profil();

-- Droit à l'effacement : chacun peut supprimer son compte et tous ses messages.
create or replace function public.supprimer_mon_compte() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid()
$$;

-- ---------- 2. Sujets et réponses ----------
create table if not exists public.sujets (
  id          bigint generated always as identity primary key,
  auteur      uuid not null default auth.uid() references public.profils (id) on delete cascade,
  categorie   text not null default 'general'
              check (categorie in ('general', 'mot-mystere', 'minecraft', 'discord', 'aide')),
  titre       text not null check (char_length(btrim(titre)) between 3 and 100),
  texte       text not null check (char_length(btrim(texte)) between 1 and 5000),
  epingle     boolean not null default false,
  verrouille  boolean not null default false,
  nb_reponses integer not null default 0,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz,
  activite_le timestamptz not null default now()
);
create index if not exists sujets_activite on public.sujets (epingle desc, activite_le desc);

create table if not exists public.reponses (
  id         bigint generated always as identity primary key,
  sujet_id   bigint not null references public.sujets (id) on delete cascade,
  auteur     uuid not null default auth.uid() references public.profils (id) on delete cascade,
  texte      text not null check (char_length(btrim(texte)) between 1 and 3000),
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz
);
create index if not exists reponses_sujet on public.reponses (sujet_id, cree_le);

-- Signalements : un membre signale un message, les modos le voient dans l'admin.
create table if not exists public.signalements (
  id         bigint generated always as identity primary key,
  sujet_id   bigint references public.sujets (id) on delete cascade,
  reponse_id bigint references public.reponses (id) on delete cascade,
  auteur     uuid not null default auth.uid() references public.profils (id) on delete cascade,
  raison     text not null check (char_length(btrim(raison)) between 1 and 300),
  cree_le    timestamptz not null default now(),
  check (sujet_id is not null or reponse_id is not null)
);

-- ---------- 3. Actualités (publiées depuis la page admin) ----------
create table if not exists public.actualites (
  id        bigint generated always as identity primary key,
  date      date not null default current_date,
  categorie text not null default 'site'
            check (categorie in ('discord', 'minecraft', 'appli', 'bot', 'site')),
  titre     text not null check (char_length(btrim(titre)) between 3 and 120),
  texte     text not null check (char_length(btrim(texte)) between 1 and 1000),
  lien      text check (lien ~* '^(https?://|[a-z0-9])' and lien !~* '^(javascript|data|vbscript):'),
  bouton    text check (char_length(bouton) <= 40),
  epingle   boolean not null default false,
  cree_le   timestamptz not null default now()
);

-- ---------- 4. Règles automatiques ----------
-- Anti-spam : 15 secondes minimum entre deux messages (sauf modos).
create or replace function public.anti_spam() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.est_modo() then return new; end if;
  if exists (select 1 from public.sujets where auteur = new.auteur and cree_le > now() - interval '15 seconds')
     or exists (select 1 from public.reponses where auteur = new.auteur and cree_le > now() - interval '15 seconds') then
    raise exception 'Doucement ! Attends quelques secondes avant de reposter.';
  end if;
  return new;
end $$;
drop trigger if exists anti_spam on public.sujets;
create trigger anti_spam before insert on public.sujets for each row execute function public.anti_spam();
drop trigger if exists anti_spam on public.reponses;
create trigger anti_spam before insert on public.reponses for each row execute function public.anti_spam();

-- Seuls les modos peuvent épingler ou verrouiller ; une modif par l'auteur est datée.
create or replace function public.proteger_sujet() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.est_modo() then
    if tg_op = 'INSERT' then
      new.epingle := false;
      new.verrouille := false;
    else
      new.epingle := old.epingle;
      new.verrouille := old.verrouille;
    end if;
  end if;
  if tg_op = 'UPDATE' and (new.titre is distinct from old.titre or new.texte is distinct from old.texte) then
    new.modifie_le := now();
  end if;
  return new;
end $$;
drop trigger if exists proteger_sujet on public.sujets;
create trigger proteger_sujet before insert or update on public.sujets
  for each row execute function public.proteger_sujet();

-- Une réponse remonte le sujet en haut de la liste et met à jour le compteur.
create or replace function public.compter_reponses() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.sujets set nb_reponses = nb_reponses + 1, activite_le = new.cree_le where id = new.sujet_id;
  elsif tg_op = 'DELETE' then
    update public.sujets set nb_reponses = greatest(nb_reponses - 1, 0) where id = old.sujet_id;
  else
    new.modifie_le := now();
    return new;
  end if;
  return null;
end $$;
drop trigger if exists compter_reponses on public.reponses;
create trigger compter_reponses after insert or delete on public.reponses
  for each row execute function public.compter_reponses();
drop trigger if exists dater_reponse on public.reponses;
create trigger dater_reponse before update on public.reponses
  for each row execute function public.compter_reponses();

-- ---------- 5. Qui a le droit de faire quoi (Row Level Security) ----------
alter table public.profils      enable row level security;
alter table public.sujets       enable row level security;
alter table public.reponses     enable row level security;
alter table public.signalements enable row level security;
alter table public.actualites   enable row level security;

-- Droits de base (les règles ci-dessous filtrent ensuite ligne par ligne).
revoke all on public.profils, public.sujets, public.reponses, public.signalements, public.actualites
  from anon, authenticated;
grant select on public.profils, public.sujets, public.reponses, public.actualites to anon, authenticated;
grant update (role, banni) on public.profils to authenticated;
grant insert (categorie, titre, texte, epingle, verrouille), delete on public.sujets to authenticated;
grant update (categorie, titre, texte, epingle, verrouille) on public.sujets to authenticated;
grant insert (sujet_id, texte), update (texte), delete on public.reponses to authenticated;
grant select, insert (sujet_id, reponse_id, raison), delete on public.signalements to authenticated;
grant insert, update, delete on public.actualites to authenticated;

drop policy if exists "lecture publique" on public.profils;
create policy "lecture publique" on public.profils for select using (true);
drop policy if exists "admin gere les membres" on public.profils;
create policy "admin gere les membres" on public.profils for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture publique" on public.sujets;
create policy "lecture publique" on public.sujets for select using (true);
drop policy if exists "membres publient" on public.sujets;
create policy "membres publient" on public.sujets for insert to authenticated
  with check (auteur = auth.uid() and public.peut_ecrire());
drop policy if exists "auteur ou modo modifie" on public.sujets;
create policy "auteur ou modo modifie" on public.sujets for update to authenticated
  using ((auteur = auth.uid() and public.peut_ecrire()) or public.est_modo());
drop policy if exists "auteur ou modo supprime" on public.sujets;
create policy "auteur ou modo supprime" on public.sujets for delete to authenticated
  using (auteur = auth.uid() or public.est_modo());

drop policy if exists "lecture publique" on public.reponses;
create policy "lecture publique" on public.reponses for select using (true);
drop policy if exists "membres repondent" on public.reponses;
create policy "membres repondent" on public.reponses for insert to authenticated
  with check (auteur = auth.uid() and public.peut_ecrire()
    and (public.est_modo() or not exists (select 1 from public.sujets s where s.id = sujet_id and s.verrouille)));
drop policy if exists "auteur modifie" on public.reponses;
create policy "auteur modifie" on public.reponses for update to authenticated
  using (auteur = auth.uid() and public.peut_ecrire());
drop policy if exists "auteur ou modo supprime" on public.reponses;
create policy "auteur ou modo supprime" on public.reponses for delete to authenticated
  using (auteur = auth.uid() or public.est_modo());

drop policy if exists "modos lisent" on public.signalements;
create policy "modos lisent" on public.signalements for select to authenticated using (public.est_modo());
drop policy if exists "membres signalent" on public.signalements;
create policy "membres signalent" on public.signalements for insert to authenticated
  with check (auteur = auth.uid() and public.peut_ecrire());
drop policy if exists "modos traitent" on public.signalements;
create policy "modos traitent" on public.signalements for delete to authenticated using (public.est_modo());

drop policy if exists "lecture publique" on public.actualites;
create policy "lecture publique" on public.actualites for select using (true);
drop policy if exists "admin publie" on public.actualites;
create policy "admin publie" on public.actualites for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- 6. Hiérarchie du staff ----------
-- Depuis le site, on ne gère que les membres d'un grade inférieur au sien,
-- et on ne donne qu'un grade inférieur au sien (seul le fondateur nomme des admins).
create or replace function public.proteger_grades() returns trigger
language plpgsql as $$
declare moi integer := public.rang(public.mon_role());
begin
  if current_user in ('anon', 'authenticated')
     and (new.role is distinct from old.role or new.banni is distinct from old.banni) then
    if new.id = auth.uid() then
      raise exception 'Tu ne peux pas changer ton propre grade.';
    end if;
    if not public.est_admin() or public.rang(old.role) >= moi
       or (public.rang(new.role) >= moi and public.mon_role() <> 'fondateur') then
      raise exception 'Tu ne peux gérer que les membres d''un grade inférieur au tien.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proteger_grades on public.profils;
create trigger proteger_grades before update on public.profils
  for each row execute function public.proteger_grades();

-- ---------- 7. Photo de profil et bio ----------
alter table public.profils add column if not exists avatar text
  check (avatar ~ '^https?://[^\s"<>]+/storage/v1/object/public/avatars/[^\s"<>]+$');
alter table public.profils add column if not exists bio text check (char_length(bio) <= 300);
grant update (avatar, bio) on public.profils to authenticated;
drop policy if exists "chacun modifie son profil" on public.profils;
create policy "chacun modifie son profil" on public.profils for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Les photos sont rangées dans le stockage « avatars » (public, 1 Mo max par image).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Chacun ne peut envoyer ou effacer que les fichiers de son propre dossier (avatars/<son id>/...).
drop policy if exists "avatars lecture" on storage.objects;
create policy "avatars lecture" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars envoi" on storage.objects;
create policy "avatars envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars remplacement" on storage.objects;
create policy "avatars remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars suppression" on storage.objects;
create policy "avatars suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
