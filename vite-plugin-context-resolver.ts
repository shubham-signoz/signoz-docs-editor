import { Plugin } from 'vite'
import * as path from 'path'
import * as fs from 'fs'
import { createRequire, builtinModules } from 'node:module'

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
])

/**
 * Vite plugin that resolves @/ imports based on the importer's context.
 * - Files from signoz.io directory resolve @/ to signoz.io paths
 * - Files from doc-editor directory resolve @/ to doc-editor/src paths
 */
export function contextAwareResolver(signozDir: string, localSrcDir: string): Plugin {
  const signozDirNormalized = path.normalize(signozDir)
  const localSrcNormalized = path.normalize(localSrcDir)
  const allowedImageDomainsShim = path.join(
    localSrcNormalized,
    'shims',
    'signoz-allowed-image-domains.ts'
  )

  // Check if a package is resolvable from doc-editor's own context.
  // If so, Vite's pre-bundler already handles it — no need to fallback to signoz.io.
  const localRequire = createRequire(path.join(path.dirname(localSrcDir), 'package.json'))

  function isAvailableLocally(source: string): boolean {
    try {
      localRequire.resolve(source)
      return true
    } catch {
      return false
    }
  }

  const signozAliases: Record<string, string> = {
    '@/components': path.join(signozDir, 'components'),
    '@/constants': path.join(signozDir, 'constants'),
    '@/hooks': path.join(signozDir, 'hooks'),
    '@/app': path.join(signozDir, 'app'),
    '@/lib': path.join(signozDir, 'app/lib'),
    '@/layouts': path.join(signozDir, 'layouts'),
    '@/data': path.join(signozDir, 'data'),
    '@/css': path.join(signozDir, 'css'),
    '@/plugins': path.join(signozDir, 'plugins'),
  }

  const bareAliases: Record<string, string> = {
    hooks: path.join(signozDir, 'hooks'),
    'app/lib': path.join(signozDir, 'app/lib'),
    layouts: path.join(signozDir, 'layouts'),
    data: path.join(signozDir, 'data'),
    constants: path.join(signozDir, 'constants'),
  }

  function isSignozFile(filePath: string): boolean {
    const normalized = path.normalize(filePath)
    return normalized.startsWith(signozDirNormalized)
      && !normalized.includes('node_modules')
      && !normalized.startsWith(localSrcNormalized)
  }

  function tryResolve(basePath: string, importPath: string): string | null {
    const fullBasePath = path.join(basePath, importPath)

    const fileExtensions = ['.ts', '.tsx', '.js', '.jsx']
    for (const ext of fileExtensions) {
      const fullPath = fullBasePath + ext
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return fullPath
      }
    }

    if (fs.existsSync(fullBasePath) && fs.statSync(fullBasePath).isDirectory()) {
      const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx']
      for (const ext of indexExtensions) {
        const fullPath = fullBasePath + ext
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return fullPath
        }
      }
    }

    return null
  }

  return {
    name: 'context-aware-resolver',
    enforce: 'pre',

    async resolveId(source, importer, options) {
      if (!importer) return null

      if (
        isSignozFile(importer) &&
        source === '@/constants/allowedImageDomains'
      ) {
        return allowedImageDomainsShim
      }

      if (source.startsWith('@/')) {
        if (isSignozFile(importer)) {
          for (const [alias, targetDir] of Object.entries(signozAliases)) {
            if (source.startsWith(alias)) {
              const rest = source.slice(alias.length)
              const resolved = tryResolve(targetDir, rest)
              if (resolved) return resolved
            }
          }

          const rest = source.slice(2)
          const resolved = tryResolve(signozDir, '/' + rest)
          if (resolved) return resolved
        } else {
          const rest = source.slice(2)
          const resolved = tryResolve(localSrcNormalized, '/' + rest)
          if (resolved) return resolved
        }
      }

      if (isSignozFile(importer)) {
        for (const [alias, targetDir] of Object.entries(bareAliases)) {
          if (source === alias || source.startsWith(alias + '/')) {
            const rest = source.slice(alias.length)
            const resolved = tryResolve(targetDir, rest)
            if (resolved) return resolved
          }
        }

        // Fallback: for bare imports not found in doc-editor's node_modules,
        // re-resolve from a fake importer inside signoz.io so Vite's internal
        // resolver searches signoz.io's node_modules and properly pre-bundles CJS deps
        if (
          !source.startsWith('.') &&
          !source.startsWith('/') &&
          !nodeBuiltins.has(source) &&
          !isAvailableLocally(source)
        ) {
          const fakeImporter = path.join(signozDir, '__resolve_stub__.js')
          const result = await this.resolve(source, fakeImporter, { ...options, skipSelf: true })
          if (result) return result
        }
      }

      return null
    },
  }
}
