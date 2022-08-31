/**
 * 命令执行模块
 * @author: sunkeysun
 */
import { type Options as ExecaOptions, execa } from 'execa'
import { cwd as envCwd } from './env.js'

export interface Output {
  status?: 'data' | 'error'
  output?: Buffer | string
}

type SupportedExecaOptions = 'cwd' | 'timeout' | 'env' | 'stdio'

export interface Options extends Pick<ExecaOptions, SupportedExecaOptions> {
  pipeline?: 'stdout' | 'stderr'
  pipe?: (buf: Buffer) => Output 
}

export async function exec(bin: string, args: string[], options: Options = {}) {
  const {
    cwd = envCwd,
    stdio = 'pipe',
    timeout,
    env,
    pipeline = 'stdout',
    pipe = (buf) => ({ status: 'data', output: buf }),
  } = options

  const child = execa(bin, args, { cwd, stdio, timeout, env })
  if (stdio !== 'pipe') {
    return child
  }
  return new Promise((resolve, reject) => {
    child[pipeline]?.on('data', (buf) => {
      const { status, output = '' } = pipe(buf)
      switch (status) {
        case 'data':
          process[pipeline].write(output)
          break
        case 'error':
          child.kill()
          reject(output.toString())
          break
      }
    })
    child[pipeline]?.on('end', () => resolve(null))
    child.catch((err) => reject(err))
  })
}
