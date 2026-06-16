## ADDED Requirements

### Requirement: UI 库三选一

初始化器 SHALL 提供 UI 组件库的单选项：Element Plus、Ant Design Vue、自己配置，默认值为 Element Plus。

#### Scenario: 默认选中 Element Plus

- **WHEN** 用户在 UI 库提问处直接回车不改默认
- **THEN** 初始化器 SHALL 采用 Element Plus

#### Scenario: 选择自己配置

- **WHEN** 用户选择"自己配置"
- **THEN** 初始化器 SHALL NOT 安装任何 UI 库依赖，也不向 main.ts / vite.config 注入 UI 相关代码

### Requirement: Element Plus 集成

当用户选择 Element Plus 时，初始化器 SHALL 安装 `element-plus` 与 `@element-plus/icons-vue`，并安装开发依赖 `unplugin-auto-import`、`unplugin-vue-components`、`sass`，且在 `vite.config.ts` 注入两者的 `ElementPlusResolver`。

#### Scenario: 注入自动导入插件

- **WHEN** Element Plus 被选中
- **THEN** `vite.config.ts` SHALL 包含 `AutoImport({ resolvers: [ElementPlusResolver()] })` 与 `Components({ resolvers: [ElementPlusResolver()] })`

#### Scenario: 生成主题覆盖文件

- **WHEN** Element Plus 被选中
- **THEN** 初始化器 SHALL 生成 `src/styles/element-plus.scss` 作为全局主题覆盖位，并在 `main.ts` 中引入

### Requirement: Ant Design Vue 集成

当用户选择 Ant Design Vue 时，初始化器 SHALL 安装 `ant-design-vue` 与 `@ant-design/icons-vue`，并通过 `unplugin-vue-components` 的 `AntDesignVueResolver` 实现按需引入。

#### Scenario: 注入按需引入 Resolver

- **WHEN** Ant Design Vue 被选中
- **THEN** `vite.config.ts` SHALL 包含使用 `AntDesignVueResolver` 的 `Components(...)` 配置

### Requirement: UI 选择驱动 showError 实现

初始化器 SHALL 根据所选 UI 库生成对应的 `showError()` 实现，供 axios 层调用（见 feature-axios-layer）。

#### Scenario: Element Plus 的 showError

- **WHEN** UI 库为 Element Plus
- **THEN** `showError(msg)` 的实现 SHALL 调用 Element Plus 的 `ElMessage.error(msg)`

#### Scenario: Ant Design Vue 的 showError

- **WHEN** UI 库为 Ant Design Vue
- **THEN** `showError(msg)` 的实现 SHALL 调用 Ant Design Vue 的 `message.error(msg)`

#### Scenario: 自己配置的 showError

- **WHEN** UI 库为"自己配置"
- **THEN** `showError(msg)` 的实现 SHALL 使用 `console.error(msg)` 作为占位，并附注释提示团队自行替换
