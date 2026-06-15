import { execa } from 'execa'
export async function run(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<void> {
  await execa(cmd, args, { cwd: opts.cwd, stdio: 'inherit' })
}
