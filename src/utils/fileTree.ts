import type { FileNode } from '@/hooks/useApi'

export interface FlatFileNode {
  name: string
  path: string
}

export function flattenFileTree(nodes: FileNode[]): FlatFileNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'file') {
      return [{ name: node.name, path: node.path }]
    }

    return node.children ? flattenFileTree(node.children) : []
  })
}

export function getAncestorPaths(filePath: string): string[] {
  const parts = filePath.split('/').filter(Boolean)

  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join('/'))
}

export function treeContainsPath(nodes: FileNode[], targetPath: string): boolean {
  return nodes.some((node) => {
    if (node.path === targetPath) {
      return true
    }

    if (node.type === 'directory' && node.children) {
      return treeContainsPath(node.children, targetPath)
    }

    return false
  })
}
