# @dianzhong/create-harness-app

点众科技前端脚手架。一条命令初始化符合团队规范的 Vue 3 项目。

```bash
npm create @dianzhong/harness-app my-app
```

## 包含内容

基于 [create-vue](https://github.com/vuejs/create-vue) 骨架，叠加：

| 层 | 内容 |
|---|---|
| **TypeScript + ESLint** | create-vue 默认配置 |
| **UI 组件库** | Element Plus / Ant Design Vue / 跳过（可选） |
| **axios 请求层** | 封装好的 `request.ts`、token 管理、统一错误处理 |
| **AI Harness** | Claude Code hooks（guard-tool + quality-gate）、rules、agents、skills |

## 用法

### 交互模式

```bash
npm create @dianzhong/harness-app my-app
# 按提示选择 UI 库、是否集成 axios、Harness 级别
```

### 非交互模式（CI / 快速初始化）

```bash
# 全部默认：TS + Router + Pinia + Element Plus + axios + Harness Full
npm create @dianzhong/harness-app my-app -- --yes

# 自定义
npm create @dianzhong/harness-app my-app -- --ui=ant-design-vue --harness=minimal
npm create @dianzhong/harness-app my-app -- --ui=none --harness=none --no-axios
```

### 参数

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--yes` | 非交互，全部使用默认值 | — |
| `--ui=<lib>` | `element-plus` \| `ant-design-vue` \| `none` | `element-plus` |
| `--harness=<level>` | `full` \| `minimal` \| `none` | `full` |
| `--no-axios` | 跳过 axios 请求层 | — |
| `--vitest` | 启用 Vitest | — |

## 初始化后

```bash
cd my-app
pnpm install
pnpm harness:sync   # 计算 skills 指纹（harness:full 时）
pnpm dev
```

## Harness 级别说明

- **full** — 完整治理：Claude Code hooks、rules、agents、skills、commit lint、husky、oxlint
- **minimal** — 轻量守护：guard-tool（阻止危险操作）+ quality-gate（Stop 时自动格式化 + 类型检查）
- **none** — 不集成，纯 create-vue 骨架 + axios/UI 叠加

## 要求

- Node.js `^20.19.0 || >=22.12.0`
- pnpm（推荐）或 npm / yarn
