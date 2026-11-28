import fs from 'node:fs';
import path from 'node:path';
import { GuildOnboardingPromptType, GuildOnboardingMode, PermissionFlagsBits } from 'discord.js';

// Processus d'accueil Discord (Onboarding) : questions posées aux nouveaux membres,
// chaque réponse donne des rôles et ouvre des salons. Appliqué une fois par VERSION
// (data/accueil.json) ; changer VERSION pour le réappliquer.
// Le « Guide du serveur » (message de bienvenue + tâches) n'existe pas dans l'API des bots :
// il se règle à la main dans Paramètres du serveur > Processus d'accueil.

const VERSION = 1;
const MAX_QUESTIONS = 3; // Discord refuse au-delà (TOO_MANY_ONBOARDING_PROMPTS) pour ce serveur
const F = path.resolve('data', 'accueil.json');

const S = {
  reglement: '828255180214632509', annonces: '828255179048484865', general: '828255187129860126', chat: '883693609910669312',
  medias: '828255200921649191', commandes: '883693652570955837', level: '883693702671921173', autoRole: '883685703035285526',
  serveurMc: '1017711078752407622', chatMc: '1571479456680386572', guidesMc: '1573085268251115590', eventsMc: '1573085274244653127',
  factions: '1573085278426374175', commerce: '1573085283329769512', constructions: '1573085288350351463', votes: '1573268868724424705',
  live: '883727117525864448', video: '883727147229929622', clips: '995616733010350080', pub: '828255209113387058',
  partenariats: '889585238139867196', idees: '884121493150236702', support: '883689076786597998',
};
const R = {
  minecraft: '886482444851773471', fortnite: '886482445694816276', rocket: '886482446453993492', gta: '886482429538349076',
  roblox: '886484296263692358', apex: '886483722050879499', pokemon: '886484287476596738', amongus: '886484291561865217', osu: '886482447141863484',
  pc: '886484764897460224', tel: '886485056154124349',
  notifAnnonce: '828255155005947914', notifAnim: '828255157279784961', notifGiveaway: '828349512870526977', notifSondage: '828350537924608000',
  notifRecrut: '828350162711347231', notifLive: '884126655612850318', rappelBump: '1573352529750786200', notifPartenariat: '889589725843836948',
  majeur: '828255139889676290', mineur: '828255139596992553',
};

const opt = (title, emoji, { description, roles = [], channels = [] } = {}) => ({ title, description, emoji, roles, channels });

export const QUESTIONS = [
  {
    title: "Qu'est-ce qui t'amène chez les Naufragés ?", singleSelect: false, required: false,
    options: [
      opt('Le serveur Minecraft', '⛏️', { description: 'Survie Java et Bedrock : factions, quêtes, métiers', roles: [R.minecraft], channels: [S.serveurMc, S.chatMc, S.guidesMc, S.eventsMc, S.factions, S.commerce, S.constructions, S.votes] }),
      opt('Discuter et me faire des amis', '💬', { description: 'Le chat, les médias, les niveaux', channels: [S.chat, S.medias, S.level] }),
      opt('Les lives et les vidéos', '🎥', { description: 'Être prévenu des lives Twitch et des vidéos', roles: [R.notifLive], channels: [S.live, S.video, S.clips] }),
      opt('Faire de la pub ou un partenariat', '🤝', { description: 'Salon pub et partenariats', roles: [R.notifPartenariat], channels: [S.pub, S.partenariats] }),
    ],
  },
  {
    title: 'À quels jeux joues-tu ?', singleSelect: false, required: false,
    options: [
      opt('Minecraft', '⛏️', { roles: [R.minecraft] }), opt('Fortnite', '🔫', { roles: [R.fortnite] }), opt('Rocket League', '🚗', { roles: [R.rocket] }),
      opt('GTA', '🚓', { roles: [R.gta] }), opt('Roblox', '🧱', { roles: [R.roblox] }), opt('Apex', '🎯', { roles: [R.apex] }),
      opt('Pokémon', '⚡', { roles: [R.pokemon] }), opt('Among Us', '🛸', { roles: [R.amongus] }), opt('osu!', '🎵', { roles: [R.osu] }),
    ],
  },
  {
    title: 'Quelles notifications veux-tu recevoir ?', singleSelect: false, required: false,
    options: [
      opt('Annonces', '📢', { roles: [R.notifAnnonce] }), opt('Animations et events', '🎤', { roles: [R.notifAnim] }),
      opt('Giveaways', '🎁', { roles: [R.notifGiveaway] }), opt('Sondages', '📊', { roles: [R.notifSondage] }),
      opt('Recrutement staff', '💼', { roles: [R.notifRecrut] }), opt('Rappel de bump', '🔔', { description: 'Aide le serveur à remonter dans les annuaires', roles: [R.rappelBump] }),
    ],
  },
  {
    title: 'Sur quoi joues-tu ?', singleSelect: false, required: false,
    options: [opt('PC', '🖥️', { roles: [R.pc] }), opt('Téléphone', '📱', { roles: [R.tel] })],
  },
  {
    title: 'Quel âge as-tu ?', singleSelect: true, required: false,
    options: [opt('18 ans ou plus', '🔞', { roles: [R.majeur] }), opt('Moins de 18 ans', '🧒', { roles: [R.mineur] })],
  },
];

const DEFAUT = [S.reglement, S.annonces, S.general, S.chat, S.medias, S.commandes, S.autoRole, S.idees, S.support, S.serveurMc];

