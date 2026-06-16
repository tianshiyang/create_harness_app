# AI Harness 规范

本项目是公司第一个纯 AI 编写项目的工程底座。目标不是依赖某个最强模型的临场发挥，而是通过项目记忆、规则、hooks、subagents、skills 和自动校验，让不同模型在同一轨道上工作。

这里的 harness 指 AI Harness / Claude Code Harness，不是 Harness.io，也不是测试 harness。

## 目标

- Claude Code 作为唯一执行工具，统一从 `CLAUDE.md` 读取核心规则。
- 每次 AI 改动都经过质量门禁和 code review subagent。
- hooks 跨 macOS 和 Windows 可用，不依赖 `jq`、`bash` 或平台专属通知命令。
- 重要规范进入仓库，可版本化、可 review、可复用。

## 组成

- `CLAUDE.md`：Claude Code 主入口，定义项目事实和执行流程。
- `.claude/settings.json`：Claude Code 权限和 hooks 配置。
- `.claude/hooks/*.cjs`：跨平台 Node hooks。
- `.claude/agents/*.md`：项目级 review subagents。
- `.claude/rules/*.md`：可按任务加载的细分规则。
- `.claude/skills/`：Claude Code 项目 skills 源。
- `scripts/verify-skills.mjs`：校验 skills 文档和 lock 是否同步。
- `scripts/*.test.mjs`：校验 harness 脚本自身行为，防止门禁脚本静默漂移。
- `docs/harness-quick-reference.md`：给团队和 AI agent 使用的速查表。
- `docs/delivery-template.md`：AI 交付说明模板，要求每次交付暴露改动、影响范围、验证、人工复核项、人工决策和剩余风险。

## 事实来源

- Harness 配置以源文件为准，不维护单独的 generated 配置清单。
- 权限和 hooks 以 `.claude/settings.json` 为准。
- `.claude/settings.local.json` 只允许保存个人本地效率增强，不作为团队事实源。
- Hook 行为以 `.claude/hooks/*.cjs` 为准。
- Review agent 定义以 `.claude/agents/*.md` 为准；`.claude/settings.json` 中的 Stop agent 内联 prompt 是当前强制 review 入口。
- Rules 以 `.claude/rules/*.md` 为准。
- Skills 以 `.claude/skills/` 为源，`skills-lock.json` 保存校验 hash。
- 人工审核交付格式以 `docs/delivery-template.md` 为准。

## 执行流程

1. 主 agent 探索代码和规则。
2. 主 agent 实现变更。
3. `Stop` hook 先运行 `pnpm format` 自动修复格式，再运行 `pnpm type-check`、`pnpm lint`、`pnpm harness:check`。完整检查请手动运行 `pnpm check`。
4. `Stop` agent hook 启动 review subagent。
5. review subagent 返回 `HARNESS_REVIEW_RESULT: PASS` 或 `HARNESS_REVIEW_RESULT: FAIL`。
6. 通过后发送系统通知；失败时阻止停止并要求主 agent 修复。
7. 主 agent 按 `docs/delivery-template.md` 输出人工审核交接单，列出改动、影响范围、验证记录、人工复核项、人工决策和剩余风险。
8. 即使强制 review 通过，仍需人工复核后再提交。

## 质量门禁

- `pnpm type-check`：Vue + TypeScript 类型校验。
- `pnpm lint`：oxlint + ESLint。
- `pnpm format:check`：校验 Prettier 格式一致性。
- `pnpm check:fix`：显式执行格式化与 lint 自动修复。
- `pnpm harness:test`：运行 harness 脚本测试，覆盖 skill 校验和 hooks 基础行为。
- `pnpm harness:check`：skills、lock 校验和 hooks 脚本测试。
- `pnpm build`：生产构建校验，适用于构建配置、路由、样式或依赖变更。

## 维护规则

- 修改 `.claude/settings.json` 时，必须同步检查 `.claude/hooks/` 和本文件。
- 修改 `.claude/settings.local.json` 时，不得放宽敏感文件访问、破坏性 Git 或质量门禁；本地特权不写入团队默认配置。
- 新增或更新 skill：同步规则见 `.claude/rules/skills-mcp.md`，不在此重复。
- 修改 harness 配置后，先运行 `pnpm harness:sync` 再运行 `pnpm harness:check`。
- 修改人工审核流程或交付要求时，同步 `docs/review-checklist.md` 和 `docs/delivery-template.md`。
- 当前业务代码是占位实现，不允许把项目看板、审核流、mock 数据或临时页面形态沉淀为 harness 规则或工程规范。
- 反复使用的业务规则（全局权限矩阵、跨页面状态机）应做成 `.claude/skills/<name>/`，由 AI 按需加载。
- `quality-gate.cjs stop` 是唯一允许自动格式化的 hook，用于 Stop 收尾；其他 hooks 不得自动格式化、暂存或改写 repo-tracked 文件。`lint-staged` 作为 pre-commit safety net 是另一处显式例外。
