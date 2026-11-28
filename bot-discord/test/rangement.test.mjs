import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordreVoulu, ordreRespectueux, categorie } from '../src/rangement.js';

test('catégories', () => {
  const c = (name, managed = false) => categorie({ name, managed }, null);
  assert.equal(c('☄️・Modérateur'), 'staff');
  assert.equal(c('Modo-Joueur'), 'staff');
  assert.equal(c('💉・Admin'), 'direction');
  assert.equal(c('gerant serveur'), 'direction');
  assert.equal(c('🍹・Co-fondateur'), 'direction');
  assert.equal(c('🗡directeur'), 'direction');
  assert.equal(c('🔥・Staff'), 'staff');
  assert.equal(c('MC・Admin'), 'minecraft');
  assert.equal(c('📍・Recruteur'), 'staff');
  assert.equal(c('📨・Recruteur'), 'soutiens');
  assert.equal(c('MC・Légende'), 'minecraft');
  assert.equal(c('Métier・Mineur'), 'minecraft');
  assert.equal(c('MINECRAFT'), 'jeux');
  assert.equal(c('🔔・Notif Annonce'), 'notifs');
  assert.equal(c('🔔・Rappel vote'), 'notifs');
  assert.equal(c('🍸・Membre'), 'membres');
  assert.equal(c('🚻・Majeur'), 'profil');
  assert.equal(c('Muted'), 'sanctions');
  assert.equal(c('MEE6', true), 'bots');
  assert.equal(c('Booster MC'), 'soutiens');
  assert.equal(c('🎥・equipe mc'), 'crea');
  assert.equal(c('truc inconnu'), 'haut');
  assert.equal(categorie({ name: '🔮・Booster', managed: true, booster: true }, null), 'soutiens');
});

test('ordre voulu', () => {
  const roles = [
    { id: 'x', name: 'gerant serveur' },
    { id: 's1', name: '────' },
    { id: 'm', name: '🍸・Membre' },
    { id: 'mod', name: '☄️・Modérateur' },
    { id: 'bot', name: 'MEE6', managed: true },
    { id: 'n', name: '🔔・Notif Annonce' },
  ];
  const o = ordreVoulu(roles, { staff: 's1', membres: 'S5', notifs: 'S8', bots: 'S3' });
  assert.deepEqual(o, ['x', 's1', 'mod', 'S3', 'bot', 'S5', 'm', 'S8', 'n']);
  const o2 = ordreVoulu([{ id: 'xe', name: 'Xenon', managed: true }, { id: '1571489286426071052', name: 'Naufragés Liaison', managed: true }], { bots: 'B' });
  assert.deepEqual(o2, ['B', '1571489286426071052', 'xe']);
  assert.equal(categorie({ name: '🌴 En absence' }, null), 'staff');
  assert.equal(categorie({ name: 'Twitch Subscriber', managed: true, abonne: true }, null), 'soutiens');
});

test('monteur et graphiste rangés entre MC・Habitué et MC・Membre', () => {
  const roles = [
    { id: 'm', name: 'monteur 🧑‍💻' }, { id: 'g', name: 'graphiste ✏️' }, { id: 'mu', name: 'musicien 🎙️' },
    { id: 'h', name: 'MC・Habitué' }, { id: 'mb', name: 'MC・Membre' },
  ];
  const o = ordreVoulu(roles, {});
  assert.deepEqual(o.filter((x) => ['h', 'm', 'g', 'mb'].includes(x)), ['h', 'm', 'g', 'mb']);
  assert.ok(o.indexOf('mu') > o.indexOf('h') && o.indexOf('mu') < o.indexOf('mb'));
});

test('mode respect : ordre manuel gardé, seuls les nouveaux sont placés', () => {
  const sep = { direction: 'D', staff: 'S', bots: 'B', crea: 'C' };
  const roles = [{ id: 'D' }, { id: 'f', name: 'Fondateur' }, { id: 'B' }, { id: 'xe', name: 'Xenon', managed: true },
    { id: 'S' }, { id: 'mod', name: '☄️・Modérateur' }, { id: 'perso', name: 'truc perso' }, { id: 'C' }, { id: 'mo', name: 'monteur' },
    { id: 'nb', name: 'NouveauBot', managed: true }];
  // 1re fois + bots déplacés sous le staff
  assert.deepEqual(ordreRespectueux(roles, sep, [], true), ['D', 'f', 'S', 'mod', 'perso', 'B', 'xe', 'nb', 'C', 'mo']);
  // ensuite : ordre manuel gardé, nouveau bot placé à la fin des bots
  const actuel = [{ id: 'D' }, { id: 'f', name: 'Fondateur' }, { id: 'S' }, { id: 'perso', name: 'truc perso' }, { id: 'mod', name: '☄️・Modérateur' },
    { id: 'B' }, { id: 'xe', name: 'Xenon', managed: true }, { id: 'C' }, { id: 'mo', name: 'monteur' }, { id: 'nb', name: 'NouveauBot', managed: true }];
  assert.deepEqual(ordreRespectueux(actuel, sep, ['D', 'f', 'S', 'perso', 'mod', 'B', 'xe', 'C', 'mo']), ['D', 'f', 'S', 'perso', 'mod', 'B', 'xe', 'nb', 'C', 'mo']);
});

test('musicien nouveau placé sous graphiste', () => {
  const r = [{ id: 'h', name: 'MC・Habitué' }, { id: 'mo', name: 'monteur' }, { id: 'g', name: 'graphiste' }, { id: 'mb', name: 'MC・Membre' }, { id: 'mu', name: 'musicien 🎙️' }];
  assert.deepEqual(ordreRespectueux(r, {}, ['h', 'mo', 'g', 'mb']), ['h', 'mo', 'g', 'mu', 'mb']);
});
