## ADDED Requirements

### Requirement: 命令入口与调用方式

初始化器 SHALL 作为 npm `create-*` 包发布，支持通过 `npm create @dianzhong/harness-app@latest <project-name>` 及 `pnpm create @dianzhong/harness-app <project-name>` 调用，并提供 `create-harness-app` 作为 bin 名。

#### Scenario: 通过 npm create 调用并指定项目名

- **WHEN** 用户运行 `npm create @dianzhong/harness-app@latest my-app`
- **THEN** 初始化器在当前目录下创建名为 `my-app` 的目标目录并在其中生成项目

#### Scenario: 未提供项目名时交互询问

- **WHEN** 用户运行初始化器但未在 argv 中提供项目名
- **THEN** 初始化器 SHALL 通过交互提示询问项目名，且不得在未取得项目名前继续生成

#### Scenario: 目标目录已存在

- **WHEN** 目标目录已存在且非空
- **THEN** 初始化器 SHALL 先提示用户确认（覆盖/取消），未确认前不得写入文件

### Requirement: 统一交互流

初始化器 SHALL 用单一、连续的交互流收集全部配置项，顺序为：项目名 → 官方 create-vue 选项（Router/Pinia/Vitest）→ UI 库 → axios → harness 档位 → 最终确认。

#### Scenario: 用户取消交互

- **WHEN** 用户在任一交互步骤中取消（如 Ctrl+C）
- **THEN** 初始化器 SHALL 干净退出，不创建任何目标目录或文件

#### Scenario: 最终确认页展示既定项

- **WHEN** 交互进行到最终确认页
- **THEN** 确认页 SHALL 列出 TypeScript 与 ESLint+Prettier 为已锁定开启项，以及用户所选的 UI 库、axios、harness 档位

### Requirement: 强制开启 TypeScript 与 ESLint+Prettier

初始化器 SHALL 始终启用 TypeScript 与 ESLint+Prettier，并且不得向用户提供关闭这两项的选项。

#### Scenario: 交互中不出现关闭选项

- **WHEN** 用户浏览交互流
- **THEN** 交互流中 SHALL NOT 出现"是否使用 TypeScript"或"是否使用 ESLint/Prettier"这类可关闭的提问

#### Scenario: 委托 create-vue 时恒带对应 flags

- **WHEN** 初始化器调用 create-vue
- **THEN** 调用 SHALL 恒定包含 `--typescript` 与 `--eslint-with-prettier`

### Requirement: 非交互委托 create-vue 生成骨架

初始化器 SHALL 将收集到的官方选项映射为 create-vue 命令行 flags，并以非交互方式 spawn create-vue 在目标目录生成基础骨架。UI 库、axios、harness 选项 SHALL NOT 传递给 create-vue。

#### Scenario: 选项映射为 flags

- **WHEN** 用户选择启用 Router 与 Pinia、不启用 Vitest
- **THEN** create-vue 调用 SHALL 包含 `--router --pinia`，且不包含 `--vitest`

#### Scenario: create-vue 执行失败

- **WHEN** spawn 的 create-vue 进程以非零码退出
- **THEN** 初始化器 SHALL 中止后续叠加步骤并向用户报告失败原因

### Requirement: 非交互 / CI 模式

当 argv 提供了所有必要答案（含 `--yes`）时，初始化器 SHALL 跳过全部交互直接生成项目。

#### Scenario: 完整 flags 直接生成

- **WHEN** 用户运行 `create-harness-app my-app --yes --ui element-plus --harness full --axios`
- **THEN** 初始化器 SHALL 不显示任何交互提示，按所给参数生成项目

#### Scenario: --yes 使用规范默认值

- **WHEN** 用户运行 `create-harness-app my-app --yes` 且未指定 UI/harness
- **THEN** 初始化器 SHALL 采用默认值（TS + Router + Pinia + ESLint/Prettier + axios + Element Plus + harness full）生成项目
