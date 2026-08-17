'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { faithful, systemPromptForMode } = require('../src/host/prompt/index.js');

test('faithful prompt forbids injected confirmations and external-context checks', () => {
  assert.match(faithful, /Do not add clarification questions, confirmation requests, prerequisites, warnings, conditional statements, or assumptions/);
  assert.match(faithful, /Do not assess whether it exists, is uploaded, readable, complete, clear, or sufficient/);
  assert.match(faithful, /Do not convert missing information into instructions for the user/);
  assert.doesNotMatch(faithful, /express it as a concise clarification need/);
});

test('mode selector returns explicit prompt configurations', () => {
  assert.equal(systemPromptForMode('faithful'), faithful);
  assert.match(systemPromptForMode('developer'), /implementation-ready inputs, outputs, constraints/);
  assert.match(systemPromptForMode('specification'), /## Default assumptions/);
  assert.equal(systemPromptForMode('unknown'), faithful);
});
