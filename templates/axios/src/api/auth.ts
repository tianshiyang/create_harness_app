import request from './request'

/** 用户名密码登录 */
export function loginAPI(data: { username: string; password: string }) {
  return request<{ token: string }>({ url: '/api/auth/login', method: 'POST', data })
}

/** 退出登录 */
export function logoutAPI() {
  return request<void>({ url: '/api/auth/logout', method: 'POST' })
}

/** 获取当前用户信息 */
export function getUserInfoAPI() {
  return request<{ id: number; name: string; roles: string[] }>({
    url: '/api/auth/userInfo',
    method: 'GET',
  })
}
