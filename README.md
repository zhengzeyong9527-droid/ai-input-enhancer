# zzy-dsh-prompt-optimizer

[中文](README.md) | [English](README.en.md)

DeepSeek Harness（DSH）的预览优先提示词优化插件。插件在对话输入框增加“提示词优化”操作：将草稿发送到你选择的 DSH 模型路由，先展示优化预览，只有在你确认应用后才会修改输入框内容。

## 功能

- 三种明确的优化模式：保真优化、开发化表达、规格扩展。
- 预览、应用、保留原文、取消与撤销工作流。
- 可选的会话内短期记忆：最多保留最近三轮已应用的优化结果。
- 可选的当前会话上下文，并可设置字符预算。
- 可选的工作区 Markdown 文档上下文，仅限当前会话的工作区根目录。
- 主模型、回退模型、超时和最大输出 token 设置。
- 不存储 API Key。

## 优化模式

- **保真优化**：提升表达清晰度，但不虚构需求、事实、架构或范围。
- **开发化表达**：将用户已经提供的开发信息整理成更适合实现的表述，不替你选择技术栈或设计方案。
- **规格扩展**：允许补充必要默认项，但必须在 `## Default assumptions` 下明确标示，供你审阅。

## 隐私与上下文

当前草稿会发送给你选择的 DSH 模型路由。所有额外上下文默认关闭。

启用会话上下文后，插件只读取当前会话 Surface 中的 `user/message` 和 `assistant/message` 文本。启用工作区上下文后，插件最多读取当前会话工作区根目录内三个相关 Markdown 文件。两个来源都各自受字符预算限制；服务不可用或读取失败时会自动降级为无该来源上下文。插件不会持久化完整草稿、会话历史或文档内容。

## 安装

将已发布的 npm 包安装到 Web profile：

```powershell
dsh plugin --profile web add zzy-dsh-prompt-optimizer
```

本地开发时，先构建，再使用 `file:` 依赖：

```powershell
npm run check
dsh plugin --profile web remove zzy-dsh-prompt-optimizer
dsh plugin --profile web add "file:D:\\Project\\zzy-dsh-prompt-enhance\\zzy-dsh-prompt-optimizer"
```

重启现有 DSH Web 进程并刷新其现有 URL；不要为此插件启动第二个 Web 服务器。

## 开发与发布

```sh
npm run check
npm pack --dry-run
```

发布说明见 [PUBLISHING.md](PUBLISHING.md)。

## 许可证

MIT
