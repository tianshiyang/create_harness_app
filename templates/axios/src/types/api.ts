export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface PageParams {
  pageNo?: number
  limit?: number
}

export interface PageResult<T> {
  data: T[]
  pageNo: number
  limit: number
  totalNum: number
  totalPage: number
  /** 兼容后端 records 命名 */
  records?: T[]
  /** 兼容后端 total 命名 */
  total?: number
  /** 兼容后端 size 命名 */
  size?: number
  /** 兼容后端 current 命名 */
  current?: number
}
