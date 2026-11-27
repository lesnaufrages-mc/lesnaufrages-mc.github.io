// « Le 7e Thomas » : l'agent qui surveille tout le reste.
// Idée tirée d'un TikTok : un employé a monté 6 agents pour son poste et un 7e qui surveille les 6 autres ;
// lui ne fait plus que relire 20 minutes par jour.
// Ici : chaque matin (workflow .github/workflows/veille.yml) ce script vérifie le site et les réserves de contenu
// et écrit un rapport court. S'il y a un problème, le workflow le signale dans l'issue « Rapport de veille ».
// Lancer à la main : node scripts/veille.cjs   (ajoute --hors-ligne pour sauter les tests réseau)

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SITE = 'https://lesnaufrages.net';
const HORS_LIGNE = process.argv.includes('--hors-ligne');
const AUJ = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');

const lignes = []; // { niveau: 'ok' | 'attention' | 'alerte', texte }
const ok = (t) => lignes.push({ niveau: 'ok', texte: t });
const attention = (t) => lignes.push({ niveau: 'attention', texte: t });
const alerte = (t) => lignes.push({ niveau: 'alerte', texte: t });

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const jours = (a, b) => Math.round((b - a) / 86400000);
const date = (s) => new Date(s + 'T00:00:00Z');

// 1. Mot Mystère : il reste combien de pages du « Journal du naufragé » ?
function motMystere() {
  const src = lire('src/journal.js');
  const pages = (src.match(/\{\s*mot:\s*'/g) || []).length;
  const saison = (src.match(/SAISON\s*=\s*(\d+)/) || [])[1] || '?';
  const debut = date('2026-10-25'); // page 1 (voir pageDuJour dans src/journal.js)
  const reste = pages - (jours(debut, AUJ) + 1);
  const fin = new Date(debut.getTime() + (pages - 1) * 86400000).toISOString().slice(0, 10);
  if (reste < 0) alerte(`Mot Mystère : la saison ${saison} du Journal est finie depuis le ${fin} (${-reste} j). Le jeu tourne sur la liste de secours : écrire la saison suivante dans src/journal.js.`);
  else if (reste < 7) attention(`Mot Mystère : plus que ${reste} page(s) du Journal (fin le ${fin}). Écrire la saison suivante.`);
  else ok(`Mot Mystère : ${reste} pages du Journal en réserve (fin le ${fin}).`);
}

// 2. CLUTCH : combien de questions du jour avant de reboucler ?
function clutch() {
  const src = lire('docs/esport/questions.js');
  const debut = (src.match(/DEBUT\s*=\s*'([\d-]+)'/) || [])[1];
  const debutQ = src.indexOf('export const QUESTIONS');
  const n = (src.slice(debutQ).match(/\{\s*m:\s*'/g) || []).length;
  if (!debut || !n) return attention('CLUTCH : impossible de lire docs/esport/questions.js.');
  const jour = jours(date(debut), AUJ) + 1;
  const reste = n - jour;
  if (reste < 0) attention(`CLUTCH : les ${n} questions du jour ont toutes servi, elles repassent en boucle. Ajouter des questions à la fin de docs/esport/questions.js.`);
  else if (reste < 14) attention(`CLUTCH : plus que ${reste} questions du jour inédites (sur ${n}). En ajouter bientôt.`);
  else ok(`CLUTCH : ${reste} questions du jour inédites en réserve (jour ${jour} sur ${n}).`);
}

// 3. Actualités : la dernière date de quand ?
function actualites() {
  const dates = (lire('docs/actualites.js').match(/date:\s*"(\d{4}-\d{2}-\d{2})"/g) || [])
    .map((s) => s.match(/\d{4}-\d{2}-\d{2}/)[0]).sort();
  const der = dates[dates.length - 1];
  if (!der) return attention('Actualités : aucune date trouvée dans docs/actualites.js.');
  const age = jours(date(der), AUJ);
  if (age > 14) attention(`Actualités : dernière actu le ${der} (il y a ${age} j). Une petite actu garde le site vivant.`);
  else ok(`Actualités : dernière actu le ${der} (il y a ${age} j).`);
}

// 4. Le site répond-il ? Toutes les pages du sitemap + ads.txt.
async function enLigne() {
  if (HORS_LIGNE) return;
  const urls = (lire('docs/sitemap.xml').match(/<loc>([^<]+)<\/loc>/g) || []).map((s) => s.slice(5, -6));
  urls.push(SITE + '/ads.txt');
  const ko = [];
  const lentes = [];
  for (const u of urls) {
    const t0 = Date.now();
    try {
      const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const ms = Date.now() - t0;
      if (!r.ok) ko.push(`${u} (${r.status})`);
      else if (ms > 5000) lentes.push(`${u} (${(ms / 1000).toFixed(1)} s)`);
    } catch (e) {
      ko.push(`${u} (${e.name === 'TimeoutError' ? 'trop lent' : 'injoignable'})`);
    }
  }
  if (ko.length) alerte(`Site : ${ko.length} page(s) en panne : ${ko.join(', ')}.`);
  else ok(`Site : les ${urls.length} pages du sitemap répondent.`);
  if (lentes.length) attention(`Site : pages lentes : ${lentes.join(', ')}.`);
}

// 5. Pull requests oubliées (seulement dans GitHub Actions, avec GITHUB_TOKEN).
async function prOubliees() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (HORS_LIGNE || !repo || !token) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    const prs = await r.json();
    const vieilles = prs.filter((p) => jours(new Date(p.created_at), AUJ) >= 3);
    if (vieilles.length) attention(`GitHub : ${vieilles.length} PR ouverte(s) depuis 3 jours ou plus : ${vieilles.map((p) => `#${p.number} ${p.title}`).join(' ; ')}.`);
    else ok(`GitHub : ${prs.length} PR ouverte(s), aucune oubliée.`);
  } catch (e) {
    attention('GitHub : impossible de lire les PR ouvertes.');
  }
}

(async () => {
  motMystere();
  clutch();
  actualites();
  await enLigne();
  await prOubliees();

  const icone = { ok: '✅', attention: '⚠️', alerte: '🚨' };
  const nbProblemes = lignes.filter((l) => l.niveau !== 'ok').length;
  const ordre = { alerte: 0, attention: 1, ok: 2 };
  lignes.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  const titre = nbProblemes
    ? `${nbProblemes} point(s) à regarder`
    : 'Tout tourne tout seul';
  const md = [
    `## Rapport de veille du ${AUJ.toISOString().slice(0, 10)} : ${titre}`,
    '',
    ...lignes.map((l) => `- ${icone[l.niveau]} ${l.texte}`),
    '',
    '_Écrit chaque matin par scripts/veille.cjs. Tu n\'as qu\'à relire les ⚠️ et les 🚨._',
  ].join('\n');

  console.log(md);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `problemes=${nbProblemes}\n`);
    // Empreinte des problèmes (sans les ✅) : on ne prévient que si elle change.
    const empreinte = lignes.filter((l) => l.niveau !== 'ok').map((l) => l.texte.replace(/\d+/g, '#')).join('|');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `empreinte=${Buffer.from(empreinte).toString('base64').slice(0, 200)}\n`);
  }
  fs.writeFileSync(path.join(RACINE, 'rapport-veille.md'), md + '\n');
})();
