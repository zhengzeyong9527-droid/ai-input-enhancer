'use strict';

const { DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT_MS, FAITHFUL_SYSTEM_PROMPT, cleanResult, createMessage, modelSelection, requestKey, resolveRoutes, validateCancelArgs, validateEnhanceArgs } = require('./pure.js');
const { conversationContext, workspaceDocumentContext } = require('./context-provider.js');

const RPC_PATH = '/zzy-dsh-prompt-optimizer/rpc';
const MAX_REQUEST_BYTES = 96 * 1024;

function systemPromptFor(config) {
  if (config.mode === 'developer') return FAITHFUL_SYSTEM_PROMPT + '\n\nFor software-development requests, organize only user-provided facts into implementation-ready inputs, outputs, constraints, boundaries, and verification. Do not invent a stack or architecture.';
  if (config.mode === 'specification') return FAITHFUL_SYSTEM_PROMPT + '\n\nThe user explicitly selected specification expansion. Added assumptions are allowed only when necessary and must appear under a final heading named "## Default assumptions".';
  return FAITHFUL_SYSTEM_PROMPT;
}

async function messagesFor(ctx, args, config) {
  const messages = [];
  for (const round of config.memoryRounds || []) messages.push(createMessage(args.sessionId, args.seq, 'Previously accepted optimization:\n' + round.output));
  const context = config.conversationContext ? await conversationContext(ctx.get('sessionQuery'), args.sessionId, config.contextBudgetChars) : { text: '', evidence: [] };
  if (context.text) messages.push(createMessage(args.sessionId, args.seq, 'Relevant current-session context:\n' + context.text));
  let document = { text: '', evidence: [] };
  if (config.workspaceDocuments) {
    const sessions = ctx.get('sessions');
    const policy = ctx.get('sandboxPolicy');
    const fs = ctx.get('fs');
    const session = sessions && typeof sessions.get === 'function' ? sessions.get(args.sessionId) : undefined;
    const resolved = policy && typeof policy.resolve === 'function' ? policy.resolve(session ? { session } : {}) : undefined;
    document = await workspaceDocumentContext(fs, resolved && resolved.workspaceRoot, args.text, config.documentBudgetChars);
  }
  if (document.text) messages.push(createMessage(args.sessionId, args.seq, 'Relevant workspace documentation:\n' + document.text));
  messages.push(createMessage(args.sessionId, args.seq, args.text));
  return { messages, evidence: [...context.evidence, ...document.evidence] };
}

function writeJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_REQUEST_BYTES) chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > MAX_REQUEST_BYTES) return resolve({ error: 'REQUEST_TOO_LARGE' });
      try { resolve({ value: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }); } catch { resolve({ error: 'INVALID_JSON' }); }
    });
    request.on('error', () => resolve({ error: 'REQUEST_READ_FAILED' }));
  });
}

function failure(code, message) {
  return { ok: false, code, message };
}

function reasonFailure(reason, record) {
  if (record.timedOut) return failure('TIMEOUT', 'The optimization request timed out.');
  if (reason && reason.kind === 'aborted') return failure('CANCELLED', 'Optimization was cancelled.');
  if (reason && reason.kind === 'max-tokens') return failure('OUTPUT_TRUNCATED', 'The optimization result reached the configured token limit.');
  if (reason && reason.kind === 'tool-calls') return failure('UNEXPECTED_TOOL_CALL', 'The model returned a tool call instead of optimized text.');
  return failure('LLM_FAILED', 'The optimization model did not finish successfully.');
}

async function runRoute(ctx, llm, route, args, config, record) {
  record.stage = 'model';
  record.model = route.model;
  let text = '';
  try {
    const context = await messagesFor(ctx, args, config);
    record.contextEvidence = context.evidence;
    const stream = llm.stream({
      provider: route.provider,
      model: route.model,
      ...(route.reasoningEffort ? { reasoningEffort: route.reasoningEffort } : {}),
      system: systemPromptFor(config),
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      signal: record.controller.signal,
      messages: context.messages
    });
    for await (const chunk of stream) {
      if (record.controller.signal.aborted) return record.timedOut ? failure('TIMEOUT', 'The optimization request timed out.') : failure('CANCELLED', 'Optimization was cancelled.');
      if (chunk.type === 'text-delta') text += chunk.text;
      if (chunk.type === 'finish' && chunk.reason.kind !== 'stop') return reasonFailure(chunk.reason, record);
    }
  } catch {
    return record.controller.signal.aborted ? (record.timedOut ? failure('TIMEOUT', 'The optimization request timed out.') : failure('CANCELLED', 'Optimization was cancelled.')) : failure('LLM_FAILED', 'The model route could not complete the request.');
  }
  const result = cleanResult(text);
  return result ? { ok: true, text: result, model: route.model, context: record.contextEvidence || [] } : failure('EMPTY_RESULT', 'The model returned no usable text.');
}

