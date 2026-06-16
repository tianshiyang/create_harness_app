## ADDED Requirements

### Requirement: 叠加引擎执行顺序

叠加引擎（overlay）SHALL 在 create-vue 生成基础骨架之后运行，并按所选 feature（UI 库、axios、harness）依次叠加文件，每个 feature 的叠加相互独立。

#### Scenario: 按所选 feature 执行

- **WHEN** 用户选择 Element Plus + axios + harness full
- **THEN** overlay SHALL 依次执行 UI、axios、harness 三类叠加，未选中的 feature 不执行

### Requirement: 纯新增文件直接拷贝

对于 create-vue 不会生成的文件（axios 层、harness 文件、UI 样式、scripts、docs），overlay SHALL 直接从模板拷贝到目标目录。

#### Scenario: 拷贝 axios 模板文件

- **WHEN** axios feature 启用
- **THEN** overlay SHALL 将 `request.ts`、`types/api.ts`、`utils/auth.ts`、`utils/storage.ts`、示例 api 文件拷贝到目标项目对应路径

### Requirement: package.json 字段级合并

overlay SHALL 对 `package.json` 做字段级合并而非整体覆盖：并入 feature 所需的 `dependencies`/`devDependencies` 与 harness 相关 `scripts`，保留 create-vue 生成的既有字段。

#### Scenario: 合并依赖不降级

- **WHEN** 某依赖已存在于 create-vue 生成的 package.json 中，且版本不低于模板锁定版本
- **THEN** overlay SHALL 保留较高版本，不将其降级到模板版本

#### Scenario: 注入 harness 脚本

- **WHEN** harness full 启用
- **THEN** overlay SHALL 向 `scripts` 注入 `harness:sync`、`harness:check`、`check` 等脚本，并保留 create-vue 的 `dev`/`build`

#### Scenario: 记录冲突

- **WHEN** 合并时某个 key 同时存在于模板与既有 package.json 且值不同
- **THEN** overlay SHALL 以模板值为准并将该冲突写入生成日志

### Requirement: 入口文件锚点注入

overlay SHALL 通过确定性字符串锚点向 `src/main.ts` 与 `vite.config.ts` 注入代码，而非整体替换文件。

#### Scenario: 注入 main.ts

- **WHEN** 需要注册 UI 插件或样式
- **THEN** overlay SHALL 在 `createApp(...)` 之后、`.mount(` 之前注入相应 `app.use(...)` / import 语句

#### Scenario: 注入 vite.config.ts

- **WHEN** UI 库需要按需引入插件
- **THEN** overlay SHALL 在 `plugins: [` 之后注入对应的插件 import 与调用

#### Scenario: 锚点缺失时中止

- **WHEN** 目标文件中找不到预期锚点
- **THEN** overlay SHALL 显式报错并中止，不得静默跳过注入

### Requirement: 幂等与失败中止

overlay 的注入步骤 SHALL 幂等（重复注入前先检测是否已注入），且任一步骤失败时 SHALL 立即中止并避免留下半成品目录。

#### Scenario: 防止重复注入

- **WHEN** 某段代码已被注入过
- **THEN** overlay SHALL 检测到并跳过该次注入，不产生重复内容

#### Scenario: 中途失败

- **WHEN** overlay 在某一步抛出错误
- **THEN** 初始化器 SHALL 停止后续步骤并向用户报告，已生成的目标目录状态需在错误信息中说明
