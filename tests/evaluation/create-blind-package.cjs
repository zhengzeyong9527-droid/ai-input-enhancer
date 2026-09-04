'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'dataset.json'), 'utf8')).cases;
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'runner-a-results.json'), 'utf8')).items;
const optimized = JSON.parse(fs.readFileSync(path.join(root, 'runner-b-results.json'), 'utf8')).items;

if (dataset.length !== 30 || baseline.length !== 30 || optimized.length !== 30) throw new Error('expected 30 cases in every input');

const blind = [];
const key = [];
for (let index = 0; index < dataset.length; index += 1) {
  const testCase = dataset[index];
  const a = baseline[index];
  const b = optimized[index];
  if (a.id !== testCase.id || b.id !== testCase.id || a.mode !== testCase.mode || b.mode !== testCase.mode) throw new Error(`alignment failed: ${testCase.id}`);
  const swap = crypto.randomInt(2) === 1;
  blind.push({
    id: testCase.id,
    mode: testCase.mode,
    originalPrompt: testCase.prompt,
    intendedConstraints: testCase.intendedConstraints,
    candidate_1: swap ? b.output : a.output,
    candidate_2: swap ? a.output : b.output,
  });
  key.push({ id: testCase.id, candidate_1: swap ? 'B' : 'A', candidate_2: swap ? 'A' : 'B' });
}

fs.writeFileSync(path.join(root, 'blind-package.json'), `${JSON.stringify({ items: blind }, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'internal-blind-key.json'), `${JSON.stringify({ items: key }, null, 2)}\n`);
console.log(JSON.stringify({ cases: blind.length, keyEntries: key.length }));
