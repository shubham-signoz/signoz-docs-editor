import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { FileIndexItem } from '@/hooks/useFileIndex'

/**
 * Props for the FilePicker component.
 */
export interface FilePickerProps {
  /** Whether the picker modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Callback when a file is selected */
  onSelectFile: (path: string) => void
  /** List of indexed files to search through */
  files: FileIndexItem[]
  /** List of recently opened files */
  recentFiles?: string[]
  /** Whether the file index is still loading */
  isLoading?: boolean
  /** Placeholder text for the search input */
  placeholder?: string
}

/**
 * Fuse.js options for fuzzy file search.
 */
const FUSE_OPTIONS: IFuseOptions<FileIndexItem> = {
  keys: [
    { name: 'title', weight: 0.35 },
    { name: 'name', weight: 0.3 },
    { name: 'path', weight: 0.25 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
}

/**
 * File item display component.
 */
function FileItem({
  file,
  isSelected,
  isRecent,
  onClick,
  onMouseEnter,
}: {
  file: FileIndexItem
  isSelected: boolean
  isRecent?: boolean
  onClick: () => void
  onMouseEnter: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
        isSelected
          ? 'bg-signoz-primary bg-opacity-20'
          : 'hover:bg-signoz-bg-elevated'
      }`}
    >
      {/* File icon */}
      <div className="flex-shrink-0 mt-0.5">
        <svg
          className={`w-4 h-4 ${
            file.extension === '.mdx'
              ? 'text-purple-400'
              : 'text-signoz-text-muted'
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
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-signoz-text-primary truncate">
            {file.name}
          </span>
          {isRecent && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-signoz-bg-surface rounded text-signoz-text-muted">
              Recent
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-signoz-text-muted truncate">
          <span>{file.directory || '.'}</span>
          {file.title && file.title !== file.name && (
            <>
              <span>·</span>
              <span className="text-signoz-text-secondary truncate">{file.title}</span>
            </>
          )}
        </div>
      </div>

      {/* Keyboard hint when selected */}
      {isSelected && (
        <div className="flex-shrink-0 text-xs text-signoz-text-muted">
          Enter
        </div>
      )}
    </button>
  )
}

/**
 * Section header for grouping files.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-signoz-text-muted uppercase tracking-wider bg-signoz-bg-ink sticky top-0">
      {title}
    </div>
  )
}

/**
 * Empty state when no files match the search.
 */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <svg
        className="w-12 h-12 mx-auto text-signoz-text-muted mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-signoz-text-secondary">
        No files found for "{query}"
      </p>
      <p className="text-xs text-signoz-text-muted mt-1">
        Try a different search term
      </p>
    </div>
  )
}

/**
 * Loading state while indexing files.
 */
function LoadingState() {
  return (
    <div className="px-4 py-8 text-center">
      <div className="w-8 h-8 mx-auto mb-3 border-2 border-signoz-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-signoz-text-secondary">Indexing files...</p>
    </div>
  )
}

/**
 * File picker modal with fuzzy search.
 * Allows users to quickly find and open documentation files.
 *
 * Features:
 * - Fuzzy search across file names, titles, and paths
 * - Keyboard navigation (arrows, enter, escape)
 * - Recent files section
 * - Cmd+P / Ctrl+P global shortcut support
 *
 * @example
 * ```tsx
 * function App() {
 *   const [isOpen, setIsOpen] = useState(false)
 *   const { files } = useFileIndex(dirHandle)
 *   const { recentFiles, addRecentFile } = useRecentFiles()
 *
 *   const handleSelectFile = (path: string) => {
 *     addRecentFile(path)
 *     // Open the file...
 *   }
 *
 *   return (
 *     <FilePicker
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       onSelectFile={handleSelectFile}
 *       files={files}
 *       recentFiles={recentFiles}
 *     />
 *   )
 * }
 * ```
 */
export function FilePicker({
  isOpen,
  onClose,
  onSelectFile,
  files,
  recentFiles = [],
  isLoading = false,
  placeholder = 'Search files...',
}: FilePickerProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const focusTimeoutRef = useRef<number | null>(null)

  // Build Fuse instance for searching
  const fuse = useMemo(() => new Fuse(files, FUSE_OPTIONS), [files])

  // Get files matching current search, or recent/all files if no query
  const displayedFiles = useMemo(() => {
    if (query.trim()) {
      const results = fuse.search(query.trim())
      return results.map((r) => r.item)
    }

    // No query - show recent files first, then all files
    const recentSet = new Set(recentFiles)
    const recent = files.filter((f) => recentSet.has(f.path))
    const others = files.filter((f) => !recentSet.has(f.path))

    return [...recent, ...others]
  }, [query, fuse, files, recentFiles])

  // Determine which files are in the recent section
  const recentFileSet = useMemo(() => new Set(recentFiles), [recentFiles])

  // Split displayed files into recent and other sections
  const { recentSection, otherSection } = useMemo(() => {
    if (query.trim()) {
      // When searching, don't split into sections
      return { recentSection: [], otherSection: displayedFiles }
    }

    const recent = displayedFiles.filter((f) => recentFileSet.has(f.path))
    const others = displayedFiles.filter((f) => !recentFileSet.has(f.path))

    return { recentSection: recent, otherSection: others }
  }, [displayedFiles, query, recentFileSet])

  // Reset selection when files or query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, files])

  // Focus input when modal opens
  useEffect(() => {
    if (focusTimeoutRef.current !== null) {
      window.clearTimeout(focusTimeoutRef.current)
      focusTimeoutRef.current = null
    }

    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Delay focus to ensure modal is rendered
      focusTimeoutRef.current = window.setTimeout(() => {
        inputRef.current?.focus()
        focusTimeoutRef.current = null
      }, 50)
    }

    return () => {
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current)
        focusTimeoutRef.current = null
      }
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return

    const selectedElement = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    )
    if (
      selectedElement &&
      'scrollIntoView' in selectedElement &&
      typeof selectedElement.scrollIntoView === 'function'
    ) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            Math.min(prev + 1, displayedFiles.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (displayedFiles[selectedIndex]) {
            onSelectFile(displayedFiles[selectedIndex].path)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          e.preventDefault()
          // Tab cycles through items
          if (e.shiftKey) {
            setSelectedIndex((prev) =>
              prev === 0 ? displayedFiles.length - 1 : prev - 1
            )
          } else {
            setSelectedIndex((prev) =>
              prev === displayedFiles.length - 1 ? 0 : prev + 1
            )
          }
          break
      }
    },
    [displayedFiles, selectedIndex, onSelectFile, onClose]
  )

  // Handle file selection via click
  const handleSelectFile = useCallback(
    (path: string) => {
      onSelectFile(path)
      onClose()
    },
    [onSelectFile, onClose]
  )

  // Global keyboard shortcut (Cmd+P / Ctrl+P)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        if (!isOpen) {
          // This would need to be handled by the parent component
          // to open the picker. The parent should listen for this
          // event and call setIsOpen(true).
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-signoz-bg-ink border border-signoz-bg-elevated rounded-lg shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="File picker"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-signoz-bg-elevated">
          <svg
            className="w-5 h-5 text-signoz-text-muted flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="px-1.5 py-0.5 text-xs text-signoz-text-muted bg-signoz-bg-surface rounded">
            esc
          </kbd>
        </div>

        {/* File list */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <LoadingState />
          ) : displayedFiles.length === 0 ? (
            query.trim() ? (
              <EmptyState query={query} />
            ) : (
              <div className="px-4 py-8 text-center text-signoz-text-muted">
                No files indexed
              </div>
            )
          ) : (
            <>
              {query.trim() ? (
                /* Search results (no sections) */
                displayedFiles.map((file, index) => (
                  <div key={file.path} data-index={index}>
                    <FileItem
                      file={file}
                      isSelected={selectedIndex === index}
                      isRecent={recentFileSet.has(file.path)}
                      onClick={() => handleSelectFile(file.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    />
                  </div>
                ))
              ) : (
                <>
                  {/* Recent files section */}
                  {recentSection.length > 0 && (
                    <>
                      <SectionHeader title="Recent" />
                      {recentSection.map((file, index) => (
                        <div key={file.path} data-index={index}>
                          <FileItem
                            file={file}
                            isSelected={selectedIndex === index}
                            isRecent
                            onClick={() => handleSelectFile(file.path)}
                            onMouseEnter={() => setSelectedIndex(index)}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Other files section */}
                  {otherSection.length > 0 && (
                    <>
                      {recentSection.length > 0 && (
                        <SectionHeader title="All Files" />
                      )}
                      {otherSection.map((file, index) => {
                        const actualIndex = recentSection.length + index
                        return (
                          <div key={file.path} data-index={actualIndex}>
                            <FileItem
                              file={file}
                              isSelected={selectedIndex === actualIndex}
                              onClick={() => handleSelectFile(file.path)}
                              onMouseEnter={() => setSelectedIndex(actualIndex)}
                            />
                          </div>
                        )
                      })}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        {displayedFiles.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-signoz-bg-elevated text-xs text-signoz-text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-signoz-bg-surface rounded">
                  ↑
                </kbd>
                <kbd className="px-1 py-0.5 bg-signoz-bg-surface rounded">
                  ↓
                </kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-signoz-bg-surface rounded">
                  ↵
                </kbd>
                <span>to select</span>
              </span>
            </div>
            <span>{displayedFiles.length} files</span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to manage FilePicker open state with keyboard shortcut.
 */
export function useFilePicker() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }
}
