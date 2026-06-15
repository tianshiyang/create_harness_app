export function getStorageItem(key: string): string | null {
  return window.localStorage.getItem(key)
}
export function setStorageItem(key: string, value: string) {
  window.localStorage.setItem(key, value)
}
export function removeStorageItem(key: string) {
  window.localStorage.removeItem(key)
}
export function getJsonStorageItem<T>(key: string): T | null {
  const raw = getStorageItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { removeStorageItem(key); return null }
}
export function setJsonStorageItem<T>(key: string, value: T) {
  setStorageItem(key, JSON.stringify(value))
}
