import fs from 'node:fs';
import path from 'node:path';
import { normaliser } from './roles.js';
import { ROLE_LIAISON } from './grades-mc.js';

// Rangement complet des rôles en catégories, chacune ouverte par un rôle « séparateur » stylé.
// Le bot ne touche qu'aux rôles placés sous son plus haut rôle, et jamais à ses propres rôles.
// Lancé au démarrage (2 min après) puis chaque nuit ; ne déplace que ce qui n'est pas à sa place.

const SEP = (titre) => `━━━━━━ ${titre} ━━━━━━`;
export const CATEGORIES = [
  { cle: 'direction', titre: '👑 HAUT STAFF' },
  { cle: 'staff', titre: '🛡️ ÉQUIPE STAFF', ancien: '833353303717838909' },
  { cle: 'bots', titre: '🤖 BOTS', ancien: '842770701408272405' }, // entre l'équipe staff et les équipes créa (choix du fondateur)
  { cle: 'crea', titre: '🎬 ÉQUIPES CRÉA', ancien: '833353497416171520' },
  { cle: 'boutique', titre: '⚓ BOUTIQUE SOUTIEN' }, // grades achetés sur la boutique Minecraft (Tebex)
  { cle: 'soutiens', titre: '💎 SOUTIENS & RÉCOMPENSES', ancien: '828283557415747584' },
  { cle: 'minecraft', titre: '⛏️ MINECRAFT' },
  { cle: 'membres', titre: '🏝️ MEMBRES' },
  { cle: 'profil', titre: '👤 PROFIL', ancien: '828283518898536458' },
  { cle: 'notifs', titre: '🔔 NOTIFICATIONS', ancien: '828283445368455170' },
  { cle: 'jeux', titre: '🎮 JEUX & PLATEFORMES', ancien: '828282747163639819' },
  { cle: 'sanctions', titre: '🔇 SANCTIONS' },
].map((c) => ({ ...c, nom: SEP(c.titre) }));

// Règles par nom (sans emoji ni accent). La première qui correspond gagne.
const REGLES = [
  ['sanctions', /^mute(d)?$/],
  ['notifs', /^notif|^rappel/],
  ['minecraft', /^mc|^comptelie$|^metier/],
  ['minecraft', /^monteur|^graphiste|^musicien/], // rangés entre MC・Habitué et MC・Membre (voir ordreVoulu)
  ['crea', /equipe|monteur|musicien|graphiste/],
  ['direction', /fondateur|responsablestaff|manager|gerant|^admin$|directeur|chefdev|respmodo/],
  ['staff', /chefdev|devbot|directeur|respmodo|^cm$|supermodo|moderateur|modojoueur|modoytb|^recruteur$|marketing|animateur|helpeur|gamedesigner|^builder$|terraformeur|redacteur|^staff$|absence/],
  ['boutique', /^(matelot|corsaire|amiral)$/],
  ['soutiens', /booster|amis|youtubeur|donateur|createur|ambassadeur|sponsor|mecene|vip|anniversaire|legende|supporter|betatesteur|champion|partenaire|barman/],
  ['membres', /^actif$|^membre$|nouveau|nonverifie|bavard|incontournable|elite/],
  ['profil', /garcon|fille|majeur|mineur|java|bedrock|console|pvp|batisseur|redstone|farmer|faction|region|europe|amerique|afrique|asie/],
  ['jeux', /^pc$|telephone|gta|minecraft|osu|nationglory|amongus|roblox|pokemon|rocketleague|arcsurvivor|fortnite|fornite|apex/],
  ['bots', /^bot$/],
];
export function categorie(role, sectionActuelle) {
  if (role.booster) return 'soutiens'; // rôle Nitro Booster (géré par Discord)
  if (role.abonne) return 'soutiens'; // rôles d'abonnés Twitch / YouTube (intégration Discord)
  if (role.managed) return 'bots';
  const n = normaliser(role.name).replace(/-/g, '');
  if (role.name === '📨・Recruteur') return 'soutiens';
  for (const [cle, re] of REGLES) if (re.test(n)) return cle;
  return sectionActuelle ?? 'haut';
}

