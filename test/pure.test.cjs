'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pure = require('../src/host/pure.js');

test('validates a faithful enhancement request and normalizes defaults', () => {
  const result = pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: 'Clarify this task', mode: 'faithful' });
  assert.equal(result.ok, true);
  assert.equal(result.value.useDefaultModel, true);
  assert.equal(result.value.timeoutMs, 30000);
});

test('rejects unsupported modes and empty text', () => {
  assert.equal(pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: '', mode: 'faithful' }).code, 'BAD_TEXT');
  assert.equal(pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: 'x', mode: 'publish' }).code, 'UNSUPPORTED_MODE');
});

test('requires a complete manual primary route', () => {
  const invalid = pure.normalizeConfig({ useDefaultModel: false, primary: { provider: 'deepseek', model: '' } });
  assert.equal(invalid.ok, false);
  const valid = pure.normalizeConfig({ useDefaultModel: false, primary: { provider: 'deepseek', model: 'chat' }, fallback: { provider: 'other', model: 'fast' }, timeoutMs: 45000, maxTokens: 1200 });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.primary.model, 'chat');
  assert.equal(valid.value.fallback.model, 'fast');
});

test('accepts a completely empty fallback route', () => {
  const result = pure.normalizeConfig({ fallback: { provider: '', model: '' } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.fallback, { provider: '', model: '' });
  assert.equal(pure.normalizeConfig({ fallback: { provider: 'openai', model: '' } }).ok, false);
});

test('resolves the inherited route and removes duplicate fallback', () => {
  const config = pure.normalizeConfig({ fallback: { provider: 'backup', model: 'small' } }).value;
  assert.deepEqual(pure.resolveRoutes(config, { provider: 'default', model: 'main' }), [
    { provider: 'default', model: 'main' },
    { provider: 'backup', model: 'small' }
  ]);
  config.fallback = { provider: 'default', model: 'main' };
  assert.deepEqual(pure.resolveRoutes(config, { provider: 'default', model: 'main' }), [{ provider: 'default', model: 'main' }]);
});

test('accepts explicit modes and bounded session memory', () => {
  const developer = pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: 'Improve this API', mode: 'developer', memory: [{ input: 'first', output: 'first optimized' }] });
  assert.equal(developer.ok, true);
  assert.equal(developer.value.mode, 'developer');
  assert.equal(developer.value.memoryRounds.length, 1);
  assert.equal(pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: 'x', mode: 'unknown' }).code, 'UNSUPPORTED_MODE');
  assert.equal(pure.validateEnhanceArgs({ sessionId: 'session-1', seq: 4, text: 'x', mode: 'faithful', memory: [{ input: 'a', output: 'b' }, { input: 'a', output: 'b' }, { input: 'a', output: 'b' }, { input: 'a', output: 'b' }] }).code, 'BAD_MEMORY');
});

test('creates a user message without runtime references', () => {
  const message = pure.createMessage('session-1', 2, 'Keep constraints');
  assert.equal(message.role, 'user');
  assert.equal(message.content[0].text, 'Keep constraints');
  assert.deepEqual(message.source, { kind: 'user' });
});

test('only accepts usable model selections', () => {
  assert.deepEqual(pure.modelSelection({ provider: 'deepseek', model: 'chat' }), { provider: 'deepseek', model: 'chat' });
  assert.equal(pure.modelSelection({ provider: '', model: 'chat' }), null);
});

test('rejects oversized model output', () => {
  assert.equal(pure.cleanResult('  useful output  '), 'useful output');
  assert.equal(pure.cleanResult('x'.repeat(24001)), '');
});
