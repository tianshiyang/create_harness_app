# 格式化与自动修复规则

- Prettier 负责排版统一；ESLint 和 oxlint 负责代码质量与自动修复。
- 命令清单见 `docs/harness-quick-reference.md`"格式化命令"段，不在此复述。
- 提交前的 `lint-staged` 只处理已暂存文件；不要把大范围格式整理和业务改动混在同一次提交里。
- 如无明确需求，不要对无关文件执行全仓格式化。
- `quality-gate.cjs stop` 允许在 Stop 收尾自动格式化；`lint-staged` 作为 pre-commit safety net 允许自动修复。所有 hook 和 AI 自身不得自动暂存或改写 repo-tracked 文件，详见 `docs/ai-harness.md` 维护规则。
