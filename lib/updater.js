'use strict';

const RELEASE_REPO = 'zhengzeyong9527-droid/zzy-dsh-prompt-optimizer';
const PACKAGE_NAME = 'zzy-dsh-prompt-optimizer';

function parseVersion(value) {
  const match = typeof value === 'string' && value.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function validateRelease(release) {
  if (!release || typeof release !== 'object' || release.draft || release.prerelease) return null;
  const version = parseVersion(release.tag_name);
  if (!version) return null;
  const filename = PACKAGE_NAME + '-' + version.join('.') + '.tgz';
  const asset = Array.isArray(release.assets) ? release.assets.find((item) => item && item.name === filename && typeof item.browser_download_url === 'string') : null;
  if (!asset || typeof asset.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(asset.digest)) return null;
  return { version: version.join('.'), tag: release.tag_name, asset: { name: asset.name, url: asset.browser_download_url, sha256: asset.digest.slice(7).toLowerCase() } };
}

function updateStatus(current, release) {
  const parsed = validateRelease(release);
  if (!parsed) return { ok: false, code: 'INVALID_RELEASE', message: 'The latest official release is missing a verified package asset.' };
  const comparison = compareVersions(current, parsed.version);
  if (comparison === null) return { ok: false, code: 'INVALID_LOCAL_VERSION', message: 'The installed plugin version is invalid.' };
  return { ok: true, repo: RELEASE_REPO, current, latest: parsed.version, tag: parsed.tag, asset: parsed.asset.name, available: comparison < 0, restartRequired: comparison < 0 };
}

module.exports = { PACKAGE_NAME, RELEASE_REPO, compareVersions, updateStatus, validateRelease };
