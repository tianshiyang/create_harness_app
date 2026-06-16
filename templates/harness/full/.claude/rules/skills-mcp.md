# Skills 同步规则

- 不确定是否已有合适 skill 时，先查 `docs/harness-quick-reference.md`。
- 项目 skills 放在 `.claude/skills/`。
- `skills-lock.json` 必须保存每个 skill 的真实 computed hash。

新增或修改 skill 时，必须同步以下 2 个位置：

1. `.claude/skills/{skill}/`
2. `skills-lock.json`（hash lock）

修改任何 skill 后必须先运行 `pnpm harness:sync`，再运行 `pnpm harness:check`。
