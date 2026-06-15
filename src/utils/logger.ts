import pc from 'picocolors'
export const info    = (msg: string) => console.log(pc.cyan(`  ${msg}`))
export const success = (msg: string) => console.log(pc.green(`✓ ${msg}`))
export const warn    = (msg: string) => console.log(pc.yellow(`⚠ ${msg}`))
export const error   = (msg: string) => console.error(pc.red(`✗ ${msg}`))
export const log     = (msg: string) => console.log(msg)
