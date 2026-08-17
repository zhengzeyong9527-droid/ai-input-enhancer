'use strict';

function textFromEvent(event) {
  if (!event || (event.type !== 'user/message' && event.type !== 'assistant/message')) return '';
  const content = event.data && event.data.content;
  if (!Array.isArray(content)) return '';
  return content.filter((block) => block && block.type === 'text' && typeof block.text === 'string').map((block) => block.text.trim()).filter(Boolean).join('\n');
}

function truncateTail(value, budget) {
  if (value.length <= budget) return value;
  return value.slice(value.length - budget);
}

async function conversationContext(sessionQuery, sessionId, budget) {
  if (!sessionQuery || typeof sessionQuery.readSurface !== 'function') return { text: '', evidence: [] };
  try {
    const snapshot = await sessionQuery.readSurface(sessionId);
    const parts = (snapshot.events || []).map(textFromEvent).filter(Boolean);
    const text = truncateTail(parts.join('\n\n'), budget);
    return text ? { text, evidence: [{ kind: 'conversation', chars: text.length }] } : { text: '', evidence: [] };
  } catch {
    return { text: '', evidence: [] };
  }
}

function isRelevantDocument(name, prompt) {
  if (/^readme\.md$/i.test(name)) return true;
  const terms = String(prompt || '').toLowerCase().match(/[a-z0-9_-]{3,}/g) || [];
  const lower = name.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

async function workspaceDocumentContext(fs, root, prompt, budget) {
  if (!fs || !root || typeof fs.listDir !== 'function' || typeof fs.readText !== 'function') return { text: '', evidence: [] };
  try {
    const entries = await fs.listDir(root);
    const candidates = entries.filter((entry) => entry && entry.type === 'file' && /\.md$/i.test(entry.name) && isRelevantDocument(entry.name, prompt)).slice(0, 3);
    let remaining = budget;
    const sections = [];
    const sources = [];
    for (const entry of candidates) {
      if (remaining <= 0 || !fs.contains(root, entry.target)) continue;
      try {
        const value = await fs.readText(entry.target);
        const text = String(value || '').slice(0, remaining);
        if (!text) continue;
        sections.push('Document: ' + entry.name + '\n' + text);
        sources.push(entry.name);
        remaining -= text.length;
      } catch { /* individual files degrade without blocking */ }
    }
    const text = sections.join('\n\n');
    return text ? { text, evidence: [{ kind: 'workspace-documents', chars: text.length, sources }] } : { text: '', evidence: [] };
  } catch { return { text: '', evidence: [] }; }
}

module.exports = { conversationContext, isRelevantDocument, textFromEvent, truncateTail, workspaceDocumentContext };
