import test from 'node:test';
import assert from 'node:assert/strict';
import { trouverRole, xpPour, niveauDe, palierDe, ajouterXp, topNiveaux, CATEGORIES, TOUS_LES_ROLES } from '../src/roles.js';
import { GRADES } from '../src/staff.js';
import { commandes } from '../src/commandes.js';

test('niveaux : paliers', () => {
  assert.equal(niveauDe(0), 0);
  assert.equal(niveauDe(99), 0);
  assert.equal(niveauDe(100), 1);
  assert.equal(niveauDe(xpPour(10)), 10);
  assert.equal(palierDe(0), null);
  assert.equal(palierDe(1).nom, 'Nouveau');
  assert.equal(palierDe(4).nom, 'Nouveau');
  assert.equal(palierDe(5).nom, 'Actif');
  assert.equal(palierDe(10).nom, 'Actif');
  assert.equal(palierDe(49).nom, 'Incontournable');
  assert.equal(palierDe(80).nom, 'Élite');
});

test('XP : 1 message par minute compte', () => {
  const d = {};
  assert.deepEqual(ajouterXp('a', 'Alice', 20, d, 1_000_000), { avant: 0, apres: 0 });
  assert.equal(ajouterXp('a', 'Alice', 20, d, 1_030_000), null); // trop tôt
  for (let k = 1; k < 5; k++) ajouterXp('a', 'Alice', 20, d, 1_000_000 + k * 61_000);
  assert.equal(d.a.xp, 100);
  assert.equal(niveauDe(d.a.xp), 1);
  ajouterXp('b', 'Bob', 10, d, 0, 'vocal'); ajouterXp('b', 'Bob', 10, d, 0, 'vocal'); // le vocal n'a pas de pause
  assert.equal(d.b.xp, 20);
  assert.deepEqual(topNiveaux(d).map((j) => j.nom), ['Alice', 'Bob']);
});

test('rôles : noms uniques, pas de conflit avec le staff, menus valides', () => {
  const noms = TOUS_LES_ROLES.map((r) => r.nom);
  assert.equal(new Set(noms).size, noms.length);
  for (const g of GRADES) assert.ok(!noms.includes(g.nom), g.nom);
  for (const c of Object.values(CATEGORIES)) {
    assert.ok(c.roles.length <= 25 && c.max <= c.roles.length);
    assert.ok(`${c.titre} : ${c.texte}`.length <= 150);
  }
  const cmd = commandes.map((c) => c.name);
  for (const n of ['roles-setup', 'reglement', 'roles-panneau', 'niveau', 'top-niveaux']) assert.ok(cmd.includes(n));
  assert.equal(new Set(cmd).size, cmd.length);
});

test('rôles existants réutilisés (emoji, alias)', () => {
  const roles = new Map(['🍸・Membre', '💎・Vip', '🤖・Bot', 'Naufragés Bot', 'DraftBot', '🔥・Actif', '🔔・Notif Annonce', '🚼・Mineur']
    .map((name, k) => [String(k), { name, managed: /Bot$/.test(name) && !name.includes('・') }]));
  assert.equal(trouverRole(roles, 'Membre').name, '🍸・Membre');
  assert.equal(trouverRole(roles, 'VIP').name, '💎・Vip');
  assert.equal(trouverRole(roles, 'Bot').name, '🤖・Bot');
  assert.equal(trouverRole(roles, 'Actif').name, '🔥・Actif');
  assert.equal(trouverRole(roles, 'Notif Annonces').name, '🔔・Notif Annonce');
  assert.equal(trouverRole(roles, '-18').name, '🚼・Mineur');
  assert.equal(trouverRole(roles, '+18'), undefined);
  assert.equal(trouverRole(roles, 'Élite'), undefined);
});
