'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isRelevantDocument, workspaceDocumentContext } = require('../src/host/context-provider.js');

test('selects README and prompt-relevant markdown documents', () => {
  assert.equal(isRelevantDocument('README.md', 'anything'), true);
  assert.equal(isRelevantDocument('login.md', 'fix login validation'), true);
  assert.equal(isRelevantDocument('notes.md', 'fix login validation'), false);
});

test('reads only contained relevant markdown within budget', async () => {
  const root = { key: 'root' };
  const safe = { key: 'safe' };
  const outside = { key: 'outside' };
  const fs = {
    listDir: async () => [{ name: 'README.md', type: 'file', target: safe }, { name: 'secret.md', type: 'file', target: outside }],
    contains: (_root, target) => target === safe,
    readText: async () => 'documentation text'
  };
  const result = await workspaceDocumentContext(fs, root, 'anything', 10);
  assert.equal(result.text, 'Document: README.md\ndocumentat');
  assert.equal(result.evidence[0].kind, 'workspace-documents');
  assert.deepEqual(result.evidence[0].sources, ['README.md']);
});
