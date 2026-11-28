import test from 'node:test';
import assert from 'node:assert/strict';
import { estEnLive } from '../src/twitch.js';
test('détecte le live Twitch', () => {
  assert.ok(!estEnLive('lordmattstark is offline'));
  assert.ok(estEnLive('1 hour, 4 minutes, 2 seconds'));
  assert.ok(!estEnLive(''));
  assert.ok(!estEnLive('User not found: x'));
});
