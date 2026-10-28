// Fonction Supabase « lemonsqueezy » : débloque l'Édition Couronne après un paiement.
// Lemon Squeezy l'appelle (webhook) quand une commande est payée ou remboursée.
// Le site ajoute l'identifiant du compte du joueur au lien de paiement (checkout[custom][user_id]) :
// on le retrouve ici dans meta.custom_data.user_id.
//
// Secrets à régler dans Supabase (Edge Functions > Secrets) :
//   LEMONSQUEEZY_SECRET : le « Signing secret » choisi en créant le webhook dans Lemon Squeezy.
//   LEMONSQUEEZY_PRODUIT (facultatif) : l'identifiant du produit « Édition Couronne », pour ignorer
//   les autres produits de la boutique.
//   LEMONSQUEEZY_TESTS (facultatif) : mettre 1 pour accepter les achats du mode test (carte 4242…).
//   À supprimer une fois les tests finis, sinon n'importe qui pourrait débloquer l'édition gratuitement.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis tout seuls par Supabase.
// IMPORTANT : désactiver « Verify JWT » pour cette fonction (Lemon Squeezy n'a pas de compte Supabase).

const SECRET = Deno.env.get('LEMONSQUEEZY_SECRET') ?? '';
const PRODUIT = Deno.env.get('LEMONSQUEEZY_PRODUIT') ?? '';
const TESTS = Deno.env.get('LEMONSQUEEZY_TESTS') === '1';
const URL_BASE = Deno.env.get('SUPABASE_URL') ?? '';
const CLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signature(corps: string): Promise<string> {
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(corps));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Comparaison en temps constant (pour ne rien laisser deviner de la signature).
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function base(chemin: string, init: RequestInit) {
  return fetch(URL_BASE + '/rest/v1/' + chemin, {
    ...init,
    headers: { apikey: CLE, Authorization: 'Bearer ' + CLE, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}
const reponse = (txt: string, status = 200) => new Response(txt, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reponse('Méthode refusée', 405);
  if (!SECRET || !URL_BASE || !CLE) return reponse('Fonction mal configurée', 500);
  const corps = await req.text();
  if (!egal(await signature(corps), (req.headers.get('X-Signature') ?? '').toLowerCase())) return reponse('Signature invalide', 401);

  let ev: any;
  try { ev = JSON.parse(corps); } catch { return reponse('JSON invalide', 400); }
  const nom = ev?.meta?.event_name;
  const uid = String(ev?.meta?.custom_data?.user_id ?? '');
  const a = ev?.data?.attributes ?? {};
  const commande = String(ev?.data?.id ?? '').slice(0, 64);
  if (ev?.meta?.test_mode && !TESTS) return reponse('Achat de test ignoré (LEMONSQUEEZY_TESTS pas activé)');
  if (PRODUIT && String(a?.first_order_item?.product_id ?? '') !== PRODUIT) return reponse('Autre produit : ignoré');
  // Sans compte (lien de paiement ouvert hors du site), on ne peut rien débloquer : l'admin le fera à la main.
  if (!UUID.test(uid)) return reponse('Pas de compte joint : à débloquer à la main');

  if (nom === 'order_created' && a.status === 'paid') {
    const r = await base('premium?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: uid, source: 'lemonsqueezy', commande }),
    });
    // 409 / 23503 : le compte n'existe plus. On répond 200 pour que Lemon Squeezy n'insiste pas.
    if (!r.ok && r.status !== 409) return reponse('Erreur base : ' + r.status, 500);
    return reponse('Édition Couronne débloquée');
  }
  if (nom === 'order_refunded') {
    const r = await base('premium?id=eq.' + uid + '&source=eq.lemonsqueezy', { method: 'DELETE' });
    if (!r.ok) return reponse('Erreur base : ' + r.status, 500);
    return reponse('Édition Couronne retirée (remboursement)');
  }
  return reponse('Événement ignoré');
});
