# Changelog

[中文](CHANGELOG.md) | [English](CHANGELOG.en.md)

All notable changes to this project are documented here.

## 0.2.0 - 2026-08-18

### Added and Changed

- Split mode prompts into standalone configuration modules and prohibited injected confirmations, prerequisites, conditions, and assumptions in faithful mode.
- Added optional, character-budgeted current-conversation and workspace Markdown context.
- Write optimized text directly into the composer, with cancellation while optimizing and a green in-button undo state.
- Collapse advanced settings by default and add an icon to the prompt optimization action.

## 0.1.0 - 2026-03-01

### Added

- Preview-first prompt optimization with apply, cancel, and undo.
- Faithful, developer, and specification optimization modes.
- Configurable primary and fallback model routes.
- Session-local accepted-result memory.
- Opt-in, budgeted current-conversation context.
- Opt-in, relevance-gated workspace Markdown context constrained to the current session workspace root.
- Context-source evidence in optimization previews.
- Host validation and automated tests for package bundles, configuration, context extraction, budgets, and graceful degradation.
