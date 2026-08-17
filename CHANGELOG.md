# 变更记录 / Changelog

所有重要变更记录于此。All notable changes to this project are documented here.

## 0.1.0 - 2026-03-01

### 新增 / Added

- 预览优先的提示词优化，支持应用、取消和撤销。
  Preview-first prompt optimization with apply, cancel, and undo.
- 保真、开发化表达和规格扩展三种优化模式。
  Faithful, developer, and specification optimization modes.
- 可配置的主模型和回退模型路由。
  Configurable primary and fallback model routes.
- 会话内已应用优化结果的短期记忆。
  Session-local accepted-result memory.
- 可选且受字符预算限制的当前会话上下文。
  Opt-in, budgeted current-conversation context.
- 可选、关联性筛选且受当前会话工作区根目录约束的 Markdown 文档上下文。
  Opt-in, relevance-gated workspace Markdown context constrained to the current session workspace root.
- 在优化预览中展示上下文来源证据。
  Context-source evidence in optimization previews.
- 针对包产物、配置、上下文提取、预算和降级逻辑的 Host 校验与自动化测试。
  Host validation and automated tests for package bundles, configuration, context extraction, budgets, and graceful degradation.
