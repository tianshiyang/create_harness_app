import { intro, text, select, confirm, isCancel, cancel } from '@clack/prompts'

export interface UserConfig {
  projectName: string
  router: boolean
  pinia: boolean
  vitest: boolean
  uiLibrary: 'element-plus' | 'ant-design-vue' | 'none'
  axios: boolean
  harness: 'full' | 'minimal' | 'none'
}

export function defaultConfig(projectName: string): UserConfig {
  return {
    projectName,
    router: true,
    pinia: true,
    vitest: false,
    uiLibrary: 'element-plus',
    axios: true,
    harness: 'full',
  }
}

function check<T>(val: T | symbol): T {
  if (isCancel(val)) { cancel('已取消'); process.exit(0) }
  return val as T
}

export async function collectConfig(initialName?: string): Promise<UserConfig> {
  intro('create-harness-app — 点众前端项目初始化器')

  const projectName = initialName ?? check(await text({
    message: '项目名称',
    placeholder: 'my-app',
    validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) ? undefined : '请使用小写字母、数字和连字符',
  }))

  const router  = check(await confirm({ message: '启用 Vue Router？', initialValue: true }))
  const pinia   = check(await confirm({ message: '启用 Pinia 状态管理？', initialValue: true }))
  const vitest  = check(await confirm({ message: '启用 Vitest 单元测试？', initialValue: false }))

  const uiLibrary = check(await select<'element-plus' | 'ant-design-vue' | 'none'>({
    message: 'UI 组件库',
    options: [
      { value: 'element-plus', label: 'Element Plus（默认）' },
      { value: 'ant-design-vue', label: 'Ant Design Vue' },
      { value: 'none', label: '自己配置' },
    ],
  }))

  const axios = check(await confirm({ message: '集成 axios 请求层？', initialValue: true }))

  const harness = check(await select<'full' | 'minimal' | 'none'>({
    message: 'Harness 治理层',
    options: [
      { value: 'full', label: 'Full — 完整 hooks/rules/agents/skills（默认）' },
      { value: 'minimal', label: 'Minimal — 仅安全守护 + 质量门禁' },
      { value: 'none', label: '不集成' },
    ],
  }))

  return { projectName, router, pinia, vitest, uiLibrary, axios, harness }
}
