# zzy-dsh-prompt-optimizer

[中文](README.md) | [English](README.en.md)

A preview-first prompt optimizer for DeepSeek Harness (DSH). It adds a prompt-optimization action to the composer, sends the draft through the selected DSH model route, and replaces the draft only after the user reviews and applies the preview.

## Features

- Explicit faithful, developer, and specification modes.
- Preview, apply, keep original, cancel, and undo workflows.
- Optional session-local memory of the three most recently applied optimizations.
- Optional budgeted current-conversation context.
- Optional budgeted Markdown context from the current session workspace root.
- Primary and fallback model routes, timeout, and output-token controls.
- No API keys are stored by the plugin.

## Modes

- **Faithful** improves clarity without inventing requirements, facts, architecture, or scope.
- **Developer** structures user-provided engineering facts without selecting a stack or design.
- **Specification** may add needed defaults, but labels them under `## Default assumptions` for review.

## Privacy and Context

The draft is sent to the DSH model route chosen by the user. Extra context is disabled by default.

Conversation context reads only current `user/message` and `assistant/message` text. Workspace context reads at most three relevant Markdown files directly inside the current session workspace root. Both sources are independently budgeted and gracefully degrade when unavailable. Full drafts, session history, and document contents are not persisted.

## Installation

```powershell
dsh plugin --profile web add zzy-dsh-prompt-optimizer
```

For local development:

```powershell
npm run check
dsh plugin --profile web remove zzy-dsh-prompt-optimizer
dsh plugin --profile web add "file:D:\\Project\\zzy-dsh-prompt-enhance\\zzy-dsh-prompt-optimizer"
```

Restart the existing DSH Web process and refresh its existing URL. Do not start a second Web server for this plugin.

## Development and Publishing

```sh
npm run check
npm pack --dry-run
```

See [PUBLISHING.en.md](PUBLISHING.en.md) for publication guidance.

## License

MIT
