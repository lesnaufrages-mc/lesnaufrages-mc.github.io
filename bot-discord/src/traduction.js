import fs from 'node:fs';
import path from 'node:path';
import { ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';

// Traduction vocale en direct (comme NeuroVox) : le bot rejoint le salon vocal, écoute chaque personne,
// transcrit ce qu'elle dit (Whisper chez Groq, gratuit) puis le traduit (Llama chez Groq) et l'écrit
// dans le chat du salon vocal, sous le nom de la personne.
// Réglage : GROQ_API_KEY dans l'onglet Environnement de l'hébergeur (clé gratuite sur console.groq.com).
// Rien n'est enregistré : l'audio est envoyé à Groq puis oublié. Chacun peut refuser avec /traduction ignorer-moi.

const GROQ = 'https://api.groq.com/openai/v1';
const MODELE_STT = process.env.TRAD_MODELE_STT || 'whisper-large-v3-turbo';
const MODELE_TRAD = process.env.TRAD_MODELE || 'llama-3.3-70b-versatile';
const MAX_REQUETES_JOUR = Number(process.env.TRAD_MAX_JOUR || 1800); // offre gratuite Groq : 2000 transcriptions par jour
const DUREE_MAX_SESSION = 3 * 3600_000;
const F_ETAT = path.resolve('data', 'traduction.json');

export const LANGUES = {
  fr: { nom: 'français', drapeau: '🇫🇷', whisper: ['french'] },
  en: { nom: 'anglais', drapeau: '🇬🇧', whisper: ['english'] },
  es: { nom: 'espagnol', drapeau: '🇪🇸', whisper: ['spanish'] },
  it: { nom: 'italien', drapeau: '🇮🇹', whisper: ['italian'] },
  de: { nom: 'allemand', drapeau: '🇩🇪', whisper: ['german'] },
  pt: { nom: 'portugais', drapeau: '🇵🇹', whisper: ['portuguese'] },
  nl: { nom: 'néerlandais', drapeau: '🇳🇱', whisper: ['dutch', 'flemish'] },
  ar: { nom: 'arabe', drapeau: '🇲🇦', whisper: ['arabic'] },
  tr: { nom: 'turc', drapeau: '🇹🇷', whisper: ['turkish'] },
  pl: { nom: 'polonais', drapeau: '🇵🇱', whisper: ['polish'] },
  ru: { nom: 'russe', drapeau: '🇷🇺', whisper: ['russian'] },
  uk: { nom: 'ukrainien', drapeau: '🇺🇦', whisper: ['ukrainian'] },
  ro: { nom: 'roumain', drapeau: '🇷🇴', whisper: ['romanian'] },
  ja: { nom: 'japonais', drapeau: '🇯🇵', whisper: ['japanese'] },
  ko: { nom: 'coréen', drapeau: '🇰🇷', whisper: ['korean'] },
  zh: { nom: 'chinois', drapeau: '🇨🇳', whisper: ['chinese'] },
};

// « fr, en , es » -> ['fr','en','es'] (langues inconnues ignorées, au moins 2, au plus 4)
export function lireLangues(texte = 'fr,en') {
  const codes = [...new Set(String(texte).toLowerCase().split(/[\s,;/]+/).filter((c) => LANGUES[c]))].slice(0, 4);
  return codes.length >= 2 ? codes : null;
}

// Whisper renvoie « french », « english »… (ou parfois un code). On le ramène à notre code.
export function codeLangue(whisper) {
  const w = String(whisper ?? '').toLowerCase();
  if (LANGUES[w]) return w;
  return Object.keys(LANGUES).find((c) => LANGUES[c].whisper.includes(w)) ?? null;
}

// Vers quelles langues traduire : toutes celles du salon sauf celle parlée.
// Langue parlée hors liste : on traduit vers toutes les langues du salon.
export const ciblesPour = (parlee, langues) => langues.filter((l) => l !== parlee);

// Phrases que Whisper « invente » sur du bruit ou du silence.
const HALLUCINATIONS = [
  /amara\.org/i, /sous-titr/i, /merci d'avoir regard/i, /thanks? for watching/i, /subtitles by/i,
  /abonnez-vous/i, /like and subscribe/i, /^\W*(merci|thank you|you|bye)\W*$/i, /^[\s.…!?,-]*$/,
];
export function estBruit(texte, segments = []) {
  const t = String(texte ?? '').trim();
  if (t.length < 2 || HALLUCINATIONS.some((r) => r.test(t))) return true;
  if (segments.length && segments.every((s) => (s.no_speech_prob ?? 0) > 0.6)) return true;
  return false;
}

// PCM 48 kHz stéréo 16 bits (sortie Discord) -> WAV 16 kHz mono (6 fois plus léger, suffisant pour Whisper).
export function pcmVersWav(pcm) {
  const echantillons = Math.floor(pcm.length / 4); // 2 canaux x 2 octets
  const n = Math.floor(echantillons / 3);
  const sortie = Buffer.alloc(44 + n * 2);
  for (let i = 0; i < n; i += 1) {
    let somme = 0;
    for (let k = 0; k < 3; k += 1) {
      const o = (i * 3 + k) * 4;
      somme += pcm.readInt16LE(o) + pcm.readInt16LE(o + 2);
    }
    sortie.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(somme / 6))), 44 + i * 2);
  }
  sortie.write('RIFF', 0); sortie.writeUInt32LE(36 + n * 2, 4); sortie.write('WAVE', 8);
  sortie.write('fmt ', 12); sortie.writeUInt32LE(16, 16); sortie.writeUInt16LE(1, 20); sortie.writeUInt16LE(1, 22);
  sortie.writeUInt32LE(16000, 24); sortie.writeUInt32LE(32000, 28); sortie.writeUInt16LE(2, 32); sortie.writeUInt16LE(16, 34);
  sortie.write('data', 36); sortie.writeUInt32LE(n * 2, 40);
  return sortie;
}
export const dureePcm = (pcm) => pcm.length / (48000 * 4);

