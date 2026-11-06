-- =====================================================================
--  ÉDITION COURONNE (version premium d'Imperium of Wars) — Les Naufragés
--  À lancer UNE FOIS (après forum.sql et securite.sql).
--  Supabase : SQL Editor > New query > colle tout > Run.
--  Relançable sans risque : ça ne supprime aucun achat.
--  (Désactive la traduction automatique de Chrome avant de copier le code.)
-- =====================================================================

-- Une ligne = un membre qui a débloqué l'Édition Couronne.
-- Elle est ajoutée :
--   · automatiquement par la fonction « lemonsqueezy » quand un paiement est validé ;
--   · ou à la main par un admin (espace admin > Membres > ⚜️), par ex. pour un cadeau.
create table if not exists public.premium (
  id        uuid primary key references public.profils (id) on delete cascade,
  depuis    timestamptz not null default now(),
  source    text not null default 'admin' check (source in ('admin', 'lemonsqueezy')),
  commande  text check (char_length(commande) <= 64)
);

alter table public.premium enable row level security;
revoke all on public.premium from anon, authenticated;
grant select, insert, delete on public.premium to authenticated;

-- Chacun voit seulement sa propre ligne (le jeu vérifie ainsi s'il a l'édition) ; les admins voient tout.
drop policy if exists "premium lecture" on public.premium;
create policy "premium lecture" on public.premium for select to authenticated
  using (id = auth.uid() or public.est_admin());

-- Seuls les admins peuvent offrir ou retirer l'édition à la main (jamais le membre lui-même).
drop policy if exists "premium admin ajout" on public.premium;
create policy "premium admin ajout" on public.premium for insert to authenticated
  with check (public.est_admin() and source = 'admin');
drop policy if exists "premium admin retrait" on public.premium;
create policy "premium admin retrait" on public.premium for delete to authenticated
  using (public.est_admin());

-- La fonction de paiement (clé secrète « service_role ») passe outre ces règles : c'est normal,
-- cette clé n'existe que dans Supabase et ne doit jamais aller sur le site.
