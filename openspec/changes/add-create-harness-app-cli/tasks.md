## 1. 仓库与构建脚手架

- [ ] 1.1 创建独立仓库 `create-harness-app`，`package.json` 设置 `name: @dianzhong/create-harness-app`、`type: module`、`bin.create-harness-app` 指向 `dist/index.mjs`、`engines.node` ≥20.19/22.12
- [ ] 1.2 配置 TypeScript 源码 + `tsup` 打包到 `dist/index.mjs`，加入 `@clack/prompts` 运行时依赖
- [ ] 1.3 搭建 `src/`（index/prompts/create-vue/overlay/features/utils）与 `templates/`、`tests/` 目录骨架

## 2. 模板静态快照

- [ ] 2.1 从 project-manage 拷入 axios 模板：`request.ts`、`types/api.ts`、`utils/auth.ts`、`utils/storage.ts`、示例 `api/auth.ts`，并补 `.env` 示例（`VITE_API_BASE_URL`）
- [ ] 2.2 改造 axios 模板：将 `request.ts` 中 `ElMessage` 依赖替换为 `showError()` 调用，新增 `showError` 适配点
- [ ] 2.3 拷入 UI 模板片段：Element Plus（scss 主题位 + vite/main 注入片段）、Ant Design Vue（vite 注入片段）
- [ ] 2.4 拷入 harness full 快照：`.claude/**`、`.agents/skills/**`、`skills-lock.json`、`scripts/**`、`docs/**`、`CLAUDE/AGENTS/GEMINI.md`、husky/lint-staged/commitlint/oxlint/prettier/editorconfig
- [ ] 2.5 裁剪出 harness minimal 模板：guard-tool + quality-gate + 精简 settings.json + 精简 CLAUDE.md

## 3. 交互流与参数解析（cli-scaffolding）

- [ ] 3.1 实现 argv 解析（项目名、`--yes`、`--ui`、`--harness`、`--axios`、create-vue 透传项）
- [ ] 3.2 用 `@clack/prompts` 实现统一交互流（项目名 → Router/Pinia/Vitest → UI → axios → harness → 确认），含取消即干净退出
- [ ] 3.3 实现强制项：TS 与 ESLint+Prettier 不展示为可选，仅在确认页列为锁定项
- [ ] 3.4 实现非交互/CI 模式：argv 齐全或 `--yes` 时跳过交互并套用规范默认值
- [ ] 3.5 实现目标目录存在性检查与覆盖确认

## 4. 委托 create-vue（cli-scaffolding）

- [ ] 4.1 实现选项 → create-vue flags 映射（恒带 `--typescript --eslint-with-prettier`，按选择带 `--router/--pinia/--vitest`）
- [ ] 4.2 spawn create-vue（非交互）在目标目录生成骨架，捕获非零退出码并中止后续

## 5. 叠加引擎（project-overlay）

- [ ] 5.1 实现直接拷贝器（递归拷贝模板文件到目标路径）
- [ ] 5.2 实现 `package.json` 字段级合并（deps/devDeps 不降级、scripts 注入、冲突写日志）
- [ ] 5.3 实现 `main.ts` 锚点注入（`createApp` 后、`.mount(` 前）与幂等检测
- [ ] 5.4 实现 `vite.config.ts` 锚点注入（`plugins: [` 后）与幂等检测
- [ ] 5.5 实现锚点缺失即显式报错、任一步失败即中止的策略

## 6. Feature 叠加逻辑

- [ ] 6.1 实现 `features/ui-element-plus.ts`：装依赖 + 注入 AutoImport/Components Resolver + 生成 scss + 注入 showError(ElMessage)
- [ ] 6.2 实现 `features/ui-antdv.ts`：装依赖 + 注入 AntDesignVueResolver + 注入 showError(message.error)
- [ ] 6.3 实现 UI=自己配置：不装 UI、不注入，showError 用 console.error 占位
- [ ] 6.4 实现 `features/axios.ts`：拷贝 axios 文件 + 装 `axios` + 接 showError 实现
- [ ] 6.5 实现 `features/harness.ts`：按 full/minimal/none 拷贝对应模板 + 注入 harness scripts

## 7. 收尾与提示

- [ ] 7.1 实现生成日志（含 package.json 合并冲突列表）
- [ ] 7.2 实现"下一步"提示：install、harness full 时引导 `pnpm harness:sync`、`dev`

## 8. 测试与验证

- [ ] 8.1 编写 e2e 生成测试：各 UI × 各 harness 档位组合生成后，断言关键文件存在与注入正确
- [ ] 8.2 编写锚点注入失败用例（模拟 create-vue 结构变化）断言显式报错
- [ ] 8.3 对生成的 full 档项目运行 `pnpm install && pnpm type-check && pnpm build` 验证可用
- [ ] 8.4 验证非交互模式与 `--yes` 默认值路径
- [ ] 8.5 编写 README：调用方式、`npm create` scope 解析说明、快照来源 commit、维护方式
