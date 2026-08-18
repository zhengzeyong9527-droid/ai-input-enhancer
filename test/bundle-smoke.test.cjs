'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('generated host entry loads and exposes a Cordis plugin', () => {
  const plugin = require('../lib/index.cjs');
  assert.equal(plugin.name, 'zzy-dsh-prompt-optimizer');
  assert.deepEqual(plugin.inject, ['webServer', 'timer']);
  assert.equal(typeof plugin.apply, 'function');
  const prompt = require('../lib/prompt/index.js');
  assert.match(prompt.systemPromptForMode('faithful'), /Do not add clarification questions/);
});

test('generated client entry registers the expected browser module', () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.cjs'), 'utf8');
  assert.match(body, /__ModuleLoader__\.load/);
  assert.match(body, /zzy-dsh-prompt-optimizer/);
  assert.match(body, /conversation\.input\.right/);
  assert.doesNotMatch(body, /conversation\.input\.left/);
  assert.match(body, /conversation\.input\.dock/);
  assert.match(body, /zzy-prompt-optimizer__spinner/);
  assert.match(body, /zzy-prompt-optimizer__icon/);
  assert.match(body, /data:image\/png;base64,/);
  assert.match(body, /已优化，可撤回/);
  assert.match(body, /zzy-prompt-optimizer__button--undo/);
  assert.doesNotMatch(body, /zzy-prompt-optimizer__inline-undo/);
  assert.doesNotMatch(body, /已填入优化稿/);
  assert.doesNotMatch(body, /Prompt optimization preview/);
  assert.doesNotMatch(body, /zzy-prompt-optimizer__preview/);
  assert.doesNotMatch(body, /应用优化稿/);
});
