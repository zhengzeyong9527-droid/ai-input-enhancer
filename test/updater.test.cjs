'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, updateStatus, validateRelease } = require('../src/host/updater.js');

const release = {
  tag_name: 'v0.2.1',
  draft: false,
  prerelease: false,
  assets: [{
    name: 'zzy-dsh-prompt-optimizer-0.2.1.tgz',
    browser_download_url: 'https://github.com/zhengzeyong9527-droid/zzy-dsh-prompt-optimizer/releases/download/v0.2.1/zzy-dsh-prompt-optimizer-0.2.1.tgz',
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  }]
};

test('compares strict stable semantic versions', () => {
  assert.equal(compareVersions('0.2.0', '0.2.1'), -1);
  assert.equal(compareVersions('0.2.1', '0.2.1'), 0);
  assert.equal(compareVersions('0.3.0', '0.2.1'), 1);
  assert.equal(compareVersions('0.2', '0.2.1'), null);
});

test('accepts only a verified matching official tarball', () => {
  assert.equal(validateRelease(release).asset.name, 'zzy-dsh-prompt-optimizer-0.2.1.tgz');
  assert.equal(validateRelease({ ...release, prerelease: true }), null);
  assert.equal(validateRelease({ ...release, assets: [] }), null);
});

test('reports an available update only when release validation succeeds', () => {
  const status = updateStatus('0.2.0', release);
  assert.equal(status.ok, true);
  assert.equal(status.available, true);
  assert.equal(status.restartRequired, true);
  assert.equal(updateStatus('0.2.0', { ...release, draft: true }).code, 'INVALID_RELEASE');
});
