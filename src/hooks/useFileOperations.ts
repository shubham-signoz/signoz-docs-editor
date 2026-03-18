import { useState, useCallback, useRef } from 'react'

/**
 * File operation result type for error handling.
 */
export interface FileOperationResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * File handle cache entry for the File System Access API.
 */
interface FileHandleEntry {
  handle: FileSystemFileHandle
  lastAccessed: number
}

/**
 * Directory handle cache entry for the File System Access API.
 */
interface DirectoryHandleEntry {
  handle: FileSystemDirectoryHandle
  lastAccessed: number
}

/**
 * Check if the File System Access API is available.
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window &&
    'showDirectoryPicker' in window
  )
}

/**
 * Hook for file read/write operations.
 * Uses the File System Access API when available, with fallback approaches.
 *
 * @returns Object containing file operation methods and state
 *
 * @example
 * ```typescript
 * const { readFile, writeFile, fileExists, isSupported } = useFileOperations()
 *
 * // Read a file
 * const content = await readFile('/path/to/doc.mdx')
 *
 * // Write to a file
 * await writeFile('/path/to/doc.mdx', updatedContent)
 * ```
 */
export function useFileOperations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache for file handles to avoid re-requesting permissions
  const fileHandleCache = useRef<Map<string, FileHandleEntry>>(new Map())
  const directoryHandleCache = useRef<Map<string, DirectoryHandleEntry>>(
    new Map()
  )

  // Root directory handle for the docs folder
  const rootDirectoryHandle = useRef<FileSystemDirectoryHandle | null>(null)

  /**
   * Set the root directory for file operations.
   * This should be called after the user grants directory access.
   */
  const setRootDirectory = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      console.log('setRootDirectory called with:', handle.name)
      rootDirectoryHandle.current = handle
      directoryHandleCache.current.clear()
      fileHandleCache.current.clear()
    },
    []
  )

  /**
   * Request directory access from the user using the File System Access API.
   */
  const requestDirectoryAccess =
    useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
      if (!isFileSystemAccessSupported()) {
        setError('File System Access API is not supported in this browser')
        return null
      }

      try {
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite',
        })
        await setRootDirectory(handle)
        return handle
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // User cancelled the picker
            return null
          }
          setError(`Failed to get directory access: ${err.message}`)
        }
        return null
      }
    }, [setRootDirectory])

  /**
   * Get a file handle from a path relative to the root directory.
   */
  const getFileHandle = useCallback(
    async (
      relativePath: string,
      create = false
    ): Promise<FileSystemFileHandle | null> => {
      console.log('getFileHandle called:', relativePath, 'root:', rootDirectoryHandle.current?.name)
      if (!rootDirectoryHandle.current) {
        console.error('No root directory set!')
        setError('No root directory set. Call requestDirectoryAccess first.')
        return null
      }

      // Check cache first
      const cached = fileHandleCache.current.get(relativePath)
      if (cached) {
        cached.lastAccessed = Date.now()
        return cached.handle
      }

      try {
        // Navigate to the file through directories
        const parts = relativePath.split('/').filter(Boolean)
        const fileName = parts.pop()

        if (!fileName) {
          setError('Invalid file path')
          return null
        }

        let currentDir = rootDirectoryHandle.current

        // Navigate through subdirectories
        for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, {
            create,
          })
        }

        // Get the file handle
        const fileHandle = await currentDir.getFileHandle(fileName, { create })

        // Cache the handle
        fileHandleCache.current.set(relativePath, {
          handle: fileHandle,
          lastAccessed: Date.now(),
        })

        return fileHandle
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotFoundError') {
            return null
          }
          setError(`Failed to access file: ${err.message}`)
        }
        return null
      }
    },
    []
  )

  /**
   * Read a file's contents.
   *
   * @param relativePath - Path relative to the root directory
   * @returns The file contents as a string, or null if failed
   */
  const readFile = useCallback(
    async (relativePath: string): Promise<string | null> => {
      console.log('readFile called:', relativePath)
      console.log('rootDirectoryHandle:', rootDirectoryHandle.current?.name)

      setIsLoading(true)
      setError(null)

      try {
        const fileHandle = await getFileHandle(relativePath)
        console.log('fileHandle result:', fileHandle?.name)

        if (!fileHandle) {
          setError(`File not found: ${relativePath}`)
          console.error('File not found:', relativePath)
          return null
        }

        const file = await fileHandle.getFile()
        const content = await file.text()
        console.log('File read successfully, length:', content.length)

        return content
      } catch (err) {
        console.error('Error reading file:', err)
        if (err instanceof Error) {
          setError(`Failed to read file: ${err.message}`)
        }
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [getFileHandle]
  )

  /**
   * Write content to a file.
   *
   * @param relativePath - Path relative to the root directory
   * @param content - The content to write
   * @returns True if successful, false otherwise
   */
  const writeFile = useCallback(
    async (relativePath: string, content: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const fileHandle = await getFileHandle(relativePath, true)

        if (!fileHandle) {
          setError(`Could not create file: ${relativePath}`)
          return false
        }

        // Create a writable stream and write the content
        const writable = await fileHandle.createWritable()
        await writable.write(content)
        await writable.close()

        return true
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to write file: ${err.message}`)
        }
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getFileHandle]
  )

  /**
   * Check if a file exists.
   *
   * @param relativePath - Path relative to the root directory
   * @returns True if the file exists, false otherwise
   */
  const fileExists = useCallback(
    async (relativePath: string): Promise<boolean> => {
      const fileHandle = await getFileHandle(relativePath)
      return fileHandle !== null
    },
    [getFileHandle]
  )

  /**
   * Get a directory handle from a path relative to the root directory.
   */
  const getDirectoryHandle = useCallback(
    async (
      relativePath: string,
      create = false
    ): Promise<FileSystemDirectoryHandle | null> => {
      if (!rootDirectoryHandle.current) {
        setError('No root directory set. Call requestDirectoryAccess first.')
        return null
      }

      if (!relativePath || relativePath === '.') {
        return rootDirectoryHandle.current
      }

      // Check cache first
      const cached = directoryHandleCache.current.get(relativePath)
      if (cached) {
        cached.lastAccessed = Date.now()
        return cached.handle
      }

      try {
        const parts = relativePath.split('/').filter(Boolean)
        let currentDir = rootDirectoryHandle.current

        for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, { create })
        }

        // Cache the handle
        directoryHandleCache.current.set(relativePath, {
          handle: currentDir,
          lastAccessed: Date.now(),
        })

        return currentDir
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotFoundError') {
            return null
          }
          setError(`Failed to access directory: ${err.message}`)
        }
        return null
      }
    },
    []
  )

  /**
   * List files in a directory.
   *
   * @param relativePath - Path relative to the root directory
   * @returns Array of file/directory names, or null if failed
   */
  const listDirectory = useCallback(
    async (
      relativePath: string
    ): Promise<Array<{ name: string; kind: 'file' | 'directory' }> | null> => {
      const dirHandle = await getDirectoryHandle(relativePath)

      if (!dirHandle) {
        return null
      }

      try {
        const entries: Array<{ name: string; kind: 'file' | 'directory' }> = []

        for await (const entry of dirHandle.values()) {
          entries.push({
            name: entry.name,
            kind: entry.kind,
          })
        }

        return entries
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to list directory: ${err.message}`)
        }
        return null
      }
    },
    [getDirectoryHandle]
  )

  /**
   * Clear the handle caches. Useful when permissions may have changed.
   */
  const clearCache = useCallback(() => {
    fileHandleCache.current.clear()
    directoryHandleCache.current.clear()
  }, [])

  /**
   * Check if we have an active root directory.
   */
  const hasRootDirectory = rootDirectoryHandle.current !== null

  return {
    // State
    isLoading,
    error,
    isSupported: isFileSystemAccessSupported(),
    hasRootDirectory,

    // Directory operations
    requestDirectoryAccess,
    setRootDirectory,
    listDirectory,

    // File operations
    readFile,
    writeFile,
    fileExists,

    // Utilities
    clearCache,
    clearError: () => setError(null),
  }
}

/**
 * Fallback hook for environments without File System Access API.
 * Uses input elements and download links for file operations.
 */
export function useFileOperationsFallback() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Read a file using a file input element.
   * Returns a promise that resolves when the user selects a file.
   */
  const readFileWithPicker = useCallback(
    async (accept = '.mdx,.md'): Promise<{ name: string; content: string } | null> => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = accept

        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (!file) {
            resolve(null)
            return
          }

          setIsLoading(true)
          try {
            const content = await file.text()
            resolve({ name: file.name, content })
          } catch (err) {
            if (err instanceof Error) {
              setError(`Failed to read file: ${err.message}`)
            }
            resolve(null)
          } finally {
            setIsLoading(false)
          }
        }

        input.oncancel = () => resolve(null)
        input.click()
      })
    },
    []
  )

  /**
   * Save content to a file using a download link.
   */
  const saveFileWithDownload = useCallback(
    (filename: string, content: string, mimeType = 'text/markdown') => {
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()

      URL.revokeObjectURL(url)
    },
    []
  )

  return {
    isLoading,
    error,
    isSupported: false,
    readFileWithPicker,
    saveFileWithDownload,
    clearError: () => setError(null),
  }
}
