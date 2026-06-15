# Vue 与 Element Plus 规则

- 使用 Vue 3 Composition API 和 `<script setup lang="ts">`，SFC 顺序统一为 `<script>`、`<template>`、`<style>`。
- 路由页面作为组合层，不堆积复杂实现；较大 UI 拆到 `src/components/<feature>/`。
- 可复用的有状态逻辑放到 `src/composables/useXxx.ts`。
- props、emits、store state、route meta、类 API 数据边界必须显式类型化。
- 能用 `computed` 派生的状态不要重复存储；watcher 只用于副作用。
- 路由和菜单由后端 `/auth/menus` 菜单树动态生成；`src/router/routes.ts` 只保留布局和常量路由，`src/router/component-map.ts` 负责组件解析和隐藏路由。
- Element Plus 使用项目现有自动导入配置；全局主题覆盖放到 `src/styles/element-plus.scss`。
- 避免宽泛 `any`、重复菜单数据源、隐藏异步错误、未类型化权限字符串。

## 弹窗组件化规范

- 路由页面只保留列表/主视图逻辑，弹窗必须拆分为独立组件。
- **页面级弹窗放到所属页面目录下的 `components/` 中**，作为该页面的私有组件；跨页面复用的弹窗才放到 `src/components/<feature>/`。
- **弹窗可见性通过 `v-model` + `defineModel` 传递**：
  - 父组件：`<Dialog v-model="dialogVisible" v-if="dialogVisible" />`
  - 子组件：`const visible = defineModel<boolean>({ required: true })`
  - `v-if` 控制组件挂载/销毁，确保每次打开都走完整的生命周期（`onMounted` → `onUnmounted`）。
  - `v-model` 负责在弹窗内部与 ElDialog 的显示状态同步。
- **弹窗 props 最小化**：只接收必要 ID（如 `userId` / `roleId`），不接收完整对象数据。
- **弹窗内部自加载**：在 `onMounted` 中根据 ID 调用 detail API 获取详情，编辑和查看场景均如此；新增场景 ID 为 undefined，直接初始化空状态。
- **禁止在弹窗内使用 watcher 监听 ID 变化来重置状态**；状态初始化只在 `onMounted` 中完成，关闭时由 `v-if` 自然销毁重置。
- **禁止在 ElDialog 上使用 `@open` 做状态重置或数据加载**。父组件通过 `v-if` 控制弹窗时，组件每次打开都会重新挂载，setup 会重新执行，状态天然重置；数据加载应放在 `onMounted` 中。`@open` 仅在父组件使用 `v-show` 时才需要，但本项目统一使用 `v-if`。
- 弹窗通过 emit `success` 通知父组件操作成功，父组件监听后刷新列表。

## 状态枚举规范（强制）

- 除 boolean（是/否）外，所有表示业务状态的数值常量**必须**使用 TypeScript `enum`，**严禁**直接使用字面量数字做判断或赋值，例如：
  - ❌ `status === 1`、`reviewType: 2`、`actionCode === 10`、`const APPROVE = 1`
  - ✅ `status === ReviewResultEnum.APPROVE`、`reviewType: ReviewTypeEnum.PRODUCER`
- **常量也不够**：即便封装成 `const REVIEW_RESULT_APPROVE = 1` 这样的常量，**也不符合规范**，必须用 `enum`。
- 枚举定义放在 `src/types/` 或 `src/constants/` 中，使用 PascalCase 命名，如 `ReviewResultEnum`、`ActionCodeEnum`。
- 枚举上方必须用注释写清所有码值含义，例如 `/** 1-通过 2-驳回 */`，不依赖代码读者去猜。
- 枚举对应的标签映射使用独立常量对象，如 `REVIEW_RESULT_LABELS`，不在模板中内联三元表达式显示文案。
- **后端码值待确认时**：用 `⚠️ TODO(联调)` 注释标注，但仍然定义 enum 占位，不能用裸数字拖到联调时再改。
- **review 必须阻断**：在代码中发现裸数字比较业务状态码（`=== 1`、`=== 2` 等）视为 P1 问题，必须拒绝合并。

## `<script setup>` 内部书写顺序（强制）

`<script setup>` 内部必须严格按以下顺序书写，**不得颠倒**：

```
1. import 语句
2. defineProps / defineEmits / defineModel
3. 常量、枚举引用（不可变的模块级常量）
4. 按业务模块分组，每个模块内依次为 ref/reactive → computed → 函数
   - 模块A（如：登录相关）：ref → computed → 函数
   - 模块B（如：注册相关）：ref → computed → 函数
   - ...
5. watch / watchEffect（副作用监听）
6. onMounted / onUnmounted 等生命周期钩子
7. 接口请求初始化调用（setup 阶段直接触发，放在最末尾）
```

**规则细则：**