function createHandlers(ctx, pending) {
  function currentSelection() {
    const service = ctx.get('agentDefaultModel');
    return service && typeof service.currentSelection === 'function' ? modelSelection(service.currentSelection()) : null;
  }

  async function enhance(args) {
    const validated = validateEnhanceArgs(args);
    if (!validated.ok) return validated;
    const llm = ctx.get('llm');
    if (!llm || typeof llm.stream !== 'function') return failure('NO_LLM', 'No DSH model service is available.');
    const routes = resolveRoutes(validated.value, currentSelection());
    if (routes.length === 0) return failure('NO_MODEL_SELECTION', 'Select a DSH default model or configure a complete model override.');

    const key = requestKey(args.sessionId, args.seq);
    const previous = pending.get(key);
    if (previous) previous.controller.abort();
    const record = { controller: new AbortController(), startedAt: Date.now(), stage: 'prepare', timedOut: false, model: '' };
    pending.set(key, record);
    const timeout = ctx.timeout(() => { record.timedOut = true; record.controller.abort(); }, validated.value.timeoutMs || DEFAULT_TIMEOUT_MS);
    let last = failure('LLM_FAILED', 'No configured model could complete the request.');
    try {
      for (let index = 0; index < routes.length; index += 1) {
        const result = await runRoute(ctx, llm, routes[index], args, validated.value, record);
        if (result.ok) return { ...result, fallbackUsed: index > 0 };
        last = result;
        if (result.code === 'CANCELLED' || result.code === 'TIMEOUT' || result.code === 'OUTPUT_TRUNCATED') return result;
      }
      return last;
    } finally {
      timeout();
      pending.delete(key);
    }
  }

  function cancel(args) {
    const validated = validateCancelArgs(args);
    if (!validated.ok) return validated;
    const record = pending.get(requestKey(args.sessionId, args.seq));
    if (record) record.controller.abort();
    return { ok: true, cancelled: !!record };
  }

  function progress(args) {
    const validated = validateCancelArgs(args);
    if (!validated.ok) return validated;
    const record = pending.get(requestKey(args.sessionId, args.seq));
    return record ? { ok: true, stage: record.stage, model: record.model, elapsedMs: Date.now() - record.startedAt } : { ok: false, code: 'NOT_FOUND' };
  }

  function modelsList() {
    const llm = ctx.get('llm');
    const providers = llm && typeof llm.listProviders === 'function' ? llm.listProviders().map((entry) => ({ id: entry.id, name: entry.name })) : [];
    return { ok: true, defaultModel: currentSelection(), providers };
  }

  async function modelsTest(args) {
    const validated = validateEnhanceArgs({ sessionId: 'zzy-model-test', seq: 0, text: 'Reply with OK only.', mode: 'faithful', config: args && args.config });
    if (!validated.ok) return validated;
    const llm = ctx.get('llm');
    if (!llm || typeof llm.stream !== 'function') return failure('NO_LLM', 'No DSH model service is available.');
    const routes = resolveRoutes(validated.value, currentSelection());
    if (routes.length === 0) return failure('NO_MODEL_SELECTION', 'Select a model before testing.');
    const record = { controller: new AbortController(), startedAt: Date.now(), stage: 'test', timedOut: false, model: '' };
    const timeout = ctx.timeout(() => { record.timedOut = true; record.controller.abort(); }, Math.min(validated.value.timeoutMs, 20000));
    try {
      const result = await runRoute(ctx, llm, routes[0], { sessionId: 'zzy-model-test', seq: 0, text: 'Reply with OK only.' }, { ...validated.value, maxTokens: Math.min(validated.value.maxTokens, 32) }, record);
      return result.ok ? { ok: true, model: result.model } : result;
    } finally { timeout(); }
  }

  return { enhance, cancel, progress, 'models/list': modelsList, 'models/test': modelsTest };
}

module.exports = {
  name: 'zzy-dsh-prompt-optimizer',
  inject: ['webServer', 'timer'],
  apply(ctx) {
    const pending = new Map();
    const handlers = createHandlers(ctx, pending);
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact', path: RPC_PATH,
      handler: async (request, response) => {
        if (request.method !== 'POST') return writeJson(response, 405, failure('METHOD_NOT_ALLOWED', 'Use POST for plugin RPC requests.'));
        const body = await readJson(request);
        if (body.error) return writeJson(response, 400, failure(body.error, 'The request body is invalid.'));
        const method = body.value && body.value.method;
        const args = body.value && body.value.args;
        if (typeof method !== 'string' || !handlers[method]) return writeJson(response, 404, failure('UNKNOWN_METHOD', 'The requested plugin operation is unavailable.'));
        try { writeJson(response, 200, await handlers[method](args)); } catch { writeJson(response, 500, failure('HANDLER_FAILED', 'The plugin could not process the request.')); }
      }
    }));
    ctx.effect(() => () => { for (const record of pending.values()) record.controller.abort(); pending.clear(); });
  }
};
