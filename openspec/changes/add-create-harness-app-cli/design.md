## Context

团队反复手工搭建 Vue 3 项目的工程化基建（axios 层、UI 库按需引入、AI Harness 治理体系），过程慢、易漏配、版本易漂移。`project-manage` 仓库已沉淀出一套成熟的 harness（详见 `docs/share/harness-engineering.md`）和 axios 请求层，值得固化成一个可复用的初始化器。

约束：
- 只面向 Claude Code 场景（v1 不为其它 AI 工具做额外适配，但 harness 快照本身已含 `AGENTS.md`/`GEMINI.md` 入口与 `.agents/skills/` 镜像）。
- 骨架来源必须是官方 `create-vue`（封装而非自维护完整模板），以跟随官方升级。
- 模板必须是普通可读文件，团队 clone 出去后可直接改 axios / harness。
- TypeScript、ESLint+Prettier 为既定前提（harness 质量门禁依赖），不可关闭。

## Goals / Non-Goals

**Goals:**
- 一条 `npm create` 命令产出"自带 axios + 可选 UI 库 + 可选 harness"的 Vue 3 项目。
- 统一、一气呵成的交互体验（对齐 vue-cli 的 `vue create`），并支持完全非交互/CI 模式。
- 叠加层不破坏 `create-vue` 产物；合并冲突显式可见，失败立即中止不留半成品。
- axios 错误提示与具体 UI 库解耦，使三种 UI 选择都能正常工作。

**Non-Goals:**
- 不实现 v1 的 registry 发布（先独立仓库 + `npx <git-url>`）。
- 不做模板自动同步脚本（v1 用静态快照，手工同步）。
- 不引入 OpenSpec、工具/布局骨架等额外可选项（已在 brainstorming 中排除）。
- 不在 `project-manage` 仓库内实现 CLI 代码——本变更只在 OpenSpec 沉淀规格。
- 不支持 Vue 2 或非 Vite 构建。

## Decisions

### D1：封装官方 `create-vue`，非交互委托（方案 A）
CLI 用 `@clack/prompts` 掌控全部交互，收集完后用命令行 flags **非交互调用 `create-vue`** 生成基础骨架，再叠加我们的层。
- **为什么**：保留"跟随官方升级"的好处，同时给出统一交互流和 CI 能力。
- **备选**：①交互透传（先跑官方交互再追加我们的）——交互割裂、CI 难做，否决；②vendored 生成器（fork create-vue 模板）——维护成本最高，退化为自维护完整模板，否决。

### D2：选项 → `create-vue` flags 映射
TS/Router/Pinia/Vitest/ESLint+Prettier 通过 flags 透传给 `create-vue`；UI 库、axios、harness 不传给 `create-vue`，完全由 overlay 处理（`create-vue` 不认识这些概念）。
- **强制项**：`--typescript`、`--eslint-with-prettier` 恒开，交互中不展示为可选。

### D3：三类叠加合并策略
- **纯新增文件 → 直接拷贝**（axios、harness、UI scss、scripts、docs，`create-vue` 不生成，无冲突）。
- **`package.json` → 字段级合并**：并入 deps/devDeps（版本取快照锁定值，已存在不降级）与 harness scripts（`harness:sync`/`harness:check`/`check` 等），保留官方 `dev`/`build`；冲突 key 以"我们的值"为准并记入生成日志。
- **入口文件 → 锚点注入**：对 `src/main.ts`（`createApp` 后、`mount` 前注入 `app.use(...)`）与 `vite.config.ts`（`plugins: [` 后注入 AutoImport/Components）用确定性字符串锚点注入。
- **为什么用锚点而非 AST**：`create-vue` 的 main/vite 结构稳定且就几行，字符串锚点零依赖、足够可靠；锚点找不到时**显式报错**而非静默错误，由测试覆盖。

### D4：幂等与失败处理
overlay 每步先检测"是否已注入过"防重复；任一锚点缺失 → 中止并打印清晰错误，不留半成品目录。

### D5：axios 错误提示与 UI 解耦
模板 `request.ts` 不再直接 `import { ElMessage } from 'element-plus'`，改为调用 `showError(msg)`。`showError` 实现由所选 UI 注入：Element Plus → `ElMessage.error`；Ant Design Vue → `message.error`；自己配置 → `console.error` 占位。这是对原始 axios 代码的**唯一**改动。

### D6：UI 库集成细节
- **Element Plus**：deps `element-plus` + `@element-plus/icons-vue`；dev `unplugin-auto-import` + `unplugin-vue-components` + `sass`；vite 注入两个 Resolver；生成 `src/styles/element-plus.scss` 主题覆盖位并在 `main.ts` 引入。
- **Ant Design Vue**：deps `ant-design-vue` + `@ant-design/icons-vue`；dev `unplugin-vue-components` + `AntDesignVueResolver` 按需引入。
- **自己配置**：不装 UI、不注入，仅保留 `showError` 的 console 占位。

### D7：harness 三档内容边界
- **full**：整套 `.claude/**`（settings/hooks/rules/agents/skills/commands）+ `.agents/skills/**` 镜像 + `skills-lock.json` + `scripts/**`（含 verify-skills / sync-harness-docs / check-project-structure 及其测试）+ `docs/**` harness 文档 + `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` + husky/lint-staged/commitlint/oxlint/prettier/editorconfig + 注入 `harness:*`/`check` 脚本。
- **minimal**：仅 `.claude/hooks/guard-tool.cjs` + `quality-gate.cjs` + 精简 `settings.json`（deny 名单 + Stop 质量门禁，不含 subagent review）+ 精简 `CLAUDE.md`。
- **none**：不带任何 harness 文件。

### D8：交付与技术栈
独立仓库；`package.json` 带 `bin` 与 `type: module`；TypeScript 源码用 `tsup` 打包为 `dist/index.mjs`；运行时依赖 `@clack/prompts`，spawn `create-vue`。v1 通过 `npx <git-url>` 或本地 link 使用。

## Risks / Trade-offs

- [官方 `create-vue` 升级后改变 main.ts/vite.config 结构，锚点注入失效] → 注入失败时显式报错而非静默；CI 测试固定一个 `create-vue` 版本范围并定期校验；锚点选用稳定标志（`mount(`、`plugins: [`）。
- [静态快照导致 harness 与源仓库漂移] → v1 接受此代价；在 CLI 仓库 README 记录"快照取自 project-manage 的某 commit"，后续版本再考虑同步脚本。
- [`skills-lock.json` 随快照拷贝后，生成项目里 `pnpm harness:check` 可能因路径/内容差异失败] → full 档生成后引导用户运行 `pnpm harness:sync` 重算指纹，作为收尾步骤写入"下一步"提示。
- [axios 模板原本无 `baseURL`，团队易漏配] → 模板补 `.env` 示例与 `VITE_API_BASE_URL` 注释，生成后提示。
- [`package.json` 字段合并把官方依赖降级/冲突] → 合并策略明确"已存在不降级"，并把所有冲突写入生成日志供用户复核。
