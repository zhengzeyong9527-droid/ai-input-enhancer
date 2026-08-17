'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { conversationContext, textFromEvent } = require('../src/host/context-provider.js');

test('extracts only text from user and assistant surface events', () => {
  assert.equal(textFromEvent({ type: 'tool/result', data: { content: [{ type: 'text', text: 'secret' }] } }), '');
  assert.equal(textFromEvent({ type: 'user/message', data: { content: [{ type: 'text', text: '  keep this  ' }, { type: 'image' }] } }), 'keep this');
});

test('caps conversation context and reports evidence', async () => {
  const query = { readSurface: async () => ({ events: [
    { type: 'user/message', data: { content: [{ type: 'text', text: 'first message' }] } },
    { type: 'assistant/message', data: { content: [{ type: 'text', text: 'second message' }] } }
  ] }) };
  const result = await conversationContext(query, 's1', 10);
  assert.equal(result.text, 'nd message');
  assert.deepEqual(result.evidence, [{ kind: 'conversation', chars: 10 }]);
});

test('degrades to no context when query fails', async () => {
  const result = await conversationContext({ readSurface: async () => { throw new Error('unavailable'); } }, 's1', 100);
  assert.deepEqual(result, { text: '', evidence: [] });
});
