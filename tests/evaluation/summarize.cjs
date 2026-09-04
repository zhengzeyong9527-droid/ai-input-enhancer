'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'dataset.json'), 'utf8')).cases;
const key = JSON.parse(fs.readFileSync(path.join(root, 'internal-blind-key.json'), 'utf8')).items;
const evaluation = JSON.parse(fs.readFileSync(path.join(root, 'blind-evaluation.json'), 'utf8')).items;
const metrics = ['taskSuccess', 'fidelity', 'clarityExecutability', 'constraintAdherence', 'restraint'];
const flags = ['success', 'unsupportedAssumption', 'scopeExpansion', 'constraintViolation'];
const modes = ['faithful', 'developer', 'specification'];

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function percent(value, total) {
  return `${((value / total) * 100).toFixed(1)}%`;
}

const keyById = new Map(key.map((item) => [item.id, item]));
const caseById = new Map(dataset.map((item) => [item.id, item]));
const results = evaluation.map((item) => {
  const mapping = keyById.get(item.id);
  const testCase = caseById.get(item.id);
  if (!mapping || !testCase) throw new Error(`missing key or case: ${item.id}`);
  const candidateFor = (arm) => mapping.candidate_1 === arm ? item.candidate_1 : item.candidate_2;
  let winner = 'tie';
  if (item.winner !== 'tie') winner = mapping[item.winner];
  return { id: item.id, mode: item.mode, taskType: testCase.taskType, A: candidateFor('A'), B: candidateFor('B'), winner, reason: item.reason };
});

function summarize(items) {
  const summary = { cases: items.length, arms: {}, wins: { A: 0, B: 0, tie: 0 } };
  for (const arm of ['A', 'B']) {
    summary.arms[arm] = { scores: {}, flags: {} };
    for (const metric of metrics) {
      const values = items.map((item) => item[arm][metric]);
      summary.arms[arm].scores[metric] = { mean: Number(average(values).toFixed(3)), median: median(values) };
    }
    for (const flag of flags) {
      const count = items.filter((item) => item[arm][flag]).length;
      summary.arms[arm].flags[flag] = { count, rate: Number((count / items.length).toFixed(3)) };
    }
  }
  for (const item of items) summary.wins[item.winner] += 1;
  return summary;
}

const overall = summarize(results);
const byMode = Object.fromEntries(modes.map((mode) => [mode, summarize(results.filter((item) => item.mode === mode))]));
const output = { protocolVersion: 1, cases: results, overall, byMode };
fs.writeFileSync(path.join(root, 'deblinded-results.json'), `${JSON.stringify(output, null, 2)}\n`);

function row(summary, metric) {
  return `| ${metric} | ${summary.arms.A.scores[metric].mean.toFixed(2)} | ${summary.arms.B.scores[metric].mean.toFixed(2)} | ${(summary.arms.B.scores[metric].mean - summary.arms.A.scores[metric].mean).toFixed(2)} |`;
}

const lines = [
  '# Prompt Optimizer A/B Evaluation Report',
  '',
  '## Scope',
  '',
  'This blinded, 30-case evaluation compares original prompts (A) against prompts optimized by the repository mode prompts (B). The dataset contains 10 cases each for `faithful`, `developer`, and `specification`.',
  '',
  '## Overall Results',
  '',
  `- Cases: ${overall.cases}`,
  `- Task success rate: A ${percent(overall.arms.A.flags.success.count, overall.cases)}; B ${percent(overall.arms.B.flags.success.count, overall.cases)}.`,
  `- Winner count: A ${overall.wins.A}; B ${overall.wins.B}; tie ${overall.wins.tie}.`,
  `- Unsupported-assumption rate: A ${percent(overall.arms.A.flags.unsupportedAssumption.count, overall.cases)}; B ${percent(overall.arms.B.flags.unsupportedAssumption.count, overall.cases)}.`,
  `- Scope-expansion rate: A ${percent(overall.arms.A.flags.scopeExpansion.count, overall.cases)}; B ${percent(overall.arms.B.flags.scopeExpansion.count, overall.cases)}.`,
  `- Constraint-violation rate: A ${percent(overall.arms.A.flags.constraintViolation.count, overall.cases)}; B ${percent(overall.arms.B.flags.constraintViolation.count, overall.cases)}.`,
  '',
  '| Metric (0-5 mean) | A original | B optimized | B - A |',
  '|---|---:|---:|---:|',
  ...metrics.map((metric) => row(overall, metric)),
  '',
  '## Results by Mode',
  '',
  '| Mode | A wins | B wins | Ties | A success | B success | A fidelity | B fidelity |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...modes.map((mode) => {
    const summary = byMode[mode];
    return `| ${mode} | ${summary.wins.A} | ${summary.wins.B} | ${summary.wins.tie} | ${percent(summary.arms.A.flags.success.count, summary.cases)} | ${percent(summary.arms.B.flags.success.count, summary.cases)} | ${summary.arms.A.scores.fidelity.mean.toFixed(2)} | ${summary.arms.B.scores.fidelity.mean.toFixed(2)} |`;
  }),
  '',
  '## Interpretation',
  '',
  'B is favored when it has more blinded wins and equal or better fidelity and constraint adherence without increasing unsupported assumptions or scope expansion. Results by mode should be read separately because specification mode intentionally permits explicit defaults.',
  '',
  '## Reproducibility and Limitations',
  '',
  '- The test set was generated by an independent agent; separate matched child-agent calls executed A and B; a third independent agent scored blinded outputs.',
  '- A/B runners used the current session default route and matching execution instructions. The harness does not expose fixed temperature or top-p controls for child-agent calls.',
  '- B used the exact repository mode prompt text, with conversation context, workspace context, continuous optimization, and fallback routing disabled. This is a prompt-equivalent evaluation and does not invoke the browser-bound RPC.',
  '- Thirty cases are directional evidence, not a statistical proof across models, languages, or production repositories.',
  '',
  '## Artifacts',
  '',
  '- `protocol.md`: experimental controls and scoring rules.',
  '- `dataset.json`: frozen independent test set.',
  '- `optimized-prompts.json`: B inputs generated from the repository prompts.',
  '- `runner-a-results.json` and `runner-b-results.json`: matched runner outputs.',
  '- `blind-evaluation.json`: blinded independent scores.',
  '- `deblinded-results.json`: decoded per-case results and aggregates.',
];

fs.writeFileSync(path.join(root, 'report.md'), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ cases: results.length, overall, byMode }));
