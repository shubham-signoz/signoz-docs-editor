import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface ComponentInfo {
  name: string
  importName: string
  importPath: string | null
  resolvedPath: string | null
  category: string
}

export interface ApiConfig {
  signozDir: string
  docsPath: string
  docsRoot: string
  componentsDir: string
}

/**
 * Hook for interacting with the doc-editor API server.
 */
export function useApi() {
  const [config, setConfig] = useState<ApiConfig | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])
  const [components, setComponents] = useState<ComponentInfo[]>([])
  const [groupedComponents, setGroupedComponents] = useState<Record<string, ComponentInfo[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`${API_BASE}/config`)
        if (!res.ok) throw new Error('Failed to fetch config')
        const data = await res.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server')
      }
    }
    fetchConfig()
  }, [])

  // Fetch components on mount
  useEffect(() => {
    async function fetchComponents() {
      try {
        const res = await fetch(`${API_BASE}/components`)
        if (!res.ok) throw new Error('Failed to fetch components')
        const data = await res.json()
        setComponents(data.components || [])
        setGroupedComponents(data.grouped || {})
      } catch (err) {
        console.error('Error fetching components:', err)
      }
    }
    fetchComponents()
  }, [])

  // Fetch file tree
  const fetchTree = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tree`)
      if (!res.ok) throw new Error('Failed to fetch file tree')
      const data = await res.json()
      setTree(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch tree when config is loaded
  useEffect(() => {
    if (config) {
      fetchTree()
    }
  }, [config, fetchTree])

  // Read a file
  const readFile = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(filePath)}`)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Failed to read file')
      }
      const data = await res.json()
      return data.content
    } catch (err) {
      console.error('Error reading file:', err)
      return null
    }
  }, [])

  // Write a file
  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to write file')
      return true
    } catch (err) {
      console.error('Error writing file:', err)
      return false
    }
  }, [])

  // Get flat file list for search
  const getFileList = useCallback(async (): Promise<{ name: string; path: string }[]> => {
    try {
      const res = await fetch(`${API_BASE}/files`)
      if (!res.ok) throw new Error('Failed to fetch files')
      return await res.json()
    } catch (err) {
      console.error('Error fetching file list:', err)
      return []
    }
  }, [])

  return {
    config,
    tree,
    components,
    groupedComponents,
    isLoading,
    error,
    readFile,
    writeFile,
    refreshTree: fetchTree,
    getFileList,
  }
}
