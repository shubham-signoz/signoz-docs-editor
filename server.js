import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  groupComponentsByCategory,
  parseSignozComponentRegistry,
} from './signoz-component-registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const DEFAULT_SIGNOZ_DIR = path.resolve(__dirname, '../signoz.io')
const SIGNOZ_DIR = process.env.SIGNOZ_DIR || DEFAULT_SIGNOZ_DIR
const DOCS_PATH = process.env.DOCS_PATH || 'data/docs'
const PORT = process.env.PORT || 3001

const docsRoot = path.join(SIGNOZ_DIR, DOCS_PATH)
const componentsDir = path.join(SIGNOZ_DIR, 'components')
const publicDir = path.join(SIGNOZ_DIR, 'public')

console.log(`SigNoz directory: ${SIGNOZ_DIR}`)
console.log(`Docs root: ${docsRoot}`)
console.log(`Components directory: ${componentsDir}`)
console.log(`Public directory: ${publicDir}`)

app.use('/img', express.static(path.join(publicDir, 'img')))
app.use('/svgs', express.static(path.join(publicDir, 'svgs')))

let discoveredComponents = []
async function discoverComponents() {
  console.log('Discovering components from MDXComponents.tsx...')

  try {
    const components = await parseSignozComponentRegistry(SIGNOZ_DIR)
    const grouped = groupComponentsByCategory(components)

    discoveredComponents = components
    console.log(`Discovered ${components.length} components in ${Object.keys(grouped).length} categories`)

    return { components, grouped }
  } catch (err) {
    console.error('Error discovering components:', err)
    return { components: [], grouped: {} }
  }
}

async function buildTree(dir, basePath = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nodes = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const children = await buildTree(fullPath, relativePath)
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
        })
      }
    } else if (entry.isFile() && /\.(mdx?|md)$/i.test(entry.name)) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      })
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function flattenTree(nodes, result = []) {
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ name: node.name, path: node.path })
    } else if (node.children) {
      flattenTree(node.children, result)
    }
  }
  return result
}

function isWithinRoot(rootPath, targetPath) {
  const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath))

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  )
}

function resolveImportedFilePath(sourcePath, importPath) {
  if (typeof importPath !== 'string' || importPath.length === 0) {
    return null
  }

  if (importPath.startsWith('@/')) {
    return path.resolve(SIGNOZ_DIR, importPath.slice(2))
  }

  if (importPath.startsWith('.')) {
    if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
      return null
    }

    return path.resolve(SIGNOZ_DIR, path.dirname(sourcePath), importPath)
  }

  return null
}

app.get('/api/config', (req, res) => {
  res.json({
    signozDir: SIGNOZ_DIR,
    docsPath: DOCS_PATH,
    docsRoot,
    componentsDir,
  })
})

app.get('/api/components', async (req, res) => {
  try {
    const result = await discoverComponents()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tree', async (req, res) => {
  try {
    const tree = await buildTree(docsRoot)
    res.json(tree)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/files', async (req, res) => {
  try {
    const tree = await buildTree(docsRoot)
    const files = flattenTree(tree)
    res.json(files)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/resolve-import', async (req, res) => {
  try {
    const importPath = req.query.importPath
    const sourcePath = typeof req.query.sourcePath === 'string' ? req.query.sourcePath : ''

    if (!importPath || typeof importPath !== 'string') {
      return res.status(400).json({ error: 'importPath is required' })
    }

    if (importPath.startsWith('.') && sourcePath.length === 0) {
      return res.status(400).json({ error: 'sourcePath is required for relative imports' })
    }

    const resolvedPath = resolveImportedFilePath(sourcePath, importPath)
    if (!resolvedPath) {
      return res.status(400).json({ error: 'Unsupported import path' })
    }

    if (!isWithinRoot(SIGNOZ_DIR, resolvedPath)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (!/\.mdx?$/i.test(resolvedPath)) {
      return res.status(400).json({ error: 'Only local .md and .mdx imports are supported' })
    }

    const content = await fs.readFile(resolvedPath, 'utf-8')

    res.json({
      path: path.relative(SIGNOZ_DIR, resolvedPath),
      content,
    })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Imported file not found' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

// GET /api/file - read a file
app.get('/api/file', async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    const resolvedPath = path.resolve(docsRoot, filePath)

    // Security: ensure path is within docsRoot
    if (!isWithinRoot(docsRoot, resolvedPath)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const content = await fs.readFile(resolvedPath, 'utf-8')
    res.json({ path: filePath, content })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

// PUT /api/file - write a file
app.put('/api/file', async (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    const resolvedPath = path.resolve(docsRoot, filePath)

    // Security: ensure path is within docsRoot
    if (!isWithinRoot(docsRoot, resolvedPath)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { content } = req.body
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' })
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
    await fs.writeFile(resolvedPath, content, 'utf-8')

    res.json({ success: true, path: filePath })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/component/:name - read a component source
app.get('/api/component/:name', async (req, res) => {
  try {
    const { name } = req.params
    const component = discoveredComponents.find(c => c.name === name)

    if (!component || !component.resolvedPath) {
      return res.status(404).json({ error: 'Component not found' })
    }

    // Try to find the component file
    let componentPath = path.join(componentsDir, component.resolvedPath)

    // Check if it's a directory with index file
    try {
      const stat = await fs.stat(componentPath)
      if (stat.isDirectory()) {
        // Try index.tsx, then ComponentName.tsx
        const indexPath = path.join(componentPath, 'index.tsx')
        const namedPath = path.join(componentPath, `${component.importName}.tsx`)

        try {
          await fs.access(indexPath)
          componentPath = indexPath
        } catch {
          componentPath = namedPath
        }
      }
    } catch {
      // Add .tsx extension if needed
      if (!componentPath.endsWith('.tsx')) {
        componentPath += '.tsx'
      }
    }

    const content = await fs.readFile(componentPath, 'utf-8')
    res.json({ name, path: componentPath, content })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Component file not found' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    signozDir: SIGNOZ_DIR,
    docsRoot,
    componentCount: discoveredComponents.length
  })
})

// Initialize: discover components on startup
discoverComponents().then(() => {
  app.listen(PORT, () => {
    console.log(`\nDoc Editor API server running on http://localhost:${PORT}`)
    console.log(`Components discovered: ${discoveredComponents.length}`)
  })
})