// Ordre voulu (de haut en bas) pour les rôles déplaçables. Pure, testée.
// roles : [{ id, name, managed }] du plus haut au plus bas ; separateurs : { cle: id }.
export function ordreVoulu(roles, separateurs) {
  const idsSep = new Map(Object.entries(separateurs).map(([cle, id]) => [id, cle]));
  let section = null;
  const groupes = Object.fromEntries([['haut', []], ...CATEGORIES.map((c) => [c.cle, []])]);
  for (const r of roles) {
    if (idsSep.has(r.id)) { section = idsSep.get(r.id); continue; }
    groupes[categorie(r, section)].push(r.id);
  }
  // Naufragés Liaison (DiscordSRV) en premier des bots : il doit rester au-dessus des grades MC.
  groupes.bots.sort((a, b) => (b === ROLE_LIAISON) - (a === ROLE_LIAISON));
  // Monteur et graphiste : juste sous MC・Habitué (donc entre Habitué et Membre).
  const nom = new Map(roles.map((r) => [r.id, normaliser(r.name).replace(/-/g, '')]));
  const crea = groupes.minecraft.filter((id) => /^monteur|^graphiste|^musicien/.test(nom.get(id)));
  const reste = groupes.minecraft.filter((id) => !crea.includes(id));
  const k = reste.findIndex((id) => nom.get(id) === 'mchabitue');
  groupes.minecraft = k < 0 ? [...reste, ...crea] : [...reste.slice(0, k + 1), ...crea, ...reste.slice(k + 1)];
  return [...groupes.haut, ...CATEGORIES.flatMap((c) => [separateurs[c.cle], ...groupes[c.cle]].filter(Boolean))];
}

const F = path.resolve('data', 'rangement.json');

// Mode « respect » : l'ordre actuel (y compris ce que le fondateur a rangé à la main) est gardé.
// Seuls les rôles jamais vus (nouveaux rôles, nouveaux bots, séparateurs créés) sont placés
// à la fin de leur catégorie. deplacerBots : une seule fois, met le bloc BOTS juste au-dessus des ÉQUIPES CRÉA.
export function ordreRespectueux(roles, separateurs, connus, deplacerBots = false) {
  const idsSep = new Map(Object.entries(separateurs).map(([cle, id]) => [id, cle]));
  const cat = (r) => idsSep.get(r.id) ?? categorie(r, null);
  const premiereFois = !connus || !connus.length;
  const vus = new Set(connus ?? []);
  // Séparateurs d'abord (ils ouvrent leur catégorie), puis grades boutique du plus haut au plus bas.
  const RANG = { amiral: 0, corsaire: 1, matelot: 2 };
  const rang = (r) => (idsSep.has(r.id) ? -1 : RANG[normaliser(r.name)] ?? 9);
  const nouveaux = premiereFois ? [] : roles.filter((r) => !vus.has(r.id) && cat(r) !== 'haut')
    .map((r, i) => ({ r, i })).sort((a, b) => rang(a.r) - rang(b.r) || a.i - b.i).map((x) => x.r);
  const idsNouveaux = new Set(nouveaux.map((r) => r.id));
  let liste = roles.filter((r) => !idsNouveaux.has(r.id)).map((r) => r.id);
  const parId = new Map(roles.map((r) => [r.id, r]));
  const avantCategorieSuivante = (cle) => {
    const k = CATEGORIES.findIndex((c) => c.cle === cle);
    for (const c of CATEGORIES.slice(k + 1)) { const i = liste.indexOf(separateurs[c.cle]); if (i >= 0) return i; }
    return liste.length;
  };
  if (deplacerBots && separateurs.bots) {
    const bloc = liste.filter((id) => id === separateurs.bots || (parId.get(id)?.managed && cat(parId.get(id)) === 'bots'));
    bloc.sort((a, b) => (a === separateurs.bots ? -1 : b === separateurs.bots ? 1 : (b === ROLE_LIAISON) - (a === ROLE_LIAISON)));
    liste = liste.filter((id) => !bloc.includes(id));
    const i = avantCategorieSuivante('bots');
    liste = [...liste.slice(0, i), ...bloc, ...liste.slice(i)];
  }
  const creaMc = (r) => /^monteur|^graphiste|^musicien/.test(normaliser(r?.name ?? '').replace(/-/g, ''));
  for (const r of nouveaux) {
    let i = avantCategorieSuivante(cat(r));
    if (creaMc(r)) { // juste sous les autres monteur/graphiste, sinon sous MC・Habitué
      const j = liste.findLastIndex((id) => creaMc(parId.get(id)) || normaliser(parId.get(id)?.name ?? '') === 'mchabitue');
      if (j >= 0) i = j + 1;
    }
    liste = [...liste.slice(0, i), r.id, ...liste.slice(i)];
  }
  return liste;
}

