-- =====================================================================
--  GRADES DU STAFF — à lancer UNE FOIS si tu as déjà installé forum.sql.
--  Supabase : SQL Editor > New query > colle tout > Run.
--  Ça ajoute les grades (Helper, Builder, Dev, Animateur, Responsable, Fondateur),
--  la photo de profil et la bio, et te passe Fondateur. Relançable sans risque.
-- =====================================================================

alter table public.profils drop constraint if exists profils_role_check;
alter table public.profils add constraint profils_role_check
  check (role in ('membre', 'helper', 'builder', 'dev', 'animateur', 'modo', 'responsable', 'admin', 'fondateur'));

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

-- L'admin actuel (toi) devient Fondateur.
update public.profils set role = 'fondateur' where role = 'admin';