export async function appliquerAccueil(guild) {
  let etat = {}; try { etat = JSON.parse(fs.readFileSync(F, 'utf8')); } catch {}
  if (etat.version === VERSION && etat.ok) return;
  // Discord n'accepte que les salons visibles par @everyone (dans les salons par défaut comme dans les réponses).
  const visible = (id) => { const c = guild.channels.cache.get(id); return Boolean(c?.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)); };
  const prompts = QUESTIONS.slice(0, MAX_QUESTIONS).map((q) => ({ ...q, type: GuildOnboardingPromptType.MultipleChoice, inOnboarding: true,
    options: q.options.map((o) => ({ ...o, channels: o.channels.filter(visible) })).filter((o) => o.roles.length || o.channels.length) }));
  const actuel = await guild.fetchOnboarding().catch(() => null);
  const defaut = [...new Set([...DEFAUT, ...(actuel?.defaultChannels?.map((c) => c.id) ?? [])])].filter(visible);
  console.log(`Accueil : ${defaut.length} salon(s) par défaut visibles par tous`);
  const res = { version: VERSION, quand: new Date().toISOString() };
  try {
    await guild.editOnboarding({ prompts, defaultChannels: defaut, enabled: true, mode: GuildOnboardingMode.OnboardingDefault, reason: "Processus d'accueil des nouveaux membres" });
    res.ok = true; res.active = true;
  } catch (e) {
    res.erreurActivation = e.message;
    try { await guild.editOnboarding({ prompts, defaultChannels: defaut, enabled: false, reason: "Questions d'accueil (activation à faire à la main)" }); res.ok = true; res.active = false; } catch (e2) { res.ok = false; res.erreur = e2.message; }
  }
  fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F, JSON.stringify(res, null, 1));
  console.log(`Accueil : ${res.ok ? `${prompts.length} questions enregistrées, ${res.active ? 'ACTIVÉ' : 'pas activé'}` : 'échec'}${res.erreurActivation ? ` (${res.erreurActivation})` : ''}${res.erreur ? ` (${res.erreur})` : ''}`);
}

// --- Tâches du « Guide du serveur » (À faire pour les nouveaux membres) ---
// Discord refuse une tâche dont le salon n'est pas visible par @everyone
// (« Le salon attribué n'a pas de permissions pour @everyone »). Au démarrage, le bot
// ouvre en lecture ces salons à @everyone (sans toucher à l'écriture), une fois par VERSION_TACHES.
// Résultat dans data/acces-taches.json.
const VERSION_TACHES = 1;
const F_TACHES = path.resolve('data', 'acces-taches.json');
const SALONS_TACHES = ['828332235366596638', S.chat, S.autoRole, S.support]; // vérification, chat, auto-rôle, support
const NOMS_TACHES = ['serveur-mcinfo', 'vérification', 'verification'];

export async function reparerTachesAccueil(guild) {
  let etat = {}; try { etat = JSON.parse(fs.readFileSync(F_TACHES, 'utf8')); } catch {}
  if (etat.version === VERSION_TACHES && etat.ok) return;
  const salons = await guild.channels.fetch();
  const ids = new Set(SALONS_TACHES);
  for (const c of salons.values()) if (c && NOMS_TACHES.some((n) => c.name.toLowerCase().includes(n))) ids.add(c.id);
  const res = { version: VERSION_TACHES, quand: new Date().toISOString(), salons: [] };
  // Tâches actuelles du guide (API non documentée : lecture seule, pour le rapport).
  try {
    const guide = await guild.client.rest.get(`/guilds/${guild.id}/new-member-welcome`);
    res.guide = guide;
    for (const a of guide?.new_member_actions ?? []) if (a.channel_id) ids.add(a.channel_id);
    for (const r of guide?.resource_channels ?? []) if (r.channel_id) ids.add(r.channel_id);
  } catch (e) { res.guideErreur = e.message; }
  // Salons de l'onboarding (par défaut + réponses) : même règle.
  try {
    const ob = await guild.fetchOnboarding();
    for (const c of ob.defaultChannels.values()) ids.add(c.id);
    for (const p of ob.prompts.values()) for (const o of p.options.values()) for (const c of o.channels.values()) ids.add(c.id);
  } catch {}
  const tous = guild.roles.everyone;
  let ok = true;
  for (const id of ids) {
    const c = salons.get(id) ?? await guild.channels.fetch(id).catch(() => null);
    if (!c) { res.salons.push({ id, etat: 'introuvable' }); continue; }
    const voit = c.permissionsFor(tous)?.has(PermissionFlagsBits.ViewChannel);
    if (voit) { res.salons.push({ id, nom: c.name, etat: 'déjà visible' }); continue; }
    try {
      await c.permissionOverwrites.edit(tous, { ViewChannel: true, ReadMessageHistory: true }, { reason: "Tâche d'accueil : salon visible par @everyone" });
      res.salons.push({ id, nom: c.name, etat: 'ouvert en lecture à @everyone' });
    } catch (e) { ok = false; res.salons.push({ id, nom: c.name, etat: 'échec', erreur: e.message }); }
  }
  res.ok = ok;
  fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F_TACHES, JSON.stringify(res, null, 1));
  console.log(`Tâches d'accueil : ${res.salons.map((s) => `${s.nom ?? s.id} = ${s.etat}`).join(' ; ')}`);
}
