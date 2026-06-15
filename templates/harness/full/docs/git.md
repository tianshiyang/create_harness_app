# Git 规范（团队约定）

本文件描述团队提交流程；AI 操作约束见 `.claude/rules/git.md`，不在此重复。

## 分支

- `main`：生产稳定分支。
- `develop`：日常集成分支。
- `feature/<name>`：功能分支。
- `fix/<name>`：缺陷修复分支。
- `chore/<name>`：工程化调整分支。

## Conventional Commits

提交信息使用 Conventional Commits，常用类型：

- `feat:` 新功能
- `fix:` 缺陷修复
- `docs:` 文档
- `style:` 样式或格式
- `refactor:` 重构
- `chore:` 工程事务

`.husky/pre-commit` 运行 `pnpm lint-staged`，提交信息由 `commitlint` 校验。完整质量检查走 `pnpm check`（详见 `docs/harness-quick-reference.md`）。
