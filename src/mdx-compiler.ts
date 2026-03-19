import { evaluate } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import { createElement, Fragment, ReactElement } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const IMPORT_STATEMENT_REGEX = /^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/
const EXPORT_STATEMENT_REGEX = /^export\s+.+$/
const LOCAL_MDX_IMPORT_REGEX = /\.mdx?$/i
const LEADING_FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export interface CompilationResult {
  content: ReactElement | null
  error: string | null
}

interface ResolvedImportSource {
  path: string
  content: string
}

interface ExtractedFrontmatter {
  frontmatter: Record<string, string>
  content: string
}

interface CompileMDXOptions {
  signal?: AbortSignal
}

const resolvedImportCache = new Map<string, Promise<ResolvedImportSource | null>>()

function isLocalMdxImport(importPath: string): boolean {
  return (
    LOCAL_MDX_IMPORT_REGEX.test(importPath) &&
    (importPath.startsWith('@/') || importPath.startsWith('.'))
  )
}

function extractDefaultImportName(importClause: string): string | null {
  const match = importClause.trim().match(/^([A-Za-z_$][\w$]*)/)
  return match?.[1] ?? null
}

function replaceImportedComponentUsage(
  source: string,
  componentName: string,
  replacement: string
): string {
  const selfClosingTag = new RegExp(`<${componentName}(?:\\s[^>]*)?\\s*/>`, 'g')
  const wrappedTag = new RegExp(`<${componentName}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${componentName}>`, 'g')

  return source
    .replace(wrappedTag, `\n${replacement}\n`)
    .replace(selfClosingTag, `\n${replacement}\n`)
}

function normalizeFrontmatterSource(source: string): string {
  return source.replace(/^\uFEFF?(?:\r?\n)*/, '')
}

function stripWrappingQuotes(value: string): string {
  const trimmedValue = value.trim()

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1)
  }

  return trimmedValue
}

function extractLeadingFrontmatter(source: string): ExtractedFrontmatter {
  const normalizedSource = normalizeFrontmatterSource(source)
  const frontmatterMatch = normalizedSource.match(LEADING_FRONTMATTER_REGEX)

  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      content: normalizedSource,
    }
  }

  const rawFrontmatter = frontmatterMatch[1] ?? ''
  const content = normalizedSource.slice(frontmatterMatch[0].length)
  const frontmatter: Record<string, string> = {}

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.+?)\s*$/)
    if (!fieldMatch) {
      continue
    }

    const key = fieldMatch[1]
    const value = fieldMatch[2]
    if (key && value !== undefined) {
      frontmatter[key] = stripWrappingQuotes(value)
    }
  }

  return {
    frontmatter,
    content,
  }
}

function injectFrontmatterTitleIfMissing(
  content: string,
  frontmatter: Record<string, unknown>
): string {
  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : ''
  if (!title) {
    return content
  }

  if (/^\s*#\s+/.test(content)) {
    return content
  }

  const trimmedContent = content.trimStart()
  return trimmedContent
    ? `# ${title}\n\n${trimmedContent}`
    : `# ${title}`
}

async function loadImportedSource(
  sourcePath: string,
  importPath: string,
  options?: CompileMDXOptions
): Promise<ResolvedImportSource | null> {
  const cacheKey = `${sourcePath}::${importPath}`
  if (!options?.signal) {
    const cachedRequest = resolvedImportCache.get(cacheKey)
    if (cachedRequest) {
      return cachedRequest
    }
  }

  const request = (async () => {
    try {
      const response = await fetch(
        `${API_BASE}/resolve-import?sourcePath=${encodeURIComponent(sourcePath)}&importPath=${encodeURIComponent(importPath)}`,
        { signal: options?.signal }
      )

      if (!response.ok) {
        resolvedImportCache.delete(cacheKey)
        return null
      }

      return response.json() as Promise<ResolvedImportSource>
    } catch {
      resolvedImportCache.delete(cacheKey)
      return null
    }
  })()

  if (!options?.signal) {
    resolvedImportCache.set(cacheKey, request)
  }
  return request
}