// --- Appels à Groq ---
async function transcrire(wav, cle = process.env.GROQ_API_KEY) {
  const form = new FormData();
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'voix.wav');
  form.append('model', MODELE_STT);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  const r = await fetch(`${GROQ}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${cle}` }, body: form });
  if (!r.ok) throw new Error(`Groq transcription ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.json(); // { text, language, segments }
}

export function promptTraduction(texte, parlee, cibles) {
  const noms = cibles.map((c) => `"${c}" (${LANGUES[c].nom})`).join(', ');
  return [
    { role: 'system', content: 'Tu es l\'interprète d\'un salon vocal de joueurs (Minecraft, jeux vidéo). Traduis fidèlement et naturellement, ton oral et familier, garde le jargon de jeu, les pseudos et les insultes légères tels quels. Ne commente jamais. Réponds uniquement en JSON.' },
    { role: 'user', content: `Phrase${parlee ? ` (${LANGUES[parlee]?.nom ?? parlee})` : ''} : ${JSON.stringify(texte)}\nDonne la traduction en ${noms}. Format : {${cibles.map((c) => `"${c}": "..."`).join(', ')}}` },
  ];
}

async function traduire(texte, parlee, cibles, cle = process.env.GROQ_API_KEY) {
  const r = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELE_TRAD, temperature: 0.2, max_tokens: 400, response_format: { type: 'json_object' }, messages: promptTraduction(texte, parlee, cibles) }),
  });
  if (!r.ok) throw new Error(`Groq traduction ${r.status} : ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const sortie = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
  return Object.fromEntries(cibles.filter((c) => typeof sortie[c] === 'string' && sortie[c].trim()).map((c) => [c, sortie[c].trim()]));
}

export function messageSousTitre(nom, texte, parlee, traductions) {
  const lignes = [`**${nom}** ${LANGUES[parlee]?.drapeau ?? '🗣️'} ${texte}`];
  for (const [c, t] of Object.entries(traductions)) lignes.push(`> ${LANGUES[c].drapeau} ${t}`);
  return lignes.join('\n').slice(0, 1990);
}

// --- État (sessions actives en mémoire, préférences et compteur du jour sur disque) ---
const lireEtat = () => { try { return JSON.parse(fs.readFileSync(F_ETAT, 'utf8')); } catch { return {}; } };
const ecrireEtat = (e) => { fs.mkdirSync(path.dirname(F_ETAT), { recursive: true }); fs.writeFileSync(F_ETAT, JSON.stringify(e, null, 2)); };
const jour = () => new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' });
function compterRequete() {
  const e = lireEtat();
  if (e.jour !== jour()) { e.jour = jour(); e.requetes = 0; }
  if (e.requetes >= MAX_REQUETES_JOUR) return false;
  e.requetes += 1; ecrireEtat(e); return true;
}
const ignores = () => new Set(lireEtat().ignores ?? []);