- **按模块维度组织代码**：相关逻辑集中在一起（如登录相关放一起、注册相关放一起），而不是把所有 ref 拢在一起、所有 computed 拢在一起。每个模块内部保持 ref/reactive → computed → 函数的顺序。
- **同一模块的响应式数据优先使用 `reactive` 合并到一个对象中**，而不是多个独立的 `ref`。这样同一业务领域的状态天然聚合，语义更清晰，也便于按模块整体传递或重置。
- **接口请求优先在 setup 阶段直接触发**（即 `<script setup>` 顶层调用），而不是放在 `onMounted` 中。接口请求的初始化调用放在 script 最末尾，这样数据加载在 setup 阶段就开始，比等 `onMounted` 更早发起请求。
- **禁止裸 `await`**：setup 顶层不允许 `await fetchXxx()`，因为 `<script setup>` 不支持顶层 await（除非配合 `<Suspense>`）。应调用不 await 的函数触发请求，或使用 `.then()` 处理。
- `onMounted` / `onUnmounted` / `onBeforeUnmount` 等生命周期钩子放在 watch 之后、接口请求初始化之前，用于非 API 请求的初始化逻辑（如事件监听、DOM 操作等）。
- `watch` / `watchEffect` 放在所有模块分组之后、生命周期钩子之前，不允许散落在 `ref` 或 `computed` 附近。

**正确示例：**

```ts
// ✅ 正确：按模块分组，同模块数据用 reactive 合并，接口初始化在末尾
// --- 模块：用户列表 ---
const listState = reactive({
  data: [] as UserInfo[],
  loading: false,
  total: 0,
})

async function fetchUserList() {
  listState.loading = true
  const res = await getUserListAPI()
  listState.data = res.data.list
  listState.total = res.data.total
  listState.loading = false
}

// --- 模块：弹窗操作 ---
const dialogState = reactive({
  visible: false,
  currentId: undefined as number | undefined,
})

function handleEdit(id: number) {
  dialogState.currentId = id
  dialogState.visible = true
}

// --- watch ---
watch(() => props.id, fetchUserList)

// --- 生命周期（非 API 初始化逻辑） ---
onMounted(() => {
  // 仅用于非 API 请求的初始化，如事件监听
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// --- 接口请求初始化（setup 阶段，最末尾） ---
fetchUserList()
```

```ts
// ❌ 错误：接口请求放在 onMounted 里
onMounted(() => {
  fetchUserList() // 应直接在 setup 顶层调用
})

// ❌ 错误：同模块数据用多个独立 ref
const userList = ref([]) // 应合并为 reactive 对象
const loading = ref(false) // 同上
const total = ref(0) // 同上

// ❌ 错误：不按模块分组
const userList = ref([])
const dialogVisible = ref(false) // 弹窗状态和列表状态混在一起
const loading = ref(false)
```

- **review 必须阻断**：发现接口请求初始化放在 `onMounted` 中（而非 setup 末尾直接调用）、或代码不按模块分组视为 P1 问题。

## 表单校验规范（强制）

- **优先使用 Element Plus Form 的 `rules` 进行校验**，而不是在提交时手动 `if` 判断或自定义校验函数散落各处。
- 校验规则通过 `:rules` 绑定到 `el-form`，配合 `prop` 声明，利用 Element Plus 内置的异步校验和错误提示机制。
- 需要自定义校验逻辑时，使用 `rules` 中的 `validator` 字段，而非绕过 Form 直接弹提示。

**正确示例：**

```ts
// ✅ 使用 el-form rules 校验
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: PHONE_REGEX, message: '手机号格式不正确', trigger: 'blur' },
  ],
}
```

```html
<!-- ✅ 模板中绑定 rules + prop -->
<el-form :model="form" :rules="rules" ref="formRef">
  <el-form-item label="名称" prop="name">
    <el-input v-model="form.name" />
  </el-form-item>
</el-form>
```

```ts
// ❌ 错误：手动 if 校验，绕过 Form rules
async function handleSubmit() {
  if (!form.name) {
    ElMessage.warning('请输入名称') // 禁止
    return
  }
}
```

## 手机号校验规范

- 手机号校验统一使用正则 `/^1\d{10}$/`（1 开头的 11 位数字），定义为模块级常量复用。
- 该正则封装在项目公共位置（如 `src/utils/validators.ts` 或 `src/constants/`），各表单通过 import 引用，不在组件内重复定义。

```ts
// ✅ 常量定义（公共位置）
/** 手机号正则：1 开头的 11 位数字 */
export const PHONE_REGEX = /^1\d{10}$/

// ✅ 在 Form rules 中使用
import { PHONE_REGEX } from '@/constants/validators'

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: PHONE_REGEX, message: '手机号格式不正确', trigger: 'blur' },
  ],
}
```

```ts
// ❌ 错误：在组件内重复定义正则
const phoneReg = /^1[3-9]\d{9}$/ // 禁止，应复用公共常量

// ❌ 错误：手动 if 判断手机号
if (!PHONE_REGEX.test(form.phone)) {
  ElMessage.warning('手机号格式不正确') // 应通过 Form rules 校验
  return
}
```

## 列表页搜索规范

- **列表页的搜索按钮必须重置 `pageNo = 1`**，避免在翻到第 N 页后搜索导致结果为空或数据错位。
- 重置分页和发起请求统一放在搜索方法中，分页组件的 `current-change` 事件只负责翻页请求，不做搜索重置。

```ts
// ✅ 搜索按钮：重置页码后再请求
const queryParams = reactive({ pageNo: 1, pageSize: 10, keyword: '' })

function handleSearch() {
  queryParams.pageNo = 1 // 必须重置
  fetchList()
}

function handlePageChange(page: number) {
  queryParams.pageNo = page
  fetchList()
}
```

```ts
// ❌ 错误：搜索时未重置页码
function handleSearch() {
  // 缺少 queryParams.pageNo = 1，翻到第 3 页搜索会请求 pageNo=3
  fetchList()
}
```
