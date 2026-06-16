## ADDED Requirements

### Requirement: axios 层默认带入

初始化器 SHALL 默认启用 axios 请求层，并允许用户显式关闭。启用时 SHALL 安装 `axios` 依赖并拷入请求层文件。

#### Scenario: 默认启用

- **WHEN** 用户未显式关闭 axios
- **THEN** 初始化器 SHALL 生成 axios 层并把 `axios` 加入 dependencies

#### Scenario: 显式关闭

- **WHEN** 用户在交互中关闭 axios，或传入对应关闭参数
- **THEN** 初始化器 SHALL NOT 生成 axios 层文件，也不安装 `axios`

### Requirement: axios 层文件集合

启用时，初始化器 SHALL 生成 `src/api/request.ts`（请求/响应拦截器）、`src/types/api.ts`（`ApiResponse`/`PageParams`/`PageResult` 类型）、`src/utils/auth.ts`、`src/utils/storage.ts` 及至少一个示例 api 模块。

#### Scenario: 生成请求层与类型

- **WHEN** axios 层启用
- **THEN** 目标项目 SHALL 包含 `request.ts` 与 `types/api.ts`，且 `request.ts` 保留 token 注入、401 处理、业务码非 200 的错误处理逻辑

#### Scenario: 提供 baseURL 配置位

- **WHEN** axios 层启用
- **THEN** 初始化器 SHALL 在 `.env` 示例中提供 `VITE_API_BASE_URL` 及说明注释，并提示团队按需配置

### Requirement: 错误提示与 UI 解耦

axios 层的错误提示 SHALL 通过 `showError()` 适配器发出，而非直接依赖任一具体 UI 库。

#### Scenario: request.ts 不直接依赖 element-plus

- **WHEN** 生成的 `request.ts` 需要弹出错误提示
- **THEN** 它 SHALL 调用 `showError(msg)`，且 SHALL NOT 直接 `import { ElMessage } from 'element-plus'`

#### Scenario: showError 来源由 UI 选择决定

- **WHEN** axios 层与某个 UI 选择组合生成
- **THEN** `showError` 的实现 SHALL 由 feature-ui-library 按所选 UI 库注入（Element Plus / Ant Design Vue / console 占位）
