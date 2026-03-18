import { promises as fs } from 'fs'
import path from 'path'

const SKIPPED_COMPONENT_KEYS = new Set(['a', 'pre', 'table'])

function toPosixPath(value) {
  return value.replace(/\\/g, '/')
}

function extractImports(source) {
  const imports = new Map()
  const importRegex = /import\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g
  let match = importRegex.exec(source)

  while (match) {
    const [, importName, importPath] = match
    imports.set(importName, importPath)
    match = importRegex.exec(source)
  }

  return imports
}

function extractComponentsObject(source) {
  const marker = 'export const components'
  const markerIndex = source.indexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  const objectStart = source.indexOf('{', markerIndex)
  if (objectStart === -1) {
    return null
  }

  let depth = 0
  for (let index = objectStart; index < source.length; index += 1) {
    const character = source[index]

    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return source.slice(objectStart + 1, index)
      }
    }
  }

  return null
}

function parseComponentEntries(objectBody) {
  const entries = []
  const entryRegex = /(?:(\w+)\s*:\s*)?(\w+)\s*,?/g
  let match = entryRegex.exec(objectBody)

  while (match) {
    const [, key, value] = match
    const componentName = key || value
    const importName = value

    if (
      componentName &&
      importName &&
      componentName.length > 1 &&
      !SKIPPED_COMPONENT_KEYS.has(componentName)
    ) {
      entries.push({ componentName, importName })
    }

    match = entryRegex.exec(objectBody)
  }

  return entries
}

function getCategory(importPath, resolvedPath) {
  if (!importPath) {
    return 'general'
  }

  if (importPath.startsWith('pliny/')) {
    return 'pliny'
  }

  if (resolvedPath) {
    const [category] = resolvedPath.split('/')
    return category || 'general'
  }

  return 'general'
}

export async function parseSignozComponentRegistry(signozDir) {
  const mdxComponentsPath = path.join(signozDir, 'components', 'MDXComponents.tsx')
  const content = await fs.readFile(mdxComponentsPath, 'utf-8')
  const imports = extractImports(content)
  const componentsObject = extractComponentsObject(content)

  if (!componentsObject) {
    return []
  }

  const components = parseComponentEntries(componentsObject).map(({ componentName, importName }) => {
    const importPath = imports.get(importName) || null
    const resolvedPath = importPath?.startsWith('./')
      ? toPosixPath(importPath.slice(2))
      : null

    return {
      name: componentName,
      exportName: componentName,
      importName,
      importPath,
      resolvedPath,
      category: getCategory(importPath, resolvedPath),
    }
  })

  return Array.from(
    new Map(components.map((component) => [component.name, component])).values()
  )
}

export function groupComponentsByCategory(components) {
  return components.reduce((groups, component) => {
    const category = component.category || 'general'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(component)
    return groups
  }, {})
}
