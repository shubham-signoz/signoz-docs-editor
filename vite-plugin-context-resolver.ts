import { Plugin } from 'vite'
import * as path from 'path'
import * as fs from 'fs'

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

    resolveId(source, importer) {
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
      }

      return null
    },
  }
}
