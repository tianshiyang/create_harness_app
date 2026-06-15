import fse from 'fs-extra'
import path from 'node:path'

export async function copyDir(src: string, dest: string): Promise<void> {
  await fse.ensureDir(dest)
  await fse.copy(src, dest, { overwrite: true })
}
export async function readText(p: string): Promise<string> { return fse.readFile(p, 'utf-8') }
export async function writeText(p: string, content: string): Promise<void> {
  await fse.ensureDir(path.dirname(p))
  return fse.writeFile(p, content, 'utf-8')
}
export async function readJson(p: string): Promise<unknown> { return fse.readJson(p) }
export async function writeJson(p: string, data: unknown): Promise<void> {
  await fse.ensureDir(path.dirname(p))
  return fse.writeJson(p, data, { spaces: 2 })
}
