'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');

const PORT = Number(process.env.ZZY_UPDATER_PORT || 3081);
const REPO = 'zhengzeyong9527-droid/zzy-dsh-prompt-optimizer';
const PACKAGE = 'zzy-dsh-prompt-optimizer';
const DSH_BIN = process.env.DSH_DSH_BIN || '';
const state = { phase: 'idle', message: '', busy: false, staged: '' };

function reply(response, body) {
  response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': PACKAGE } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(download(response.headers.location, destination));
      if (response.statusCode !== 200) return reject(new Error('Download failed with HTTP ' + response.statusCode));
      const output = fs.createWriteStream(destination);
      response.pipe(output);
      output.on('finish', () => output.close(resolve));
      output.on('error', reject);
    }).on('error', reject);
  });
}

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function dshWebProcess() {
  return new Promise((resolve) => {
    const command = "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*@deepseek-ai*dsh*lib*bin.js*web*' } | Select-Object -First 1 ProcessId,CommandLine | ConvertTo-Json -Compress";
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      if (error || !stdout.trim()) return resolve(null);
      try { const value = JSON.parse(stdout); resolve(Number.isInteger(value.ProcessId) && typeof value.CommandLine === 'string' && /@deepseek-ai[\\/]+dsh[\\/]+lib[\\/]+bin\.js[\"']?\s+web(?:\s|$)/i.test(value.CommandLine) ? value : null); } catch { resolve(null); }
    });
  });
}

function webHealthy() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: 3080 });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(2000, () => done(false));
  });
}

async function stage(args) {
  if (state.busy) return { ok: false, code: 'BUSY' };
  const tag = args && typeof args.tag === 'string' ? args.tag : '';
  const assetUrl = args && typeof args.assetUrl === 'string' ? args.assetUrl : '';
  const expected = args && typeof args.sha256 === 'string' ? args.sha256.toLowerCase() : '';
  if (!/^v\d+\.\d+\.\d+$/.test(tag) || !/^https:\/\/github\.com\/zhengzeyong9527-droid\/zzy-dsh-prompt-optimizer\/releases\/download\//.test(assetUrl) || !/^[a-f0-9]{64}$/.test(expected)) return { ok: false, code: 'BAD_ARGS' };
  state.busy = true; state.phase = 'staging'; state.message = 'Downloading ' + tag;
  try {
    const target = path.join(os.tmpdir(), PACKAGE + '-' + tag.slice(1) + '.tgz');
    await download(assetUrl, target);
    if (sha256(target) !== expected) { fs.unlinkSync(target); return { ok: false, code: 'INTEGRITY_FAILED' }; }
    state.phase = 'staged'; state.staged = target; state.message = 'Verified update staged.';
    return { ok: true, tag, staged: target, restartRequired: true };
  } catch (error) { state.phase = 'failed'; state.message = String(error.message || error); return { ok: false, code: 'STAGE_FAILED', message: state.message }; }
  finally { state.busy = false; }
}

async function restartWeb() {
  const snapshot = await dshWebProcess();
  const match = snapshot && snapshot.CommandLine.match(/\"([^\"]+[\\/]@deepseek-ai[\\/]dsh[\\/]lib[\\/]bin\.js)\"\s+web/i);
  if (!snapshot || !match) return { ok: false, code: 'DSH_WEB_NOT_FOUND' };
  state.phase = 'restarting'; state.message = 'Stopping DSH Web';
  await new Promise((resolve) => execFile('taskkill.exe', ['/F', '/T', '/PID', String(snapshot.ProcessId)], { windowsHide: true, timeout: 10000 }, resolve));
  const child = spawn(process.execPath, [match[1], 'web'], { detached: true, stdio: 'ignore', windowsHide: true, env: process.env });
  child.unref();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await webHealthy()) { state.phase = 'healthy'; state.message = 'DSH Web restarted.'; return { ok: true, pid: child.pid, healthy: true }; }
  }
  state.phase = 'failed'; state.message = 'DSH Web did not become healthy.';
  return { ok: false, code: 'RESTART_TIMEOUT' };
}

function install(staged) {
  return new Promise((resolve) => {
    if (!DSH_BIN || !fs.existsSync(DSH_BIN)) return resolve({ ok: false, code: 'DSH_BIN_UNAVAILABLE' });
    if (typeof staged !== 'string' || !staged.startsWith(os.tmpdir()) || !fs.existsSync(staged)) return resolve({ ok: false, code: 'BAD_STAGING_PATH' });
    const child = spawn(process.execPath, [DSH_BIN, 'plugin', '--profile', 'web', 'add', staged], { windowsHide: true, stdio: 'ignore' });
    child.once('error', () => resolve({ ok: false, code: 'INSTALL_SPAWN_FAILED' }));
    child.once('close', (code) => resolve(code === 0 ? { ok: true, restartRequired: true } : { ok: false, code: 'INSTALL_FAILED' }));
  });
}

http.createServer((request, response) => {
  if (request.method === 'OPTIONS') return reply(response, { ok: true });
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', async () => {
    try {
      const value = JSON.parse(body || '{}');
      if (value.method === 'ping') return reply(response, { ok: true, port: PORT, pid: process.pid });
      if (value.method === 'status') return reply(response, { ok: true, ...state });
      if (value.method === 'health') return reply(response, { ok: true, healthy: await webHealthy(), port: 3080 });
      if (value.method === 'process') return reply(response, { ok: true, process: await dshWebProcess() });
      if (value.method === 'apply') return reply(response, await stage(value.args));
      if (value.method === 'install') return reply(response, await install(state.staged));
      if (value.method === 'restart') return reply(response, await restartWeb());
      return reply(response, { ok: false, code: 'UNKNOWN_METHOD' });
    } catch { return reply(response, { ok: false, code: 'BAD_REQUEST' }); }
  });
}).listen(PORT, '127.0.0.1');
