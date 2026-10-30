-- =====================================================================
--  AMIS + PARTIES SAUVEGARDÉES — Les Naufragés
--  À lancer UNE FOIS (après forum.sql et securite.sql).
--  Supabase : SQL Editor > New query > colle tout > Run.
--  Relançable sans risque : ça ne supprime aucun ami ni aucune partie.
--  (Désactive la traduction automatique de Chrome avant de copier le code.)
-- =====================================================================

-- ---------- 1. Amis ----------
-- Une ligne = une demande d'ami. accepte = false : en attente ; true : vous êtes amis.
-- Seules les deux personnes concernées voient la ligne (la liste d'amis reste privée).
create table if not exists public.amis (
  demandeur    uuid not null default auth.uid() references public.profils (id) on delete cascade,
  destinataire uuid not null references public.profils (id) on delete cascade,
  accepte      boolean not null default false,
  cree_le      timestamptz not null default now(),
  accepte_le   timestamptz,
  primary key (demandeur, destinataire),
  check (demandeur <> destinataire)
);
-- Une seule ligne par paire, dans un sens ou dans l'autre.
create unique index if not exists amis_paire on public.amis
  (least(demandeur, destinataire), greatest(demandeur, destinataire));
create index if not exists amis_destinataire on public.amis (destinataire);

alter table public.amis enable row level security;
revoke all on public.amis from anon, authenticated;
grant select, delete on public.amis to authenticated;
grant insert (destinataire), update (accepte) on public.amis to authenticated;

drop policy if exists "amis lecture" on public.amis;
create policy "amis lecture" on public.amis for select to authenticated
  using (auth.uid() in (demandeur, destinataire));
drop policy if exists "amis demande" on public.amis;
create policy "amis demande" on public.amis for insert to authenticated
  with check (demandeur = auth.uid() and not accepte and public.peut_ecrire());
-- Seul celui qui reçoit la demande peut l'accepter.
drop policy if exists "amis accepter" on public.amis;
create policy "amis accepter" on public.amis for update to authenticated
  using (destinataire = auth.uid()) with check (destinataire = auth.uid());
-- Chacun des deux peut refuser, annuler ou retirer l'ami.
drop policy if exists "amis retirer" on public.amis;
create policy "amis retirer" on public.amis for delete to authenticated
  using (auth.uid() in (demandeur, destinataire));

-- Anti-spam : 20 demandes par heure et 300 amis maximum.
create or replace function public.regles_amis() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.accepte := false;
    new.accepte_le := null;
    if (select count(*) from public.amis where demandeur = new.demandeur and cree_le > now() - interval '1 hour') >= 20 then
      raise exception 'Doucement ! Tu as envoyé beaucoup de demandes, réessaie dans un moment.';
    end if;
    if (select count(*) from public.amis where new.demandeur in (demandeur, destinataire)) >= 300 then
      raise exception 'Tu as atteint la limite de 300 amis.';
    end if;
  elsif new.accepte and not old.accepte then
    new.accepte_le := now();
  elsif not new.accepte and old.accepte then
    raise exception 'Pour retirer un ami, supprime-le de ta liste.';
  end if;
  return new;
end $$;
drop trigger if exists regles_amis on public.amis;
create trigger regles_amis before insert or update on public.amis
  for each row execute function public.regles_amis();

-- ---------- 2. Parties sauvegardées en ligne ----------
-- Pour les joueurs connectés : la progression de Mot Mystère, CLUTCH et Imperium of Wars
-- est copiée ici (docs/sauvegarde.js). Elle suit le joueur d'un appareil à l'autre,
-- et un admin peut la remettre à zéro depuis l'espace admin.
create table if not exists public.parties (
  joueur   uuid not null references public.profils (id) on delete cascade,
  jeu      text not null check (jeu in ('mot-mystere', 'clutch', 'imperium')),
  donnees  jsonb check (donnees is null or (jsonb_typeof(donnees) = 'object' and octet_length(donnees::text) <= 524288)),
  maj      timestamptz not null default now(),
  reset_le timestamptz,
  primary key (joueur, jeu)
);

alter table public.parties enable row level security;
revoke all on public.parties from anon, authenticated;
grant select on public.parties to authenticated;
-- Chacun lit ses parties ; les admins voient qui a des parties (pour les remettre à zéro).
drop policy if exists "parties lecture" on public.parties;
create policy "parties lecture" on public.parties for select to authenticated
  using (joueur = auth.uid() or public.est_admin());
-- Pas d'écriture directe : tout passe par les deux fonctions ci-dessous.

-- Le site envoie la partie du joueur connecté. Refusée si un admin l'a remise à zéro
-- entre-temps (« reset » = la date de remise à zéro que le site connaît) : le site efface alors la partie.
create or replace function public.sauver_partie(p_jeu text, p_donnees jsonb, p_reset timestamptz)
returns table (maj timestamptz, reset_le timestamptz, refuse boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare l public.parties;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into l from public.parties p where p.joueur = auth.uid() and p.jeu = p_jeu for update;
  if found and l.reset_le is distinct from p_reset then
    return query select l.maj, l.reset_le, true;
    return;
  end if;
  insert into public.parties as p (joueur, jeu, donnees, maj) values (auth.uid(), p_jeu, p_donnees, now())
  on conflict (joueur, jeu) do update set donnees = excluded.donnees, maj = now()
  returning p.maj, p.reset_le, false into maj, reset_le, refuse;
  return next;
end $$;
revoke execute on function public.sauver_partie(text, jsonb, timestamptz) from public, anon;
grant execute on function public.sauver_partie(text, jsonb, timestamptz) to authenticated;

-- Espace admin : remettre à zéro les parties d'un joueur (un jeu, ou tous si p_jeu est vide).
-- Même règle que pour les grades : seulement un membre d'un grade inférieur au sien (ou soi-même).
create or replace function public.reinitialiser_parties(p_joueur uuid, p_jeu text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare moi integer := public.rang(public.mon_role()); n integer;
begin
  if not public.est_admin() then raise exception 'Réservé aux admins.'; end if;
  if p_joueur <> auth.uid() and public.mon_role() <> 'fondateur'
     and (select public.rang(role) from public.profils where id = p_joueur) >= moi then
    raise exception 'Tu ne peux gérer que les membres d''un grade inférieur au tien.';
  end if;
  insert into public.parties (joueur, jeu, donnees, maj, reset_le)
  select p_joueur, j, null, now(), now()
  from unnest(case when coalesce(p_jeu, '') = '' then array['mot-mystere', 'clutch', 'imperium'] else array[p_jeu] end) j
  where exists (select 1 from public.profils where id = p_joueur)
  on conflict (joueur, jeu) do update set donnees = null, maj = now(), reset_le = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.reinitialiser_parties(uuid, text) from public, anon;
grant execute on function public.reinitialiser_parties(uuid, text) to authenticated;