async function preprocessMDXSource(
  source: string,
  sourcePath?: string,
  seenPaths: Set<string> = new Set(),
  options?: CompileMDXOptions
): Promise<{ source: string; importedComponentNames: string[] }> {
  const { frontmatter, content } = extractLeadingFrontmatter(source)
  const renderableContent = injectFrontmatterTitleIfMissing(content, frontmatter)
  const lines = renderableContent.split('\n')
  const transformedLines: string[] = []
  const localImportPromises: Array<Promise<{ name: string; source: string } | null>> = []
  const importedComponentNames = new Set<string>()
  let inCodeFence = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('```')) {
      inCodeFence = !inCodeFence
      transformedLines.push(line)
      continue
    }

    if (!inCodeFence) {
      const importMatch = trimmedLine.match(IMPORT_STATEMENT_REGEX)
      if (importMatch) {
        const importClause = importMatch[1] ?? ''
        const importPath = importMatch[2] ?? ''
        const importName = extractDefaultImportName(importClause)

        if (importName) {
          importedComponentNames.add(importName)
        }

        if (sourcePath && importName && isLocalMdxImport(importPath)) {
          localImportPromises.push((async () => {
            const resolvedImport = await loadImportedSource(sourcePath, importPath, options)
            if (!resolvedImport || seenPaths.has(resolvedImport.path)) {
              return null
            }

            const nestedSeenPaths = new Set(seenPaths)
            nestedSeenPaths.add(resolvedImport.path)

            const nestedResult = await preprocessMDXSource(
              resolvedImport.content,
              resolvedImport.path,
              nestedSeenPaths,
              options
            )

            return {
              name: importName,
              source: nestedResult.source,
            }
          })())
        }

        continue
      }

      if (EXPORT_STATEMENT_REGEX.test(trimmedLine)) {
        continue
      }
    }

    transformedLines.push(line)
  }

  let transformedSource = transformedLines.join('\n')
  const resolvedImports = await Promise.all(localImportPromises)

  for (const resolvedImport of resolvedImports) {
    if (!resolvedImport) {
      continue
    }

    transformedSource = replaceImportedComponentUsage(
      transformedSource,
      resolvedImport.name,
      resolvedImport.source
    )
  }

  return {
    source: transformedSource,
    importedComponentNames: Array.from(importedComponentNames),
  }
}

export async function compileMDX(
  source: string,
  components: Record<string, React.ComponentType<unknown>> = {},
  sourcePath?: string,
  options?: CompileMDXOptions
): Promise<CompilationResult> {
  if (!source || source.trim() === '') {
    return {
      content: null,
      error: null,
    }
  }

  try {
    const preprocessed = await preprocessMDXSource(source, sourcePath, new Set(), options)
    const compatibilityComponents = { ...components }

    for (const componentName of preprocessed.importedComponentNames) {
      if (!(componentName in compatibilityComponents)) {
        compatibilityComponents[componentName] = () => null
      }
    }

    const { default: MDXContent } = await evaluate(preprocessed.source, {
      Fragment,
      jsx: jsxRuntime.jsx,
      jsxs: jsxRuntime.jsxs,
      development: false,
    })

    const content = createElement(MDXContent, { components: compatibilityComponents })

    return {
      content,
      error: null,
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err
    }

    const error = err instanceof Error
      ? formatCompilationError(err)
      : 'Unknown compilation error'

    return {
      content: null,
      error,
    }
  }
}

function formatCompilationError(error: Error): string {
  const message = error.message

  const errorWithPosition = error as Error & {
    line?: number
    column?: number
    position?: { start?: { line?: number; column?: number } }
  }

  let location = ''
  if (errorWithPosition.line && errorWithPosition.column) {
    location = ` (line ${errorWithPosition.line}, column ${errorWithPosition.column})`
  } else if (errorWithPosition.position?.start) {
    const { line, column } = errorWithPosition.position.start
    if (line && column) {
      location = ` (line ${line}, column ${column})`
    }
  }

  let cleanMessage = message
    .replace(/^Could not parse expression with acorn: /, 'Syntax error: ')
    .replace(/^Could not parse import\/exports with acorn: /, 'Import/export error: ')

  return `${cleanMessage}${location}`
}

export function isValidComponent(value: unknown): value is React.ComponentType {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  )
}
