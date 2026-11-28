import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semaineIso, construireRapport, grouperMessages, partiesBxl, dateLongue } from '../src/rapport.js';
import { prochaineHeure, maintenanceActive, embedMaintenance } from '../src/annonces-mc.js';

test('semaine ISO', () => {
  assert.equal(semaineIso('2026-11-17'), '2026-W47');
  assert.equal(semaineIso('2026-11-23'), '2026-W48');
  assert.equal(semaineIso('2026-11-22'), '2026-W47');
  assert.equal(semaineIso('2027-01-01'), '2026-W53');
});

test('lundi à Bruxelles', () => {
  const p = partiesBxl(new Date('2026-11-23T08:30:00Z'));
  assert.equal(p.lundi, true); assert.equal(p.heure, 9); assert.equal(p.iso, '2026-11-23');
});

test('rapport complet tient dans les limites Discord', () => {
  const notes = JSON.parse(fs.readFileSync(new URL('../data-seed/changelog.json', import.meta.url), 'utf8'));
  const embeds = construireRapport(notes, { debut: '2026-11-14', fin: '2026-11-17', numero: 1, stats: { mesures: 100, enLigne: 97, pic: 4, joueursVus: ['a'] } });
  for (const e of embeds) assert.ok((e.data.description ?? '').length <= 4096);
  for (const m of grouperMessages(embeds)) {
    assert.ok(m.length <= 10);
    assert.ok(m.reduce((s, e) => s + JSON.stringify(e.data).length, 0) < 7000);
  }
  assert.match(embeds.at(-1).data.description, /97 %/);
  assert.equal(dateLongue('2026-11-17', true), '17 novembre 2026');
});

test('maintenance : heure et fenêtre', () => {
  const now = Date.parse('2026-11-17T15:40:00Z'); // 16:40 à Bruxelles
  assert.equal(new Date(prochaineHeure('21:30', now)).toISOString(), '2026-11-17T20:30:00.000Z');
  assert.equal(new Date(prochaineHeure('9h', now)).toISOString(), '2026-11-18T08:00:00.000Z');
  assert.equal(prochaineHeure('bof', now), null);
  const m = { debut: now, fin: now + 1800_000, raison: 'x' };
  assert.ok(maintenanceActive(m, now - 60_000));
  assert.ok(!maintenanceActive(m, now - 3600_000));
  for (const t of ['annonce', 'rappel', 'debut', 'fin', 'annulation']) assert.ok(embedMaintenance(m, t).data.title);
});
