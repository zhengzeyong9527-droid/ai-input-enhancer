# zzy-dsh-prompt-optimizer

A preview-first prompt optimizer for DeepSeek Harness (DSH).

The plugin adds a prompt-optimization action to the DSH composer. It sends a draft to the DSH model route you choose, shows the result for review, and only changes the composer after you apply it.

## Features

- Three explicit optimization modes: faithful, developer, and specification expansion.
- Preview, apply, keep original, cancel, and undo workflows.
- Optional session-local memory of the three most recently applied optimizations.
- Optional current-conversation context with a configurable character budget.
- Optional, budgeted workspace Markdown context restricted to the current session workspace root.
- Primary and fallback model routes, timeout, and output-token controls.
- No API keys are stored by the plugin.

## Modes

- **Faithful**: improves clarity without inventing requirements, facts, architecture, or scope.
- **Developer**: restructures user-provided development facts into implementation-ready language without selecting a stack or design.
- **Specification**: may add needed defaults, but requires them under `## Default assumptions` for review.

## Privacy and Context

The current draft is sent to the DSH model route selected by the user. Context sources are disabled by default.

When enabled, conversation context reads only current `user/message` and `assistant/message` text from the current session surface. Workspace context reads at most three relevant Markdown files directly inside the current session workspace root. Both sources have independent character budgets and degrade to no context when unavailable. The plugin does not persist full drafts, session history, or document content.

## Installation

Install a packed release or an npm package into the Web profile:

```powershell
dsh plugin --profile web add zzy-dsh-prompt-optimizer
```

For local development, rebuild first and use a `file:` dependency:

```powershell
npm run check
dsh plugin --profile web remove zzy-dsh-prompt-optimizer
dsh plugin --profile web add "file:D:\\Project\\zzy-dsh-prompt-enhance\\zzy-dsh-prompt-optimizer"
```

Restart the existing DSH Web process and refresh its existing URL. Do not start a second Web server for this plugin.

## Development

```sh
npm run check
npm pack --dry-run
```

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for GitHub, npm, and DSH Marketplace release preparation.

## License

MIT
