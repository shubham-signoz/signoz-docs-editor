#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, '..')
const signozDir = process.env.SIGNOZ_DIR || process.cwd()
const viteApiBase = process.env.VITE_API_BASE || '/api'
const viteConfigPath = path.join(packageRoot, 'vite.config.ts')
const serverScript = path.join(packageRoot, 'server.js')

// Verify we're in a signoz.io project with dependencies installed
if (!existsSync(path.join(signozDir, 'package.json'))) {
  console.error(`[error] No package.json found in ${signozDir}`)
  console.error('        Run this command from the root of your signoz.io project.')
  process.exit(1)
}

if (!existsSync(path.join(signozDir, 'node_modules'))) {
  console.error(`[error] node_modules not found in ${signozDir}`)
  console.error('        Run "npm install" in your signoz.io project first.')
  process.exit(1)
}
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const viteBinLookupRoots = [
  packageRoot,
  path.dirname(packageRoot),
  path.resolve(packageRoot, '..', '..'),
]

function buildViteBinCandidates() {
  // Always prefer the .js entry point — it works cross-platform via node
  // and avoids the Windows EINVAL error when spawning .cmd batch scripts
  return Array.from(new Set(viteBinLookupRoots.flatMap((lookupRoot) => {
    return [
      path.join(lookupRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      path.join(lookupRoot, 'vite', 'bin', 'vite.js'),
    ]
  })))
}

function getViteLauncher() {
  const viteBinCandidates = buildViteBinCandidates()

  for (const bin of viteBinCandidates) {
    if (existsSync(bin)) {
      return {
        command: process.execPath,
        args: [bin, 'dev', '--config', viteConfigPath, ...process.argv.slice(2)],
      }
    }
  }

  // Fallback: use npx with shell:true for Windows .cmd compatibility
  return {
    command: npxCommand,
    args: ['--yes', 'vite', 'dev', '--config', viteConfigPath, ...process.argv.slice(2)],
    fallback: true,
    shell: true,
  }
}

const baseEnv = {
  ...process.env,
  SIGNOZ_DIR: signozDir,
  VITE_API_BASE: viteApiBase,
}
const viteLauncher = getViteLauncher()

if (viteLauncher.fallback) {
  console.warn('[warn] Local vite binary was not found in this package. Falling back to `npx vite`.')
}

const server = spawn(process.execPath, [serverScript], {
  cwd: packageRoot,
  env: baseEnv,
  stdio: 'inherit',
})

const vite = spawn(viteLauncher.command, viteLauncher.args, {
  cwd: packageRoot,
  env: baseEnv,
  stdio: 'inherit',
  ...(viteLauncher.shell ? { shell: true } : {}),
})

const children = [server, vite]
let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  children.forEach(child => {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  })
  process.exit(code)
}

children.forEach(child => {
  child.on('error', err => {
    console.error(`[error] ${err.message}`)
    shutdown(1)
  })

  child.on('close', code => {
    if (shuttingDown) {
      return
    }
    shutdown(code || 0)
  })
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
