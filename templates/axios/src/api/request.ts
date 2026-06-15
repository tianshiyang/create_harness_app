import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'
import { getAccessToken, removeAccessToken } from '@/utils/auth'
import { showError } from '@/utils/show-error'

const axiosInstance = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosInstance.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<unknown>
    if (res.code === 401) {
      removeAccessToken()
      window.location.href = '/login'
      return Promise.reject(new Error(res.msg || '登录已过期'))
    }
    if (res.code !== 200) {
      showError(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      removeAccessToken()
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期'))
    }
    const message = error.response?.data?.msg || error.message || '网络异常'
    showError(message)
    return Promise.reject(new Error(message))
  },
)

export default function request<T>(config: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  params?: unknown
  headers?: Record<string, string>
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
}): Promise<T> {
  const axiosConfig: AxiosRequestConfig = {
    url: config.url,
    method: config.method,
    data: config.data,
    params: config.params,
    onUploadProgress: config.onUploadProgress,
    headers: { ...config.headers },
  }
  return axiosInstance(axiosConfig).then((res) => (res.data as ApiResponse<T>).data)
}
