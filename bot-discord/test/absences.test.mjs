import test from 'node:test';
import assert from 'node:assert/strict';
import { lireDate, verifierDemande, absentsSur, heureParisVersUtc, duree, estRoleStaff, REGLES } from '../src/absences.js';
import { commandes } from '../src/commandes.js';

const JOUR = 86_400_000;
const NOW = Date.UTC(2026, 10, 20, 13, 0); // 20/11/2026 14:00 à Bruxelles (hiver, UTC+1)

test('dates en heure de Bruxelles', () => {
  assert.equal(lireDate('19/12/2026 10:00', { maintenant: NOW }), Date.UTC(2026, 11, 19, 9, 0));
  assert.equal(lireDate('19/12 10h', { maintenant: NOW }), Date.UTC(2026, 11, 19, 9, 0));
  assert.equal(lireDate('19-12-26', { maintenant: NOW }), Date.UTC(2026, 11, 18, 23, 0));
  assert.equal(lireDate('19/12/2026', { fin: true, maintenant: NOW }), Date.UTC(2026, 11, 19, 22, 59));
  assert.equal(lireDate('5/1 9h', { maintenant: Date.UTC(2026, 11, 20) }), Date.UTC(2027, 0, 5, 8, 0)); // l'an prochain
  assert.equal(lireDate('maintenant', { maintenant: NOW }), NOW);
  assert.equal(lireDate('demain 9h', { maintenant: NOW }), Date.UTC(2026, 10, 21, 8, 0));
  assert.equal(lireDate('15/07/2027 12:00'), Date.UTC(2027, 6, 15, 10, 0)); // été, UTC+2
  assert.equal(heureParisVersUtc(2027, 3, 28, 12, 0), Date.UTC(2027, 2, 28, 10, 0)); // jour du changement d'heure
  for (const faux of ['', 'bientôt', '31/02/2027', '12/13/2026', '10/12/2026 25:00']) assert.equal(lireDate(faux, { maintenant: NOW }), null, faux);
});

test('règles des absences', () => {
  const ok = (debut, fin, liste = [], o = {}) => verifierDemande(liste, 'u', debut, fin, { maintenant: NOW, ...o });
  assert.equal(ok(NOW + JOUR, NOW + 5 * JOUR), null);
  assert.match(ok(NOW + JOUR, NOW), /après le début/);
  assert.match(ok(NOW, NOW + 11 * JOUR), /10 jours/);
  assert.match(ok(NOW + 61 * JOUR, NOW + 62 * JOUR), /60 jours/);
  assert.equal(ok(NOW - JOUR, NOW + JOUR), null); // après coup, 1 jour : OK
  assert.match(ok(NOW - 3 * JOUR, NOW + JOUR), /2 jours/);
  assert.equal(ok(NOW - 3 * JOUR, NOW + JOUR, [], { parResponsable: true }), null);
  const attente = [{ id: 1, userId: 'u', debut: NOW + 20 * JOUR, fin: NOW + 22 * JOUR, statut: 'attente' }];
  assert.match(ok(NOW + JOUR, NOW + 2 * JOUR, attente), /déjà une demande en attente/);
  const acceptee = [{ id: 2, userId: 'u', debut: NOW + JOUR, fin: NOW + 3 * JOUR, statut: 'acceptee' }];
  assert.match(ok(NOW + 2 * JOUR, NOW + 4 * JOUR, acceptee), /chevauch|déjà une absence/);
  assert.equal(ok(NOW + 3 * JOUR, NOW + 4 * JOUR, acceptee), null); // juste après : OK
  assert.equal(ok(NOW + 2 * JOUR, NOW + 4 * JOUR, [{ ...acceptee[0], statut: 'refusee' }]), null);
  assert.equal(REGLES.prolongationsMax, 2);
});

test('absents sur une période, durée, rôles staff', () => {
  const liste = [
    { userId: 'a', debut: 0, fin: 10, statut: 'acceptee' },
    { userId: 'b', debut: 5, fin: 15, statut: 'attente' },
    { userId: 'c', debut: 0, fin: 20, statut: 'refusee' },
  ];
  assert.deepEqual(absentsSur(liste, 8, 12, 'x').map((a) => a.userId), ['a', 'b']);
  assert.deepEqual(absentsSur(liste, 8, 12, 'a').map((a) => a.userId), ['b']);
  assert.equal(duree(0, 8 * JOUR), '8 jours');
  assert.equal(duree(0, 3 * 3_600_000), '3 h');
  assert.ok(estRoleStaff('Modo') && estRoleStaff('🛡️・Modo') && !estRoleStaff('Membre'));
});

test('commandes absences présentes', () => {
  const noms = commandes.map((c) => c.name);
  assert.ok(noms.includes('absences') && noms.includes('absences-setup'));
  assert.equal(new Set(noms).size, noms.length);
});
