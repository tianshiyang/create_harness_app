# Harness 速查表

遇到某类任务时，该看哪个规则、用哪个 skill、让哪个 agent review、需要跑哪些命令。详细规范见 `docs/ai-harness.md`。

## Skill 使用决策表

| 场景                                      | 优先使用                  | 说明                                                           |
| ----------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| Vue、Vite、Pinia、Vue Router、`.vue` 组件 | `vue-best-practices`      | 先确认 Composition API、组件边界、响应式数据和类型规则。       |
| 不确定是否已有合适 skill                  | `find-skills`             | 先查可用 skill，再决定是否安装或创建项目内 skill。             |

Harness 配置、hooks、review agents、skills 同步和治理文档变更没有专用 skill；先读 `docs/ai-harness.md` 和 `.claude/agents/harness-reviewer.md`。

## Agent 使用决策表

| 场景                                                  | Agent              | 说明                                               |
| ----------------------------------------------------- | ------------------ | -------------------------------------------------- |
| 一般代码变更完成前                                    | `code-reviewer`    | 检查 Vue、TypeScript、权限、路由、样式和质量门禁。 |
| 修改 `.claude/**`、hooks、rules、skills、harness 文档 | `harness-reviewer` | 检查 harness 配置是否一致、可维护、可跨平台运行。  |
| Claude Code Stop 阶段                                 | Stop agent hook    | 自动执行强制 review，不需要手动触发。              |

`.claude/agents/*.md` 是项目 reviewer 定义；`.claude/settings.json` 中的 Stop agent 内联 prompt 是当前强制 review 入口。

## Hooks 速查

| Hook               | 作用                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `guard-tool.cjs`   | 阻断危险命令和敏感文件访问。                                                                                        |
| `quality-gate.cjs` | Stop 时先自动格式化，再运行 type-check / lint / harness:check；完整检查用 `pnpm check`。 |
| `notify.cjs`       | 处理 macOS/Windows 完成通知和失败通知。                                                                             |

详细行为见 `docs/ai-harness.md`。

## 格式化命令

详见 `.claude/rules/formatting.md`。最常用：

```sh
pnpm format        # 全量格式化
pnpm format:check  # 只检查
pnpm check:fix     # 格式化 + lint 修复
```

## 常用命令

```sh
pnpm format        # 全量格式化
pnpm format:check  # 只检查
pnpm check:fix     # 格式化 + lint 修复
pnpm check         # 完整质量门禁（type-check + lint + format:check + harness:check）
pnpm build         # 生产构建校验
pnpm harness:sync  # 同步 skill lock
pnpm harness:check # harness 脚本验证
pnpm harness:test  # harness 脚本测试
```

详细格式化规则见 `.claude/rules/formatting.md`。

## 本地浏览器验证

涉及新页面、UI 调整、路由权限、表单、弹窗、上传、布局或全局样式时，按 `docs/verification.md` 做本地浏览器验证。纯文档、纯脚本、无运行时 UI 影响的 harness 变更可以不做浏览器验证，但交付说明中要说明原因。

## 人工审核交接单

每次 AI 交付都必须按 `docs/delivery-template.md` 输出交接单，至少包含改动摘要、影响范围、AI 已验证、需要人工复核、人工决策记录、剩余风险。复杂业务场景（真实审批流、角色权限口径、状态机、真实接口数据）必须列入"需要人工复核"。强制 review 通过不代表可以直接提交，人工复核是最终门槛，详见 `docs/review-checklist.md`。

## Harness 变更 Checklist

| 步骤 | 检查项                                                                                                      | 参考文档                      |
| ---- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1    | 是否修改了 `.claude/settings.json`、hooks、agents、rules、skills？同步入口文档了吗？                        | `docs/ai-harness.md` 维护规则 |
| 2    | 如果新增或修改 skill，是否同步了 `.claude/skills/{skill}` 和 `skills-lock.json`？ | `.claude/rules/skills-mcp.md` |
| 3    | 是否运行了 `pnpm harness:sync` 和 `pnpm harness:check`？                                                    | `docs/ai-harness.md` 质量门禁 |
| 4    | 是否需要按 `docs/verification.md` 做本地浏览器验证？                                                        | `docs/verification.md`        |
| 5    | 是否确认 Stop 收尾不会自动 `git add`？                                                                      | `docs/ai-harness.md` 维护规则 |
| 6    | 是否确认强制 review 通过后仍会安排人工复核？                                                                | `docs/delivery-template.md`   |
