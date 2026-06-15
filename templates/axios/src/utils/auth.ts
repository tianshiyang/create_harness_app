import { getStorageItem, removeStorageItem, setStorageItem } from './storage'

export function getAccessToken() { return getStorageItem('token') }
export function setAccessToken(token: string) { setStorageItem('token', token) }
export function removeAccessToken() { removeStorageItem('token') }