const sessions = new Map(); // guildId -> { connexion, salon, langues, debut, ecoutes:Set, enCours:number, lanceur }
let voix = null; // module @discordjs/voice, chargé à la demande (le bot démarre même s'il manque)
let prism = null;
export function _injecterVoix(v, p) { voix = v; prism = p; } // pour les tests
async function chargerVoix() {
  if (!voix) { voix = await import('@discordjs/voice'); prism = (await import('prism-media')).default; }
  return voix;
}

async function traiterPhrase(session, membre, pcm) {
  if (dureePcm(pcm) < 0.6) return;
  if (!compterRequete()) {
    if (!session.limiteAnnoncee) { session.limiteAnnoncee = true; await session.salon.send('⏳ Limite gratuite du jour atteinte : la traduction reprendra demain.').catch(() => {}); }
    return;
  }
  if (session.enCours >= 4) return; // trop de monde parle en même temps : on saute plutôt que d'accumuler du retard
  session.enCours += 1;
  try {
    const t = await transcrire(pcmVersWav(pcm));
    if (estBruit(t.text, t.segments)) return;
    const parlee = codeLangue(t.language);
    const cibles = ciblesPour(parlee, session.langues);
    const traductions = cibles.length ? await traduire(t.text.trim(), parlee, cibles) : {};
    await session.salon.send({ content: messageSousTitre(membre?.displayName ?? 'Quelqu\'un', t.text.trim(), parlee, traductions), allowedMentions: { parse: [] } });
  } catch (e) {
    console.error('Traduction :', e.message);
    if (/40[13]/.test(e.message) && !session.cleAnnoncee) { session.cleAnnoncee = true; await session.salon.send('⚠️ Clé Groq refusée : vérifie GROQ_API_KEY dans les réglages du bot.').catch(() => {}); }
  } finally { session.enCours -= 1; }
}

function ecouter(session, guild, userId) {
  if (session.ecoutes.has(userId) || ignores().has(userId)) return;
  const membre = guild.members.cache.get(userId);
  if (!membre || membre.user.bot) return;
  session.ecoutes.add(userId);
  const flux = session.connexion.receiver.subscribe(userId, { end: { behavior: voix.EndBehaviorType.AfterSilence, duration: 800 } });
  const decodeur = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
  const morceaux = []; let taille = 0;
  const finir = () => {
    if (!session.ecoutes.delete(userId)) return;
    flux.destroy(); decodeur.destroy();
    if (taille) traiterPhrase(session, membre, Buffer.concat(morceaux)).catch(() => {});
  };
  decodeur.on('data', (d) => {
    morceaux.push(d); taille += d.length;
    if (taille > 48000 * 4 * 25) finir(); // phrase de plus de 25 s : on l'envoie et on recommence
  });
  decodeur.on('error', () => {});
  flux.on('error', () => {});
  flux.pipe(decodeur);
  flux.once('end', finir);
}

export async function arreterTraduction(guildId, raison) {
  const s = sessions.get(guildId);
  if (!s) return false;
  sessions.delete(guildId);
  clearInterval(s.minuteur);
  try { s.connexion.destroy(); } catch { /* déjà déconnecté */ }
  if (raison) await s.salon.send(`🔇 Traduction arrêtée${raison === true ? '' : ` (${raison})`}.`).catch(() => {});
  return true;
}

