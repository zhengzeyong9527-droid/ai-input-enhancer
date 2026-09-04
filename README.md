# AI Input Enhancer

[中文](README.md) | [English](README.en.md)

[![Release](https://img.shields.io/github/v/release/zhengzeyong9527-droid/ai-input-enhancer)](https://github.com/zhengzeyong9527-droid/ai-input-enhancer/releases/latest)
[![License](https://img.shields.io/github/license/zhengzeyong9527-droid/ai-input-enhancer)](LICENSE)
[![DSH Plugin List](https://img.shields.io/badge/DSH%20Plugin%20List-Listed-16a34a)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin#ui-enhancements)

DeepSeek Harness（DSH）的提示词优化插件。插件在对话输入框增加“提示词优化”操作：优化完成后直接将结果填入输入框，并允许你随时撤回到原始提示词。

## 功能

- 三种明确的优化模式：保真优化、开发化表达、规格扩展。
- 优化中可取消，并显示加载状态。
- 优化结果直接填入对话框，可一键撤回原始提示词。
- 可选的会话内短期记忆：最多保留最近三轮已应用的优化结果。
- 可选的当前会话上下文，并可设置字符预算。
- 可选的工作区 Markdown 文档上下文，仅限当前会话的工作区根目录。
- 可配置主模型、回退模型、超时和最大输出 token。
- 不存储 API Key。

## 界面

**输入框入口**

<img src="assets/screenshots/composer-action.png" alt="提示词优化操作入口" width="520">

**高级设置**

高级设置按优化策略、会话上下文、工作区文档上下文和模型限制分段展示，避免长说明和输入项交错。

<img src="assets/screenshots/advanced-settings.png" alt="高级设置" width="520">

**模型与执行限制**

<img src="assets/screenshots/model-limits.png" alt="模型与执行限制" width="520">

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

重启现有 DSH Web 进程并刷新当前 URL。

## 评估

可复现的 30 条盲化 A/B 测试协议、脱敏输入和独立评估结果见 [tests/evaluation/report.md](tests/evaluation/report.md) 与 [tests/evaluation/conclusion.md](tests/evaluation/conclusion.md)。

## 许可证

MIT
