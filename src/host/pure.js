'use strict';

const MAX_TEXT_LENGTH = 16000;
const MAX_SESSION_ID_LENGTH = 160;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_TOKENS = 1800;
const DEFAULT_CONFIG = {
  useDefaultModel: true,
  primary: { provider: '', model: '' },
  fallback: { provider: '', model: '' },
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxTokens: DEFAULT_MAX_TOKENS,
  mode: 'faithful',
  memory: false,
  conversationContext: false,
  contextBudgetChars: 2000,
  workspaceDocuments: false,
  documentBudgetChars: 2000
};
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 120000;
const MIN_MAX_TOKENS = 100;
const MAX_MAX_TOKENS = 4000;
const MAX_RESULT_LENGTH = 24000;

const FAITHFUL_SYSTEM_PROMPT = [
  'You are a prompt editor. Improve the clarity and executability of the user request while preserving its meaning exactly.',
  '',
  'Rules:',
  '- Preserve every explicit goal, object, scope, number, technical term, constraint, prohibition, and deliverable.',
  '- Do not invent requirements, a technology stack, timelines, acceptance criteria, or business facts.',
  '- When information is missing, express it as a concise clarification need instead of assuming an answer.',
  '- Keep the user language and proper nouns. Use structure only when it improves readability.',
  '- Return only the optimized prompt. Do not add a preface, explanation, markdown fence, or analysis.'
].join('\n');

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeRoute(value) {
  if (!value || typeof value !== 'object') return null;
  if (!isNonEmptyString(value.provider, 120) || !isNonEmptyString(value.model, 240)) return null;
  const route = { provider: value.provider.trim(), model: value.model.trim() };
  if (isNonEmptyString(value.reasoningEffort, 80)) route.reasoningEffort = value.reasoningEffort.trim();
  return route;
}

function isEmptyRoute(value) {
  if (!value || typeof value !== 'object') return false;
  const blank = (field) => field === undefined || (typeof field === 'string' && field.trim() === '');
  return blank(value.provider) && blank(value.model);
}

function normalizeConfig(value) {
  const config = cloneDefaultConfig();
  if (value === undefined || value === null) return { ok: true, value: config };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, code: 'BAD_CONFIG', message: 'configuration must be an object' };

  if (value.useDefaultModel !== undefined) {
    if (typeof value.useDefaultModel !== 'boolean') return { ok: false, code: 'BAD_CONFIG', message: 'useDefaultModel must be a boolean' };
    config.useDefaultModel = value.useDefaultModel;
  }

  const primary = normalizeRoute(value.primary);
  if (!config.useDefaultModel && !primary) return { ok: false, code: 'BAD_CONFIG', message: 'a provider and model are required when default model inheritance is disabled' };
  if (primary) config.primary = primary;

  if (value.fallback !== undefined && value.fallback !== null && !isEmptyRoute(value.fallback)) {
    const fallback = normalizeRoute(value.fallback);
    if (!fallback) return { ok: false, code: 'BAD_CONFIG', message: 'fallback must contain a provider and model or be empty' };
    config.fallback = fallback;
  }

  if (value.conversationContext !== undefined) {
    if (typeof value.conversationContext !== 'boolean') return { ok: false, code: 'BAD_CONFIG', message: 'conversationContext must be a boolean' };
    config.conversationContext = value.conversationContext;
  }
  if (value.contextBudgetChars !== undefined) {
    if (!Number.isSafeInteger(value.contextBudgetChars) || value.contextBudgetChars < 500 || value.contextBudgetChars > 4000) return { ok: false, code: 'BAD_CONFIG', message: 'contextBudgetChars is outside the supported range' };
    config.contextBudgetChars = value.contextBudgetChars;
  }

  if (value.workspaceDocuments !== undefined) {
    if (typeof value.workspaceDocuments !== 'boolean') return { ok: false, code: 'BAD_CONFIG', message: 'workspaceDocuments must be a boolean' };
    config.workspaceDocuments = value.workspaceDocuments;
  }
  if (value.documentBudgetChars !== undefined) {
    if (!Number.isSafeInteger(value.documentBudgetChars) || value.documentBudgetChars < 500 || value.documentBudgetChars > 4000) return { ok: false, code: 'BAD_CONFIG', message: 'documentBudgetChars is outside the supported range' };
    config.documentBudgetChars = value.documentBudgetChars;
  }

  for (const [field, min, max] of [['timeoutMs', MIN_TIMEOUT_MS, MAX_TIMEOUT_MS], ['maxTokens', MIN_MAX_TOKENS, MAX_MAX_TOKENS]]) {
    if (value[field] !== undefined) {
      if (!Number.isSafeInteger(value[field]) || value[field] < min || value[field] > max) return { ok: false, code: 'BAD_CONFIG', message: field + ' is outside the supported range' };
      config[field] = value[field];
    }
  }

  return { ok: true, value: config };
}

