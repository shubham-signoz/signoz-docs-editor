import { useState, useEffect, useCallback, memo } from 'react'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface FileTreeProps {
  rootHandle: FileSystemDirectoryHandle | null
  selectedPath: string | null
  onSelectFile: (path: string) => void
  extensions?: string[]
  isLoading?: boolean
}

async function buildFileTree(
  handle: FileSystemDirectoryHandle,
  basePath: string = '',
  extensions: string[] = ['.mdx', '.md']
): Promise<FileNode[]> {
  const nodes: FileNode[] = []

  for await (const entry of handle.values()) {
    const path = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.kind === 'directory') {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }

      const dirHandle = await handle.getDirectoryHandle(entry.name)
      const children = await buildFileTree(dirHandle, path, extensions)

      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path,
          type: 'directory',
          children,
        })
      }
    } else if (entry.kind === 'file') {
      const hasValidExt = extensions.some(ext => entry.name.endsWith(ext))
      if (hasValidExt) {
        nodes.push({
          name: entry.name,
          path,
          type: 'file',
        })
      }
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
}: {
  node: FileNode
  depth: number
  selectedPath: string | null
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isFile = node.type === 'file'

  const handleClick = () => {
    if (isFile) {
      onSelect(node.path)
    } else {
      onToggle(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full text-left px-2 py-1 flex items-center gap-1.5
          hover:bg-signoz-bg-surface transition-colors text-sm
          ${isSelected ? 'bg-signoz-primary bg-opacity-20 text-signoz-text-primary' : 'text-signoz-text-secondary'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {!isFile && (
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {isFile ? (
          <svg
            className={`w-4 h-4 flex-shrink-0 ${
              node.name.endsWith('.mdx') ? 'text-purple-400' : 'text-signoz-text-muted'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 flex-shrink-0 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isExpanded
                ? "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                : "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              }
            />
          </svg>
        )}

        <span className="truncate">{node.name}</span>
      </button>

      {!isFile && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export function FileTree({
  rootHandle,
  selectedPath,
  onSelectFile,
  extensions = ['.mdx', '.md'],
  isLoading = false,
}: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rootHandle) {
      setTree([])
      return
    }

    const handle = rootHandle
    let cancelled = false

    async function build() {
      setIsBuilding(true)
      setError(null)
      try {
        const nodes = await buildFileTree(handle, '', extensions)
        if (cancelled) {
          return
        }
        setTree(nodes)

        const firstLevel = new Set(nodes.filter(n => n.type === 'directory').map(n => n.path))
        setExpandedPaths(firstLevel)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to build file tree')
        }
      } finally {
        if (!cancelled) {
          setIsBuilding(false)
        }
      }
    }

    build()

    return () => {
      cancelled = true
    }
  }, [rootHandle, extensions])

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (selectedPath) {
      const parts = selectedPath.split('/')
      const paths = parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
      setExpandedPaths(prev => {
        const next = new Set(prev)
        paths.forEach(p => next.add(p))
        return next
      })
    }
  }, [selectedPath])

  if (isLoading || isBuilding) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-signoz-text-muted">
          <div className="w-5 h-5 border-2 border-signoz-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading files...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
        </div>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-signoz-text-muted">
          <p className="text-sm">No documentation files found</p>
          <p className="text-xs mt-1">Looking for {extensions.join(', ')} files</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto py-2">
      {tree.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
          onSelect={onSelectFile}
        />
      ))}
    </div>
  )
}

export default FileTree
