-- =====================================================================
--  SÉCURITÉ DU FORUM — Les Naufragés
--  À lancer UNE FOIS après forum.sql (et mise-a-jour-staff-profils.sql).
--  Supabase : SQL Editor > New query > colle tout > Run.
--  Relançable sans risque : ça ne supprime aucun message ni aucun compte.
--  (Désactive la traduction automatique de Chrome avant de copier le code.)
-- =====================================================================

-- ---------- 1. Fonctions verrouillées ----------
-- Les fonctions ne dépendent plus du « search_path » (avertissement du Security Advisor de Supabase).
alter function public.rang(text) set search_path = public;
alter function public.est_admin() set search_path = public;
alter function public.est_modo() set search_path = public;
alter function public.peut_ecrire() set search_path = public;
alter function public.proteger_sujet() set search_path = public;
-- Un visiteur non connecté ne peut pas appeler la suppression de compte.
revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- ---------- 2. Profils : grades, photo et bio ----------
-- En plus des règles de grade :
--  · seul le membre change sa photo et sa bio (un admin peut seulement les retirer à un grade inférieur) ;
--  · un membre banni peut retirer sa photo / sa bio, pas en mettre de nouvelles ;
--  · la photo doit venir du stockage du site, dans le dossier du membre.
create or replace function public.proteger_grades() returns trigger
language plpgsql set search_path = public as $$
declare moi integer := public.rang(public.mon_role());
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;

  if new.role is distinct from old.role or new.banni is distinct from old.banni then
    if new.id = auth.uid() then
      raise exception 'Tu ne peux pas changer ton propre grade.';
    end if;
    if not public.est_admin() or public.rang(old.role) >= moi
       or (public.rang(new.role) >= moi and public.mon_role() <> 'fondateur') then
      raise exception 'Tu ne peux gérer que les membres d''un grade inférieur au tien.';
    end if;
  end if;

  if new.avatar is distinct from old.avatar or new.bio is distinct from old.bio then
    if new.id <> auth.uid() or public.mon_role() = 'banni' then
      -- Quelqu'un d'autre (ou un banni) : seulement pour retirer, jamais pour écrire.
      if (new.avatar is distinct from old.avatar and new.avatar is not null)
         or (new.bio is distinct from old.bio and new.bio is not null) then
        raise exception 'Seul le membre peut changer sa photo et sa bio.';
      end if;
      if new.id <> auth.uid() and (not public.est_admin() or public.rang(old.role) >= moi) then
        raise exception 'Tu ne peux gérer que les membres d''un grade inférieur au tien.';
      end if;
    end if;
    if new.avatar is distinct from old.avatar and new.avatar is not null
       and new.avatar !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
                          || new.id::text || '/photo\.webp(\?v=[0-9]{1,15})?$') then
      raise exception 'Photo de profil refusée.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proteger_grades on public.profils;
create trigger proteger_grades before update on public.profils
  for each row execute function public.proteger_grades();

-- Stockage des photos : une seule image par membre (avatars/<son id>/photo.webp),
-- pour qu'on ne puisse pas remplir l'espace gratuit avec des milliers de fichiers.
drop policy if exists "avatars envoi" on storage.objects;
create policy "avatars envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = auth.uid()::text || '/photo.webp');
drop policy if exists "avatars remplacement" on storage.objects;
create policy "avatars remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '/photo.webp')
  with check (bucket_id = 'avatars' and name = auth.uid()::text || '/photo.webp');
update storage.buckets set allowed_mime_types = array['image/webp'], file_size_limit = 1048576
  where id = 'avatars';

-- ---------- 3. Anti-spam renforcé ----------
-- Toujours 15 s entre deux messages, et en plus : 10 sujets et 60 messages par heure maximum
-- (sauf modos). Bloque les robots qui inondent le forum.
create or replace function public.anti_spam() returns trigger
language plpgsql security definer set search_path = public as $$
declare n_sujets integer; n_total integer;
begin
  if public.est_modo() then return new; end if;
  if exists (select 1 from public.sujets where auteur = new.auteur and cree_le > now() - interval '15 seconds')
     or exists (select 1 from public.reponses where auteur = new.auteur and cree_le > now() - interval '15 seconds') then
    raise exception 'Doucement ! Attends quelques secondes avant de reposter.';
  end if;
  select count(*) into n_sujets from public.sujets where auteur = new.auteur and cree_le > now() - interval '1 hour';
  select n_sujets + count(*) into n_total from public.reponses where auteur = new.auteur and cree_le > now() - interval '1 hour';
  if (tg_table_name = 'sujets' and n_sujets >= 10) or n_total >= 60 then
    raise exception 'Doucement ! Tu as beaucoup posté, réessaie dans un moment.';
  end if;
  return new;
end $$;

-- Signalements : une seule fois par message, et 10 par heure maximum.
create or replace function public.anti_spam_signalement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.signalements where auteur = new.auteur
             and sujet_id is not distinct from new.sujet_id and reponse_id is not distinct from new.reponse_id) then
    raise exception 'Tu as déjà signalé ce message, merci !';
  end if;
  if (select count(*) from public.signalements where auteur = new.auteur and cree_le > now() - interval '1 hour') >= 10 then
    raise exception 'Doucement ! Tu as beaucoup signalé, réessaie dans un moment.';
  end if;
  return new;
end $$;
drop trigger if exists anti_spam_signalement on public.signalements;
create trigger anti_spam_signalement before insert on public.signalements
  for each row execute function public.anti_spam_signalement();

-- ---------- 4. Liens des actualités ----------
-- Pas d'espaces ni de caractères invisibles (astuce « java script: »), et pas d'autre
-- protocole que http(s) : seuls les liens web ou les pages du site passent.
alter table public.actualites drop constraint if exists actualites_lien_sur;
alter table public.actualites add constraint actualites_lien_sur check (
  lien is null or (lien !~ '[[:space:][:cntrl:]\\]' and (lien ~* '^https?://' or lien !~ '^[^/?#]*:'))
) not valid;