function validateEnhanceArgs(args) {
  if (!args || typeof args !== 'object') return { ok: false, code: 'BAD_ARGS', message: 'request body is required' };
  if (!isNonEmptyString(args.sessionId, MAX_SESSION_ID_LENGTH)) return { ok: false, code: 'BAD_SESSION', message: 'sessionId is required' };
  if (!Number.isSafeInteger(args.seq) || args.seq < 0) return { ok: false, code: 'BAD_SEQUENCE', message: 'seq must be a non-negative integer' };
  if (!isNonEmptyString(args.text, MAX_TEXT_LENGTH)) return { ok: false, code: 'BAD_TEXT', message: 'text must be non-empty and within the size limit' };
  const config = normalizeConfig(args.config);
  if (!config.ok) return config;
  const mode = args.mode === undefined ? config.value.mode : args.mode;
  if (!['faithful', 'developer', 'specification'].includes(mode)) return { ok: false, code: 'UNSUPPORTED_MODE', message: 'unsupported optimization mode' };
  config.value.mode = mode;
  if (!Array.isArray(args.memory) || args.memory.length === 0) { config.value.memoryRounds = []; return config; }
  if (args.memory.length > 3) return { ok: false, code: 'BAD_MEMORY', message: 'memory is limited to three accepted rounds' };
  const rounds = args.memory.every((round) => round && isNonEmptyString(round.input, 16000) && isNonEmptyString(round.output, 24000));
  if (!rounds) return { ok: false, code: 'BAD_MEMORY', message: 'memory contains invalid content' };
  config.value.memoryRounds = args.memory.map((round) => ({ input: round.input, output: round.output }));
  return config;
}

function validateCancelArgs(args) {
  if (!args || typeof args !== 'object') return { ok: false, code: 'BAD_ARGS', message: 'request body is required' };
  if (!isNonEmptyString(args.sessionId, MAX_SESSION_ID_LENGTH)) return { ok: false, code: 'BAD_SESSION', message: 'sessionId is required' };
  if (!Number.isSafeInteger(args.seq) || args.seq < 0) return { ok: false, code: 'BAD_SEQUENCE', message: 'seq must be a non-negative integer' };
  return { ok: true };
}

function requestKey(sessionId, seq) {
  return sessionId + ':' + String(seq);
}

function createMessage(sessionId, seq, text) {
  return {
    id: 'zzy-prompt-optimizer-' + sessionId + '-' + String(seq),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' }
  };
}

function cleanResult(value) {
  if (typeof value !== 'string') return '';
  const result = value.trim();
  return result.length <= MAX_RESULT_LENGTH ? result : '';
}

function modelSelection(selection) {
  return normalizeRoute(selection);
}

function resolveRoutes(config, defaultSelection) {
  const routes = [];
  const defaultRoute = modelSelection(defaultSelection);
  const primary = config.useDefaultModel ? defaultRoute : config.primary;
  if (!primary) return [];
  routes.push(primary);
  if (config.fallback && config.fallback.provider && config.fallback.model) {
    const duplicate = config.fallback.provider === primary.provider && config.fallback.model === primary.model;
    if (!duplicate) routes.push(config.fallback);
  }
  return routes;
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT_MS,
  FAITHFUL_SYSTEM_PROMPT,
  cleanResult,
  createMessage,
  modelSelection,
  normalizeConfig,
  requestKey,
  resolveRoutes,
  validateCancelArgs,
  validateEnhanceArgs
};
