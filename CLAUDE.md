# create-harness-app 开发指南

这是 `@dianzhong/create-harness-app` 的源码仓库，即 CLI 工具本身，不是用它生成的项目。

## 这个工具做什么

用一条命令初始化符合点众前端规范的 Vue 3 项目：

```bash
npm create @dianzhong/harness-app my-app
```

内部流程：
1. 调用 `npx create-vue@latest` 生成基础骨架（TS + Router + Pinia + ESLint）
2. 把 `templates/` 下的文件叠加进去（axios 请求层、UI 库初始化、Harness 治理体系）
3. 合并 `package.json`（只新增依赖，不降级已有版本）

## 技术栈

- **运行时**：Node.js ≥ 20.19，ESM，TypeScript（由 tsup 编译）
- **交互提示**：`@clack/prompts`
- **子进程**：`execa`（调用 create-vue）
- **文件操作**：`fs-extra`
- **构建**：`tsup` → `dist/index.mjs`
- **测试**：Node.js 内置 test runner（`--experimental-strip-types`，无需编译）

## 项目结构

```
src/
  index.ts              # CLI 入口：解析参数、交互提示、调度流程
  prompts.ts            # UserConfig 类型 + @clack/prompts 交互流
  spawn-create-vue.ts   # execa 调用 create-vue@latest
  overlay.ts            # 统一叠加入口：按配置依次调用各 feature
  merge-json.ts         # package.json 合并：依赖只补不降，脚本总覆盖
  inject.ts             # 锚点注入：insertBefore/insertAfter/hasMarker
  features/
    axios.ts            # 叠加 axios 请求层（request.ts + show-error.ts）
    ui-element-plus.ts  # 注入 Element Plus 到 main.ts 和 vite.config.ts
    ui-antdv.ts         # 注入 Ant Design Vue 到 main.ts 和 vite.config.ts
    harness.ts          # 叠加 Harness 治理文件（full / minimal）
  utils/
    fs.ts               # readJson / writeJson / copyDir / writeText 封装

templates/
  axios/                # axios 请求层模板（request.ts、auth.ts、show-error 由代码生成）
  harness/
    full/               # 完整 Harness：hooks、rules、agents、skills、scripts、文档
    minimal/            # 最小 Harness：guard-tool + quality-gate + 最简 CLAUDE.md

tests/
  merge-json.test.ts    # mergePackageJson 单元测试
  inject.test.ts        # insertAfter/insertBefore/hasMarker 单元测试
  e2e/
    generate.test.ts    # E2E：真实跑 CLI，断言生成结果
```

## 常用命令

```bash
pnpm build              # 编译 src/ → dist/index.mjs（发布前必跑）
pnpm test               # 单元测试（merge-json + inject，秒级）
pnpm test:e2e           # E2E 测试（会真实调用 create-vue，耗时约 3 分钟）
npx tsc --noEmit        # 类型检查 src/
npx tsc --project tsconfig.test.json  # 类型检查 tests/
```

## 开发本地测试

```bash
pnpm build
node dist/index.mjs my-test-app --yes          # 快速验证默认路径
node dist/index.mjs my-test-app --ui=none --harness=none  # 最简路径
```

## 发布流程

```bash
npm version patch       # 改版本号（会同步 package.json）
pnpm build              # 重新编译
npm publish --access public --registry https://registry.npmjs.org
```

## 核心设计决策

**模板路径解析**：tsup 把所有源文件打包进 `dist/index.mjs`，`import.meta.url` 指向这个 bundle。所以 `features/` 里访问模板必须用 `new URL('../templates', import.meta.url)`（相对于 `dist/`），而不是 `../../templates`（相对于源文件位置）。

**依赖合并策略**：`mergePackageJson` 的 dependencies/devDependencies 只补新包，不覆盖已有包，防止把用户手动升级的高版本降回去。scripts 始终用我们的版本覆盖，因为 `harness:sync`、`check` 等脚本必须保持格式一致。

**注入而非替换**：UI 库初始化代码通过锚点注入（`insertBefore/insertAfter`）写入 create-vue 生成的文件，而不是完全替换这些文件。好处是 create-vue 升级后只要锚点还在就能正常工作；锚点消失则明确报错（`AnchorNotFoundError`），不静默失败。
