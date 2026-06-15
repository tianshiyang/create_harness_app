# Claude Code 项目指南

本项目由 AI agent 辅助开发。Claude Code 是主要执行工具。

## 项目事实
- 技术栈：Vue 3、TypeScript、Vite、[在此填写 UI 库]、Pinia、Vue Router。
- 包管理器：pnpm。
- （在此补充：API 路径规范、路由约定、业务模型等项目专属信息）

## 工作流
- 先探索，再编辑；先读相关代码、规则和文档。
- 优先沿用项目已有模式，不轻易创建新抽象。
- 修改必须小而确定，可 review、可验证。

## Vue 实现
详细规则见 `.claude/rules/vue.md`。

## 质量门禁与安全
- 一般代码变更运行 `pnpm check`。
- Harness 变更先运行 `pnpm harness:sync`，再运行 `pnpm harness:check`。
- 不读取、不写入密钥文件（`.env*`、私钥、证书）。
- 不自动提交；未经允许不执行破坏性操作。

## Skills 与 Agent
skill 决策见 `docs/harness-quick-reference.md`。

## Git
Commit message 使用 Conventional Commits（见 `docs/git.md`）。
