# Claude Code 项目指南

本项目使用最小 harness 配置：安全守护（guard-tool）+ 质量门禁（quality-gate）。

## 项目事实
- 技术栈：Vue 3、TypeScript、Vite
- 包管理器：pnpm

## 质量门禁
- 代码变更运行 `pnpm check`（type-check + lint + format:check）。
- 不读取、不写入密钥文件。
- 不自动提交。
