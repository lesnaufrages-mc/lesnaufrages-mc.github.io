import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { ping, suivant, redemarragePrevu, embedStatut, texteAnnonce, REDEMARRAGE_MAX_MS } from '../src/minecraft.js';

const vv = (n) => { const o = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n); return Buffer.from(o); };

test('ping : lit la réponse d\'un faux serveur Minecraft', async () => {
  const statut = { version: { name: 'Paper 1.21.11' }, players: { online: 3, max: 40, sample: [{ name: 'Lord' }, { name: 'Loki' }] }, description: { text: 'Les ', extra: [{ text: 'Naufragés' }] } };
  const srv = net.createServer((s) => s.once('data', () => {
    const json = Buffer.from(JSON.stringify(statut));
    const corps = Buffer.concat([vv(0), vv(json.length), json]);
    // envoyé en 2 morceaux pour vérifier le réassemblage
    const tout = Buffer.concat([vv(corps.length), corps]);
    s.write(tout.subarray(0, 10)); setTimeout(() => s.end(tout.subarray(10)), 20);
  }));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const r = await ping('127.0.0.1', srv.address().port, 2000);
  srv.close();
  assert.deepEqual(r, { joueurs: 3, max: 40, noms: ['Lord', 'Loki'], version: 'Paper 1.21.11', motd: 'Les Naufragés' });
});

test('ping : serveur fermé = erreur', async () => {
  const srv = net.createServer(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port; srv.close();
  await assert.rejects(ping('127.0.0.1', port, 1000));
});

const infos = { joueurs: 1, max: 40, noms: [], version: '1.21.11', motd: '' };

test('états : démarrage du bot sans annonce', () => {
  assert.equal(suivant({ etat: 'inconnu' }, infos, 0).annonce, null);
  let { e } = suivant({ etat: 'inconnu' }, null, 0);
  assert.equal(e.etat, 'inconnu'); // 1 échec ne suffit pas
  ({ e } = suivant(e, null, 60_000));
  assert.equal(e.etat, 'eteint');
});

test('états : en ligne → redémarrage → en ligne', () => {
  let e = { etat: 'en_ligne', depuis: 0, echecs: 0 };
  let r = suivant(e, null, Date.UTC(2026, 10, 14, 12, 0));
  assert.equal(r.annonce, null); // 1 ping raté : on attend
  r = suivant(r.e, null, Date.UTC(2026, 10, 14, 12, 1));
  assert.equal(r.annonce, 'redemarrage'); assert.equal(r.e.etat, 'redemarrage'); assert.equal(r.e.prevu, false);
  r = suivant(r.e, infos, Date.UTC(2026, 10, 14, 12, 3));
  assert.equal(r.annonce, 'en_ligne'); assert.equal(r.e.etat, 'en_ligne');
});

test('états : redémarrage trop long → éteint', () => {
  const e = { etat: 'redemarrage', depuis: 0, echecs: 5 };
  assert.equal(suivant(e, null, REDEMARRAGE_MAX_MS - 1).annonce, null);
  const r = suivant(e, null, REDEMARRAGE_MAX_MS + 1);
  assert.equal(r.annonce, 'eteint'); assert.equal(r.e.etat, 'eteint');
  assert.equal(suivant(r.e, infos, REDEMARRAGE_MAX_MS + 2).annonce, 'en_ligne');
});

test('redémarrage quotidien de 5 h (heure belge)', () => {
  assert.equal(redemarragePrevu(new Date('2026-11-15T04:01:00Z')), true); // 5h01 en hiver
  assert.equal(redemarragePrevu(new Date('2026-11-15T03:50:00Z')), false); // 4h50
  assert.equal(redemarragePrevu(new Date('2026-11-15T12:00:00Z')), false);
  assert.match(texteAnnonce('redemarrage', { prevu: true }).embeds[0].data.title, /quotidien/);
  assert.match(texteAnnonce('eteint', {}).embeds[0].data.title, /Interruption/);
  assert.match(texteAnnonce('en_ligne', { maintenance: { debut: 0, fin: 60_000, raison: 'test' } }).embeds[0].data.title, /Maintenance terminée/);
});

test('message de statut', () => {
  const j = embedStatut({ etat: 'en_ligne', depuis: 1e12, infos: { ...infos, noms: ['Lord'] } }).toJSON();
  assert.match(JSON.stringify(j.fields), /En ligne/);
  assert.match(JSON.stringify(j.fields), /30603/);
  assert.match(JSON.stringify(j.fields), /Lord/);
  assert.equal(j.footer.text.startsWith('Statut du serveur'), true);
});