// Nouveau bot ajouté (son rôle géré est créé tout en bas) : on relance le rangement 20 s après.
let attenteBot = null;
export function surveillerNouveauxBots(client, guild) {
  client.on('roleCreate', (r) => {
    if (r.guild.id !== guild.id || !r.managed) return;
    clearTimeout(attenteBot);
    attenteBot = setTimeout(() => rangerToutesLesCategories(guild).catch((e) => console.error('Rangement :', e.message)), 20_000);
  });
}
let enCours = false;
export async function rangerToutesLesCategories(guild) {
  if (enCours) return { ok: false, message: 'déjà en cours' };
  enCours = true;
  try {
    await guild.roles.fetch();
    const moi = guild.members.me ?? await guild.members.fetchMe();
    const plafond = moi.roles.highest;
    // 1. Séparateurs : renomme les anciens « ──── », crée ceux qui manquent.
    const separateurs = {};
    for (const c of CATEGORIES) {
      let r = (c.ancien && guild.roles.cache.get(c.ancien)) || guild.roles.cache.find((x) => x.name === c.nom);
      if (r && r.name !== c.nom && r.position < plafond.position) await r.setName(c.nom, 'Séparateur de catégorie').catch(() => {});
      if (!r) r = await guild.roles.create({ name: c.nom, color: 0x2b2d31, permissions: [], mentionable: false, hoist: false, reason: 'Séparateur de catégorie' }).catch(() => null);
      if (r) separateurs[c.cle] = r.id;
    }
    await guild.roles.fetch();
    // 2. Rôles déplaçables : sous le plafond, pas @everyone, pas les rôles du bot lui-même.
    const tous = [...guild.roles.cache.values()].filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position);
    const mobiles = tous.filter((r) => r.position < plafond.position && !moi.roles.cache.has(r.id));
    let etat = {}; try { etat = JSON.parse(fs.readFileSync(F, 'utf8')); } catch {}
    const infos = mobiles.map((r) => ({ id: r.id, name: r.name, managed: r.managed, booster: Boolean(r.tags?.premiumSubscriberRole), abonne: Boolean(r.tags?.integrationId && !r.tags?.botId) }));
    const deplacerBots = !etat.botsSousStaff;
    // Une fois : musicien rejoint monteur et graphiste (traité comme un nouveau rôle).
    const connus = etat.musicienMc ? etat.connus ?? [] : (etat.connus ?? []).filter((id) => !/^musicien/.test(normaliser(guild.roles.cache.get(id)?.name ?? '')));
    const voulu = ordreRespectueux(infos, separateurs, connus, deplacerBots);
    // 3. Déplacements un par un : chaque rôle juste sous le précédent.
    let bouges = 0; const erreurs = [];
    const pos = (id) => guild.roles.cache.get(id)?.position ?? -1;
    for (let k = 1; k < voulu.length; k++) {
      const ref = pos(voulu[k - 1]); const actuel = pos(voulu[k]);
      if (ref < 0 || actuel < 0 || actuel === ref - 1) continue;
      const cible = actuel < ref ? ref - 1 : ref;
      try { await guild.roles.cache.get(voulu[k]).setPosition(cible, { reason: 'Rangement des rôles par catégorie' }); bouges++; } catch (e) { erreurs.push(`${guild.roles.cache.get(voulu[k])?.name} : ${e.message}`); }
      await guild.roles.fetch();
    }
    const res = { quand: new Date().toISOString(), botsSousStaff: true, musicienMc: true, connus: [...guild.roles.cache.keys()], plafond: plafond.name, bouges, erreurs: erreurs.slice(0, 10), nonDeplacables: tous.filter((r) => r.position >= plafond.position).map((r) => r.name) };
    fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F, JSON.stringify(res, null, 1));
    console.log(`Rangement des rôles : ${bouges} déplacé(s), ${erreurs.length} erreur(s), plafond « ${plafond.name} »`);
    return { ok: !erreurs.length, ...res, connus: undefined };
  } finally { enCours = false; }
}
