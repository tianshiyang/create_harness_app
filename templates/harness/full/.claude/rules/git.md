# Git 规则（AI 操作约束）

约束 AI agent 的 git 行为；分支命名、Conventional Commits 等团队约定见 `docs/git.md`。

- 保留用户已有的无关改动，未经允许不动其它文件。
- 未经明确允许，不执行破坏性 Git 命令（`git reset --hard`、force push、删除分支、删除 stash 等）。
- Stop 收尾的质量门禁只做质量检查和自动格式化，不自动暂存变更。除此之外也不自动暂存，不自动改写 repo-tracked 文件。
- Pre-commit 只运行 `pnpm lint-staged`；完整质量检查由交付前 `pnpm check` 和 Stop 阶段门禁执行。
