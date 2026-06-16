## Why

团队新建 Vue 3 项目时，每次都要手工重复一套相同的工程化基建：axios 请求/响应拦截层、UI 组件库按需引入、以及本仓库沉淀的 AI Harness 治理体系（hooks、rules、agents、skills、质量门禁脚本）。手工搬运既慢又容易漏配、版本漂移。我们需要一个像 `create-vue` 一样的初始化器，一条命令就能产出"自带规范、自带 axios、自带 harness"的新项目骨架，让各团队在统一基线上各自微调。

## What Changes

- 新增独立的 npm 初始化器包 `@dianzhong/create-harness-app`，通过 `npm create @dianzhong/harness-app@latest my-app` 调用（v1 先以独立仓库 + `npx <git-url>` 形式分发，暂不发布 registry）。
- CLI **封装官方 `create-vue`**：用统一的交互流收集配置，再以非交互 flags 委托 `create-vue` 生成基础骨架（对齐官方能力与升级）。
- 在 `create-vue` 产物之上**叠加三层能力**：
  - **UI 组件库（单选）**：Element Plus / Ant Design Vue / 自己配置；选中某个库时自动装好官方推荐插件（如 Element Plus → `unplugin-auto-import` + `unplugin-vue-components` + Resolver）。
  - **axios 请求层（默认必带）**：`request.ts` 拦截器 + `ApiResponse`/`PageResult` 类型 + token/401 处理 + 示例 api 模块。
  - **Harness 治理层（单选 full / minimal / none）**：full 为本仓库整套 harness 快照，minimal 仅安全守护 + 质量门禁，none 不带。
- 叠加采用"**直接拷贝 + `package.json` 字段合并 + 入口文件锚点注入**"三类合并策略，保证不覆盖 `create-vue` 已生成的内容。
- TypeScript 与 ESLint+Prettier 在本初始化器中**强制开启**（harness 质量门禁依赖），不提供关闭选项。
- 支持非交互/CI 模式：argv 提供全部答案时跳过所有 prompt。
- 模板以**静态快照**形式维护（从 `project-manage` 拷贝一份到 CLI 仓库的 `templates/`），harness 演进时手工同步。

## Capabilities

### New Capabilities

- `cli-scaffolding`: 初始化器的命令入口、参数解析、交互流（含强制项与默认值）、对 `create-vue` 的非交互委托，以及非交互/CI 模式。
- `project-overlay`: 在 `create-vue` 产物上叠加文件的引擎——直接拷贝、`package.json` 字段合并、入口文件（`main.ts`/`vite.config.ts`）锚点注入，及幂等与失败中止策略。
- `feature-ui-library`: UI 组件库三选一（Element Plus / Ant Design Vue / 自己配置）的依赖、插件与样式集成规则。
- `feature-axios-layer`: axios 请求/响应层模板内容，以及错误提示与 UI 库解耦（`showError()` 适配器）的契约。
- `feature-harness-layer`: harness 三档（full / minimal / none）各自包含的文件集合与 `package.json` 脚本注入。

### Modified Capabilities

<!-- 无：本变更不修改 project-manage 现有业务规格的需求。 -->

## Impact

- **新增仓库/包**：独立的 `create-harness-app` CLI 仓库（不在 `project-manage` 内实现，本变更仅在 OpenSpec 中沉淀其规格）。
- **运行依赖**：Node ≥ 20.19 / 22.12；`create-vue`（spawn 调用）；交互库 `@clack/prompts`；构建用 `tsup` 或等价工具。
- **模板来源**：依赖 `project-manage` 当前的 `.claude/**`、`.agents/skills/**`、`skills-lock.json`、`scripts/**`、`docs/**`、`src/api/request.ts`、`src/types/api.ts`、`src/utils/{auth,storage}.ts` 作为静态快照来源。
- **对 axios 模板的唯一改动**：将 `request.ts` 中对 `element-plus` 的 `ElMessage` 直接依赖替换为可注入的 `showError()`，以兼容非 Element Plus 的 UI 选择。
- **不影响** `project-manage` 现有运行时代码与业务规格。
