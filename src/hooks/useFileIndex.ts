import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { parseFrontmatter, extractTitle } from '@/utils/frontmatter'

/**
 * Represents an indexed file item with metadata.
 */
export interface FileIndexItem {
  /** Relative path from the docs root */
  path: string
  /** File name without path */
  name: string
  /** Title extracted from frontmatter or first heading */
  title?: string
  /** Description from frontmatter */
  description?: string
  /** Tags from frontmatter */
  tags?: string[]
  /** Last modified timestamp (if available) */
  lastModified: number
  /** File extension (mdx or md) */
  extension: string
  /** Parent directory path */
  directory: string
}

/**
 * Options for the file index hook.
 */
export interface UseFileIndexOptions {
  /** File extensions to index (default: ['.mdx', '.md']) */
  extensions?: string[]
  /** Directories to exclude from indexing */
  excludeDirs?: string[]
  /** Maximum number of files to index (for performance) */
  maxFiles?: number
}

const DEFAULT_OPTIONS: Required<UseFileIndexOptions> = {
  extensions: ['.mdx', '.md'],
  excludeDirs: ['node_modules', '.git', '.next', 'dist', 'build'],
  maxFiles: 10000,
}

/**
 * Fuse.js options for fuzzy searching.
 */
const FUSE_OPTIONS: IFuseOptions<FileIndexItem> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'name', weight: 0.3 },
    { name: 'path', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

/**
 * Hook for indexing and searching documentation files.
 *
 * @param directoryHandle - The root directory handle from File System Access API
 * @param options - Configuration options for indexing
 * @returns Object containing indexed files, search function, and state
 *
 * @example
 * ```typescript
 * const { files, isIndexing, search, reindex } = useFileIndex(dirHandle)
 *
 * // Search for files
 * const results = search('getting started')
 *
 * // Trigger a reindex
 * reindex()
 * ```
 */
export function useFileIndex(
  directoryHandle: FileSystemDirectoryHandle | null,
  options: UseFileIndexOptions = {}
) {
  const [files, setFiles] = useState<FileIndexItem[]>([])
  const [isIndexing, setIsIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const opts = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options]
  )

  // Fuse instance for searching
  const fuseRef = useRef<Fuse<FileIndexItem> | null>(null)

  // Abort controller for cancelling indexing
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Check if a file should be included based on extension.
   */
  const shouldIncludeFile = useCallback(
    (filename: string): boolean => {
      return opts.extensions.some((ext) =>
        filename.toLowerCase().endsWith(ext)
      )
    },
    [opts.extensions]
  )

  /**
   * Check if a directory should be excluded.
   */
  const shouldExcludeDir = useCallback(
    (dirname: string): boolean => {
      return opts.excludeDirs.includes(dirname)
    },
    [opts.excludeDirs]
  )

  /**
   * Parse file metadata from content.
   */
  const parseFileMetadata = useCallback(
    async (
      fileHandle: FileSystemFileHandle,
      relativePath: string
    ): Promise<FileIndexItem | null> => {
      try {
        const file = await fileHandle.getFile()
        const content = await file.text()

        const { frontmatter } = parseFrontmatter(content)
        const title = extractTitle(content)

        const pathParts = relativePath.split('/')
        const name = pathParts.pop() || ''
        const directory = pathParts.join('/')
        const extension = name.includes('.')
          ? name.substring(name.lastIndexOf('.'))
          : ''

        return {
          path: relativePath,
          name,
          title,
          description: frontmatter.description as string | undefined,
          tags: Array.isArray(frontmatter.tags)
            ? (frontmatter.tags as string[])
            : undefined,
          lastModified: file.lastModified,
          extension,
          directory,
        }
      } catch (err) {
        console.warn(`Failed to parse file ${relativePath}:`, err)
        return null
      }
    },
    []
  )

  /**
   * Recursively scan a directory and collect file handles.
   */
  const scanDirectory = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      basePath: string,
      fileHandles: Array<{ handle: FileSystemFileHandle; path: string }>,
      signal: AbortSignal
    ): Promise<void> => {
      if (signal.aborted) return

      try {
        for await (const entry of dirHandle.values()) {
          if (signal.aborted) break

          if (entry.kind === 'directory') {
            if (!shouldExcludeDir(entry.name)) {
              const subDirHandle = await dirHandle.getDirectoryHandle(
                entry.name
              )
              const subPath = basePath ? `${basePath}/${entry.name}` : entry.name
              await scanDirectory(subDirHandle, subPath, fileHandles, signal)
            }
          } else if (entry.kind === 'file' && shouldIncludeFile(entry.name)) {
            if (fileHandles.length >= opts.maxFiles) {
              console.warn(`Max files limit reached (${opts.maxFiles})`)
              return
            }

            const fileHandle = await dirHandle.getFileHandle(entry.name)
            const filePath = basePath ? `${basePath}/${entry.name}` : entry.name
            fileHandles.push({ handle: fileHandle, path: filePath })
          }
        }
      } catch (err) {
        // Permission errors or other issues - continue with what we have
        console.warn(`Error scanning directory ${basePath}:`, err)
      }
    },
    [shouldExcludeDir, shouldIncludeFile, opts.maxFiles]
  )

  /**
   * Index all files in the directory.
   */
  const indexFiles = useCallback(async () => {
    console.log('indexFiles called, directoryHandle:', directoryHandle?.name)
    if (!directoryHandle) {
      setError('No directory handle provided')
      return
    }

    // Cancel any existing indexing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsIndexing(true)
    setError(null)
    setProgress({ current: 0, total: 0 })

    try {
      // Phase 1: Collect all file handles
      const fileHandles: Array<{
        handle: FileSystemFileHandle
        path: string
      }> = []

      await scanDirectory(
        directoryHandle,
        '',
        fileHandles,
        abortController.signal
      )

      console.log('useFileIndex: Found', fileHandles.length, 'files')

      if (abortController.signal.aborted) return

      setProgress({ current: 0, total: fileHandles.length })

      // Phase 2: Parse metadata from each file
      const indexedFiles: FileIndexItem[] = []

      // Process files in batches for better performance
      const batchSize = 50
      for (let i = 0; i < fileHandles.length; i += batchSize) {
        if (abortController.signal.aborted) break

        const batch = fileHandles.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(({ handle, path }) => parseFileMetadata(handle, path))
        )

        for (const result of batchResults) {
          if (result) {
            indexedFiles.push(result)
          }
        }

        setProgress({ current: Math.min(i + batchSize, fileHandles.length), total: fileHandles.length })
      }

      if (abortController.signal.aborted) return

      // Sort by last modified (most recent first)
      indexedFiles.sort((a, b) => b.lastModified - a.lastModified)

      // Build Fuse index
      fuseRef.current = new Fuse(indexedFiles, FUSE_OPTIONS)

      setFiles(indexedFiles)
    } catch (err) {
      if (!abortController.signal.aborted) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(`Failed to index files: ${message}`)
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsIndexing(false)
        abortControllerRef.current = null
      }
    }
  }, [directoryHandle, scanDirectory, parseFileMetadata])

  /**
   * Search for files using fuzzy matching.
   */
  const search = useCallback(
    (query: string): FileIndexItem[] => {
      if (!query.trim()) {
        return files
      }

      if (!fuseRef.current) {
        // Fallback to simple filtering if Fuse isn't initialized
        const lowerQuery = query.toLowerCase()
        return files.filter(
          (file) =>
            file.name.toLowerCase().includes(lowerQuery) ||
            file.title?.toLowerCase().includes(lowerQuery) ||
            file.path.toLowerCase().includes(lowerQuery)
        )
      }

      const results = fuseRef.current.search(query)
      return results.map((result) => result.item)
    },
    [files]
  )

  /**
   * Get files in a specific directory.
   */
  const getFilesInDirectory = useCallback(
    (directory: string): FileIndexItem[] => {
      return files.filter((file) => file.directory === directory)
    },
    [files]
  )

  /**
   * Get all unique directories.
   */
  const getDirectories = useCallback((): string[] => {
    const dirs = new Set<string>()
    for (const file of files) {
      if (file.directory) {
        dirs.add(file.directory)
        // Also add parent directories
        const parts = file.directory.split('/')
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join('/'))
        }
      }
    }
    return Array.from(dirs).sort()
  }, [files])

  /**
   * Cancel any ongoing indexing operation.
   */
  const cancelIndexing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsIndexing(false)
    }
  }, [])

  // Auto-index when directory handle changes
  useEffect(() => {
    console.log('useFileIndex: directoryHandle changed', directoryHandle?.name)
    if (directoryHandle) {
      console.log('useFileIndex: Starting indexing...')
      indexFiles()
    }

    return () => {
      cancelIndexing()
    }
  }, [directoryHandle, indexFiles, cancelIndexing])

  return {
    files,
    isIndexing,
    error,
    progress,
    reindex: indexFiles,
    search,
    getFilesInDirectory,
    getDirectories,
    cancelIndexing,
  }
}

/**
 * Hook for managing recent files in localStorage.
 */
export function useRecentFiles(storageKey = 'signoz-doc-editor-recent-files') {
  const [recentFiles, setRecentFiles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const maxRecentFiles = 10

  /**
   * Add a file to the recent files list.
   */
  const addRecentFile = useCallback(
    (filePath: string) => {
      setRecentFiles((prev) => {
        // Remove if already exists, then add to front
        const filtered = prev.filter((p) => p !== filePath)
        const updated = [filePath, ...filtered].slice(0, maxRecentFiles)

        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch {
          // Ignore localStorage errors
        }

        return updated
      })
    },
    [storageKey]
  )

  /**
   * Remove a file from the recent files list.
   */
  const removeRecentFile = useCallback(
    (filePath: string) => {
      setRecentFiles((prev) => {
        const updated = prev.filter((p) => p !== filePath)

        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch {
          // Ignore localStorage errors
        }

        return updated
      })
    },
    [storageKey]
  )

  /**
   * Clear all recent files.
   */
  const clearRecentFiles = useCallback(() => {
    setRecentFiles([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey])

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  }
}
