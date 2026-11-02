-- Ferrum et Fides : autoriser la sauvegarde en ligne du nouveau jeu (clé « ferrum »).
-- À lancer UNE fois dans Supabase > SQL Editor (après amis-parties.sql, déjà lancé le 2026-10-30).
-- Sans ce script, le jeu marche quand même : la partie reste seulement dans le navigateur.

alter table public.parties drop constraint if exists parties_jeu_check;
alter table public.parties add constraint parties_jeu_check
  check (jeu in ('mot-mystere', 'clutch', 'imperium', 'ferrum'));

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
  from unnest(case when coalesce(p_jeu, '') = '' then array['mot-mystere', 'clutch', 'imperium', 'ferrum'] else array[p_jeu] end) j
  where exists (select 1 from public.profils where id = p_joueur)
  on conflict (joueur, jeu) do update set donnees = null, maj = now(), reset_le = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.reinitialiser_parties(uuid, text) from public, anon;
grant execute on function public.reinitialiser_parties(uuid, text) to authenticated;