async function demarrer(i) {
  const salon = i.member?.voice?.channel;
  if (!salon || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(salon.type)) {
    return i.reply({ flags: MessageFlags.Ephemeral, content: '🎧 Rejoins d\'abord un salon vocal, puis relance `/traduction demarrer`.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return i.reply({ flags: MessageFlags.Ephemeral, content: '⚙️ La traduction n\'est pas encore réglée : il manque GROQ_API_KEY dans l\'onglet Environnement du bot (clé gratuite sur console.groq.com).' });
  }
  const langues = lireLangues(i.options.getString('langues') ?? 'fr,en');
  if (!langues) return i.reply({ flags: MessageFlags.Ephemeral, content: `Indique au moins 2 langues parmi : ${Object.keys(LANGUES).join(', ')} (ex. \`fr,en,es\`).` });
  await i.deferReply();
  try { await chargerVoix(); } catch (e) {
    console.error('Voix :', e.message);
    return i.editReply('😵 Le module vocal n\'est pas installé sur l\'hébergeur (npm install @discordjs/voice opusscript).');
  }
  await arreterTraduction(i.guild.id);
  const connexion = voix.joinVoiceChannel({ channelId: salon.id, guildId: i.guild.id, adapterCreator: i.guild.voiceAdapterCreator, selfDeaf: false, selfMute: true });
  try { await voix.entersState(connexion, voix.VoiceConnectionStatus.Ready, 20_000); } catch {
    connexion.destroy();
    return i.editReply('😵 Je n\'arrive pas à rejoindre le salon vocal (permission « Se connecter » ?).');
  }
  const session = { connexion, salon, langues, debut: Date.now(), ecoutes: new Set(), enCours: 0, lanceur: i.user.id };
  sessions.set(i.guild.id, session);
  connexion.receiver.speaking.on('start', (userId) => ecouter(session, i.guild, userId));
  connexion.on(voix.VoiceConnectionStatus.Disconnected, async () => {
    try { await Promise.race([voix.entersState(connexion, voix.VoiceConnectionStatus.Signalling, 5000), voix.entersState(connexion, voix.VoiceConnectionStatus.Connecting, 5000)]); } catch { arreterTraduction(i.guild.id, 'bot déconnecté du vocal'); }
  });
  // Arrêt automatique : salon vide depuis 1 min, ou 3 h de session.
  let vide = 0;
  session.minuteur = setInterval(() => {
    const humains = salon.members.filter((m) => !m.user.bot).size;
    vide = humains ? 0 : vide + 1;
    if (vide >= 2) arreterTraduction(i.guild.id, 'plus personne dans le salon');
    else if (Date.now() - session.debut > DUREE_MAX_SESSION) arreterTraduction(i.guild.id, '3 h atteintes, relance `/traduction demarrer` si besoin');
  }, 30_000);
  const embed = new EmbedBuilder().setColor(0x7c5cff).setTitle('🌍 Traduction en direct activée')
    .setDescription([
      `Langues : ${langues.map((l) => `${LANGUES[l].drapeau} ${LANGUES[l].nom}`).join(' · ')}`,
      'Parlez normalement : chaque phrase s\'affiche ici, traduite, en quelques secondes.',
      '',
      '🔒 Ce qui est dit est envoyé au service Groq pour être transcrit et traduit, puis oublié. Le bot n\'enregistre rien.',
      'Tu ne veux pas être traduit ? `/traduction ignorer-moi`. Pour couper : `/traduction arreter`.',
    ].join('\n'));
  await i.editReply({ embeds: [embed] });
}

export async function commandeTraduction(i) {
  const sous = i.options.getSubcommand();
  if (sous === 'demarrer') return demarrer(i);
  if (sous === 'arreter') {
    const ok = await arreterTraduction(i.guild.id);
    return i.reply({ content: ok ? `🔇 Traduction arrêtée par ${i.member.displayName}.` : 'La traduction n\'est pas active.', allowedMentions: { parse: [] } });
  }
  if (sous === 'ignorer-moi') {
    const e = lireEtat(); const liste = new Set(e.ignores ?? []);
    const ignore = !liste.has(i.user.id);
    if (ignore) liste.add(i.user.id); else liste.delete(i.user.id);
    e.ignores = [...liste]; ecrireEtat(e);
    return i.reply({ flags: MessageFlags.Ephemeral, content: ignore ? '🙈 C\'est noté : ta voix ne sera plus jamais traduite. Refais la commande pour annuler.' : '✅ Ta voix sera de nouveau traduite.' });
  }
  if (sous === 'statut') {
    const s = sessions.get(i.guild.id); const e = lireEtat();
    const utilise = e.jour === jour() ? e.requetes : 0;
    return i.reply({ flags: MessageFlags.Ephemeral, content: s
      ? `🌍 Active dans ${s.salon} depuis ${Math.round((Date.now() - s.debut) / 60000)} min (${s.langues.join(', ')}). Phrases traduites aujourd'hui : ${utilise}/${MAX_REQUETES_JOUR}.`
      : `Traduction inactive. Phrases traduites aujourd'hui : ${utilise}/${MAX_REQUETES_JOUR}.` });
  }
  return undefined;
}

export function definitionTraduction(SlashCommandBuilder) {
  return new SlashCommandBuilder().setName('traduction').setDescription('Traduction en direct du salon vocal (chacun parle sa langue)')
    .addSubcommand((s) => s.setName('demarrer').setDescription('Le bot rejoint ton salon vocal et traduit ce qui est dit')
      .addStringOption((o) => o.setName('langues').setDescription('Langues du salon, ex. fr,en,es (par défaut fr,en)')))
    .addSubcommand((s) => s.setName('arreter').setDescription('Arrête la traduction et fait partir le bot du vocal'))
    .addSubcommand((s) => s.setName('ignorer-moi').setDescription('Ne plus jamais traduire ma voix (ou annuler)'))
    .addSubcommand((s) => s.setName('statut').setDescription('Traduction active ? Combien de phrases aujourd\'hui ?'));
}
