import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { CodePane, CursorPosition } from './CodePane'
import { ComponentPicker } from './ComponentPicker'
import { PreviewPane, InsertPosition } from './PreviewPane'
import { FileNode, useApi, ComponentInfo } from '@/hooks/useApi'
import {
  useWorkspaceSession,
  WORKSPACE_SESSION_STORAGE_KEY,
} from '@/hooks/useWorkspaceSession'
import { useSignozComponents } from '@/hooks/useSignozComponents'
import type { ComponentCategory, DiscoveredComponent } from '@/types'
import {
  flattenFileTree,
  getAncestorPaths,
  treeContainsPath,
} from '@/utils/fileTree'

const DEFAULT_CONTENT = `# Welcome to SigNoz Doc Editor

Select a file from the sidebar to start editing.

The preview stays in sync with the source and loads shared components from your local signoz.io checkout.
`

const MAX_OPEN_FILES = 8
const MAX_RECENT_FILES = 12
const MIN_SPLIT_PERCENT = 32
const MAX_SPLIT_PERCENT = 68
const DEFAULT_SPLIT_PERCENT = 50

interface OpenFileState {
  draft: string
  isDirty: boolean
  cursorPosition: CursorPosition | null
}

function mapToDiscoveredComponent(comp: ComponentInfo): DiscoveredComponent {
  const categoryMap: Record<string, ComponentCategory> = {
    pliny: 'utility',
    general: 'custom',
    APM: 'data',
    Shared: 'layout',
    Button: 'interactive',
    Card: 'layout',
    Tabs: 'navigation',
    Figure: 'media',
    Admonition: 'content',
    CodeBlock: 'content',
  }

  return {
    name: comp.name,
    category: categoryMap[comp.category] || 'custom',
    filePath: comp.resolvedPath || comp.importPath || '',
    props: [],
    description: `Component from ${comp.category}`,
  }
}

function generateSnippet(component: DiscoveredComponent): string {
  return component.selfClosing === false
    ? `<${component.name}>\n  \n</${component.name}>`
    : `<${component.name} />`
}

function pushRecentFile(items: string[], filePath: string, maxItems: number): string[] {
  return [filePath, ...items.filter((item) => item !== filePath)].slice(0, maxItems)
}

function pushOpenFile(items: string[], filePath: string, maxItems: number): string[] {
  if (items.includes(filePath)) {
    return items.slice(-maxItems)
  }

  return [...items, filePath].slice(-maxItems)
}

function SidebarTreeNode({
  node,
  depth = 0,
  selectedPath,
  activeAncestorPaths,
  expandedPaths,
  onToggle,
  onSelect,
}: {
  node: FileNode
  depth?: number
  selectedPath: string | null
  activeAncestorPaths: Set<string>
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}) {
  const isDirectory = node.type === 'directory'
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isActiveAncestor = isDirectory && activeAncestorPaths.has(node.path)

  return (
    <div>
      <button
        type="button"
        onClick={() => (isDirectory ? onToggle(node.path) : onSelect(node.path))}
        className={[
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
          isSelected
            ? 'bg-orange-500/15 text-orange-300'
            : isActiveAncestor
              ? 'bg-orange-500/5 text-orange-200/80'
            : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        {isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 text-zinc-500" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-zinc-500" />
            )}
            {isExpanded ? (
              <FolderOpen size={16} className="shrink-0 text-amber-400" />
            ) : (
              <Folder size={16} className="shrink-0 text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-[14px] shrink-0" />
            <FileText size={16} className="shrink-0 text-sky-400" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDirectory && isExpanded && node.children?.length ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <SidebarTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              activeAncestorPaths={activeAncestorPaths}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Editor() {
  const { config, tree, isLoading, error, readFile, writeFile, components } = useApi()
  const { components: signozComponents, isLoading: isLoadingComponents } = useSignozComponents(components)
  const [workspaceSession, setWorkspaceSession] = useWorkspaceSession()

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [insertPosition, setInsertPosition] = useState<InsertPosition | null>(null)
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [openFileStates, setOpenFileStates] = useState<Record<string, OpenFileState>>({})

  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasRestoredSessionRef = useRef(false)
  const selectedFileRef = useRef<string | null>(null)
  const workspaceSessionRef = useRef(workspaceSession)
  const openFileRequestIdRef = useRef(0)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const isResizingSplitRef = useRef(false)

  useEffect(() => {
    selectedFileRef.current = selectedFile
  }, [selectedFile])

  useEffect(() => {
    workspaceSessionRef.current = workspaceSession
  }, [workspaceSession])

  const expandedPaths = useMemo(
    () => new Set(workspaceSession.expandedPaths),
    [workspaceSession.expandedPaths]
  )
  const activeAncestorPaths = useMemo(
    () => new Set(selectedFile ? getAncestorPaths(selectedFile) : []),
    [selectedFile]
  )
  const activeFileState = selectedFile ? openFileStates[selectedFile] : undefined
  const mdxSource = activeFileState?.draft ?? DEFAULT_CONTENT
  const cursorPosition = activeFileState?.cursorPosition ?? null
  const isDirty = activeFileState?.isDirty ?? false
  const hasDirtyTabs = useMemo(
    () => Object.values(openFileStates).some((state) => state.isDirty),
    [openFileStates]
  )
  const activeSplitPercent = selectedFile
    ? workspaceSession.paneSplits[selectedFile] ?? DEFAULT_SPLIT_PERCENT
    : DEFAULT_SPLIT_PERCENT

  const discoveredComponents = useMemo(
    () => components.map(mapToDiscoveredComponent),
    [components]
  )
  const loadableComponentCount = useMemo(
    () => components.filter((component) => component.resolvedPath).length,
    [components]
  )
  const unsupportedComponentCount = components.length - loadableComponentCount
  const previewSourcePath = useMemo(
    () => (config && selectedFile ? `${config.docsPath}/${selectedFile}` : undefined),
    [config, selectedFile]
  )

  const flatFiles = useMemo(() => flattenFileTree(tree), [tree])
  const treeSignature = useMemo(
    () => flatFiles.map((file) => file.path).join('\n'),
    [flatFiles]
  )
  const recentFiles = useMemo(
    () => workspaceSession.recentFiles
      .map((filePath) => flatFiles.find((file) => file.path === filePath))
      .filter((file): file is { name: string; path: string } => Boolean(file)),
    [flatFiles, workspaceSession.recentFiles]
  )

  const filteredFiles = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase()

    if (!query) {
      return []
    }

    return flatFiles.filter((file) => {
      const haystack = `${file.name} ${file.path}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [flatFiles, sidebarQuery])

  const removeOpenFileState = useCallback((filePath: string) => {
    setOpenFileStates((currentStates) => {
      if (!(filePath in currentStates)) {
        return currentStates
      }

      const nextStates = { ...currentStates }
      delete nextStates[filePath]
      return nextStates
    })
  }, [])

  const updateSplitPercent = useCallback((clientX: number) => {
    const container = splitContainerRef.current

    if (!container || window.innerWidth < 1280) {
      return
    }

    const bounds = container.getBoundingClientRect()

    if (bounds.width <= 0) {
      return
    }

    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100
    const clampedPercent = Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, nextPercent))

    const activeFilePath = selectedFileRef.current
    if (!activeFilePath) {
      return
    }

    setWorkspaceSession((currentSession) => ({
      ...currentSession,
      paneSplits: {
        ...currentSession.paneSplits,
        [activeFilePath]: clampedPercent,
      },
    }))
  }, [setWorkspaceSession])

  const handleSplitPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 1280) {
      return
    }

    event.preventDefault()
    isResizingSplitRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    updateSplitPercent(event.clientX)
  }, [updateSplitPercent])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingSplitRef.current) {
        return
      }

      updateSplitPercent(event.clientX)
    }

    const stopResizing = () => {
      if (!isResizingSplitRef.current) {
        return
      }

      isResizingSplitRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)
    window.addEventListener('pointercancel', stopResizing)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      window.removeEventListener('pointercancel', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [updateSplitPercent])

  const splitLayoutStyle = useMemo(
    () =>
      ({
        '--source-pane-size': `${activeSplitPercent}%`,
      }) as CSSProperties,
    [activeSplitPercent]
  )

  const persistSelection = useCallback((filePath: string) => {
    setWorkspaceSession((currentSession) => ({
      ...currentSession,
      selectedFile: filePath,
      openFiles: pushOpenFile(currentSession.openFiles, filePath, MAX_OPEN_FILES),
      recentFiles: pushRecentFile(currentSession.recentFiles, filePath, MAX_RECENT_FILES),
      expandedPaths: Array.from(
        new Set([
          ...currentSession.expandedPaths,
          ...getAncestorPaths(filePath),
        ])
      ),
    }))
  }, [setWorkspaceSession])

  const maybeSaveDirtyTab = useCallback(async (filePath: string | null) => {
    if (!filePath) {
      return true
    }

    const fileState = openFileStates[filePath]
    if (!fileState?.isDirty) {
      return true
    }

    const shouldSave = window.confirm(
      'Save changes before closing this file? Choose Cancel to discard the unsaved changes.'
    )

    if (!shouldSave) {
      return true
    }

    setIsSaving(true)
    const success = await writeFile(filePath, fileState.draft)
    setIsSaving(false)

    if (success) {
      setOpenFileStates((currentStates) => {
        const nextState = currentStates[filePath]
        if (!nextState) {
          return currentStates
        }

        return {
          ...currentStates,
          [filePath]: {
            ...nextState,
            isDirty: false,
          },
        }
      })
    }

    return success
  }, [openFileStates, writeFile])

  const openFile = useCallback(async (filePath: string) => {
    const requestId = openFileRequestIdRef.current + 1
    openFileRequestIdRef.current = requestId

    if (filePath === selectedFile) {
      persistSelection(filePath)
      return true
    }

    if (openFileStates[filePath]) {
      setSelectedFile(filePath)
      persistSelection(filePath)
      return true
    }

    const content = await readFile(filePath)
    if (content === null) {
      return false
    }

    if (requestId !== openFileRequestIdRef.current) {
      return false
    }

    setSelectedFile(filePath)
    setOpenFileStates((currentStates) => ({
      ...currentStates,
      [filePath]: {
        draft: content,
        isDirty: false,
        cursorPosition: null,
      },
    }))
    persistSelection(filePath)
    return true
  }, [openFileStates, persistSelection, readFile, selectedFile])

  const refreshOpenFile = useCallback(async (filePath: string) => {
    const initialState = openFileStates[filePath]
    if (!initialState) {
      return false
    }

    const content = await readFile(filePath)
    if (content === null) {
      return false
    }

    let didApply = false

    setOpenFileStates((currentStates) => {
      const currentState = currentStates[filePath]
      if (
        !currentState
        || currentState.draft !== initialState.draft
        || currentState.isDirty !== initialState.isDirty
      ) {
        return currentStates
      }

      didApply = true

      return {
        ...currentStates,
        [filePath]: {
          draft: content,
          isDirty: false,
          cursorPosition: currentState.cursorPosition,
        },
      }
    })

    return didApply
  }, [openFileStates, readFile])

  const handleSave = useCallback(async () => {
    if (!selectedFile || !isDirty) {
      return
    }

    setIsSaving(true)
    const success = await writeFile(selectedFile, mdxSource)
    setIsSaving(false)

    if (success) {
      setOpenFileStates((currentStates) => {
        const nextState = currentStates[selectedFile]
        if (!nextState) {
          return currentStates
        }

        return {
          ...currentStates,
          [selectedFile]: {
            ...nextState,
            isDirty: false,
          },
        }
      })
      persistSelection(selectedFile)
    }
  }, [isDirty, mdxSource, persistSelection, selectedFile, writeFile])

  const handleSaveAll = useCallback(async () => {
    const dirtyEntries = Object.entries(openFileStates).filter(([, state]) => state.isDirty)
    if (dirtyEntries.length === 0) {
      return
    }

    setIsSaving(true)
    const savedPaths: string[] = []

    for (const [filePath, state] of dirtyEntries) {
      const success = await writeFile(filePath, state.draft)
      if (success) {
        savedPaths.push(filePath)
      }
    }

    setIsSaving(false)

    if (savedPaths.length === 0) {
      return
    }

    setOpenFileStates((currentStates) => {
      const nextStates = { ...currentStates }

      for (const filePath of savedPaths) {
        const nextState = nextStates[filePath]
        if (!nextState) {
          continue
        }

        nextStates[filePath] = {
          ...nextState,
          isDirty: false,
        }
      }

      return nextStates
    })

    const currentSelectedFile = selectedFileRef.current
    if (currentSelectedFile && savedPaths.includes(currentSelectedFile)) {
      persistSelection(currentSelectedFile)
    }
  }, [openFileStates, persistSelection, writeFile])

  const handleRefresh = useCallback(async () => {
    if (!selectedFile) {
      return
    }

    if (
      isDirty
      && !window.confirm('Discard unsaved changes and reload this file from disk?')
    ) {
      return
    }

    setIsRefreshing(true)
    await refreshOpenFile(selectedFile)
    setIsRefreshing(false)
  }, [isDirty, refreshOpenFile, selectedFile])

  const handleRefreshAll = useCallback(async () => {
    const openFiles = workspaceSession.openFiles.filter((filePath) => filePath in openFileStates)
    if (openFiles.length === 0) {
      return
    }

    if (
      openFiles.some((filePath) => openFileStates[filePath]?.isDirty)
      && !window.confirm('Discard unsaved changes in open files and reload them from disk?')
    ) {
      return
    }

    setIsRefreshing(true)
    await Promise.all(openFiles.map((filePath) => refreshOpenFile(filePath)))
    setIsRefreshing(false)
  }, [openFileStates, refreshOpenFile, workspaceSession.openFiles])

  const handleToggle = useCallback((path: string) => {
    setWorkspaceSession((currentSession) => {
      const nextExpanded = new Set(currentSession.expandedPaths)

      if (nextExpanded.has(path)) {
        nextExpanded.delete(path)
      } else {
        nextExpanded.add(path)
      }

      return {
        ...currentSession,
        expandedPaths: Array.from(nextExpanded),
      }
    })
  }, [setWorkspaceSession])

  const handleCloseTab = useCallback(async (filePath: string) => {
    const currentOpenFiles = workspaceSessionRef.current.openFiles
    const remainingFiles = currentOpenFiles.filter((path) => path !== filePath)

    const canClose = await maybeSaveDirtyTab(filePath)
    if (!canClose) {
      return
    }

    if (selectedFileRef.current !== filePath) {
      removeOpenFileState(filePath)
      setWorkspaceSession((currentSession) => ({
        ...currentSession,
        openFiles: currentSession.openFiles.filter((path) => path !== filePath),
      }))
      return
    }

    if (remainingFiles.length === 0) {
      setSelectedFile(null)
      removeOpenFileState(filePath)
      setWorkspaceSession((currentSession) => ({
        ...currentSession,
        openFiles: currentSession.openFiles.filter((path) => path !== filePath),
        selectedFile: null,
      }))
      return
    }

    const nextFile = remainingFiles[remainingFiles.length - 1]
    if (!nextFile) {
      return
    }

    const didOpen = await openFile(nextFile)
    removeOpenFileState(filePath)
    if (!didOpen) {
      setSelectedFile(null)
      setWorkspaceSession((currentSession) => ({
        ...currentSession,
        openFiles: currentSession.openFiles.filter((path) => path !== filePath),
        selectedFile: null,
      }))
      return
    }

    setWorkspaceSession((currentSession) => ({
      ...currentSession,
      openFiles: currentSession.openFiles.filter((path) => path !== filePath),
      selectedFile: nextFile,
    }))
  }, [
    maybeSaveDirtyTab,
    openFile,
    removeOpenFileState,
    setWorkspaceSession,
  ])

  const handleComponentInsert = useCallback((component: DiscoveredComponent) => {
    const snippet = generateSnippet(component)

    if (insertPosition) {
      const lines = mdxSource.split('\n')
      const insertLine = Math.min(insertPosition.index, lines.length)
      lines.splice(insertLine, 0, '', snippet, '')
      if (selectedFile) {
        setOpenFileStates((currentStates) => ({
          ...currentStates,
          [selectedFile]: {
            draft: lines.join('\n'),
            isDirty: true,
            cursorPosition: currentStates[selectedFile]?.cursorPosition ?? null,
          },
        }))
      }
    } else if (cursorPosition) {
      const lines = mdxSource.split('\n')
      const lineIndex = Math.max(cursorPosition.line - 1, 0)
      lines.splice(lineIndex + 1, 0, '', snippet)
      if (selectedFile) {
        setOpenFileStates((currentStates) => ({
          ...currentStates,
          [selectedFile]: {
            draft: lines.join('\n'),
            isDirty: true,
            cursorPosition: currentStates[selectedFile]?.cursorPosition ?? null,
          },
        }))
      }
    } else {
      if (selectedFile) {
        setOpenFileStates((currentStates) => ({
          ...currentStates,
          [selectedFile]: {
            draft: `${(currentStates[selectedFile]?.draft ?? '').trimEnd()}\n\n${snippet}\n`,
            isDirty: true,
            cursorPosition: currentStates[selectedFile]?.cursorPosition ?? null,
          },
        }))
      }
    }

    setInsertPosition(null)
    setIsPickerOpen(false)
  }, [cursorPosition, insertPosition, mdxSource, selectedFile])

  useEffect(() => {
    hasRestoredSessionRef.current = false
  }, [treeSignature])

  useEffect(() => {
    if (hasRestoredSessionRef.current || tree.length === 0) {
      return
    }

    hasRestoredSessionRef.current = true

    const validOpenFiles = workspaceSession.openFiles.filter((filePath) =>
      treeContainsPath(tree, filePath)
    )
    const validRecentFiles = workspaceSession.recentFiles.filter((filePath) =>
      treeContainsPath(tree, filePath)
    )
    const hasValidSelectedFile =
      workspaceSession.selectedFile !== null &&
      treeContainsPath(tree, workspaceSession.selectedFile)
    const fallbackSelectedFile = validOpenFiles[validOpenFiles.length - 1] ?? null
    const nextSelectedFile = hasValidSelectedFile
      ? workspaceSession.selectedFile
      : fallbackSelectedFile

    if (
      workspaceSession.openFiles.length !== validOpenFiles.length ||
      workspaceSession.recentFiles.length !== validRecentFiles.length ||
      workspaceSession.selectedFile !== nextSelectedFile
    ) {
      setWorkspaceSession((currentSession) => ({
        ...currentSession,
        selectedFile: nextSelectedFile,
        openFiles: validOpenFiles,
        recentFiles: validRecentFiles,
      }))
    }

    setOpenFileStates((currentStates) => {
      const validOpenFileSet = new Set(validOpenFiles)
      const nextStates = Object.fromEntries(
        Object.entries(currentStates).filter(([filePath]) => validOpenFileSet.has(filePath))
      )

      return Object.keys(nextStates).length === Object.keys(currentStates).length
        ? currentStates
        : nextStates
    })

    if (nextSelectedFile) {
      void openFile(nextSelectedFile)
    }
  }, [
    openFile,
    setWorkspaceSession,
    tree,
    treeSignature,
    workspaceSession.openFiles,
    workspaceSession.recentFiles,
    workspaceSession.selectedFile,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        if (workspaceSession.sidebarCollapsed) {
          setWorkspaceSession((currentSession) => ({
            ...currentSession,
            sidebarCollapsed: false,
          }))
        }
        searchInputRef.current?.focus()
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        setInsertPosition(null)
        setIsPickerOpen(true)
      }
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDirtyTabs) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [handleSave, hasDirtyTabs, setWorkspaceSession, workspaceSession.sidebarCollapsed])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-zinc-900 p-8">
          <div className="mb-4 flex items-center gap-3 text-red-300">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-xl font-semibold">Unable to reach the local API</h1>
          </div>
          <p className="text-sm leading-6 text-zinc-300">{error}</p>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
            Start the backend with <code className="text-zinc-100">npm run server</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-screen bg-zinc-950 text-zinc-100">
      <aside
        className={[
          'border-r border-zinc-800 bg-zinc-900/95 transition-all duration-200',
          workspaceSession.sidebarCollapsed ? 'w-16' : 'w-80',
        ].join(' ')}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-zinc-800 px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className={workspaceSession.sidebarCollapsed ? 'hidden' : 'block'}>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Workspace</p>
                <h1 className="mt-1 text-lg font-semibold text-zinc-50">SigNoz Docs Editor</h1>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Last session data is stored in <code>{WORKSPACE_SESSION_STORAGE_KEY}</code>.
                </p>
              </div>
              <button
                type="button"
                aria-label={workspaceSession.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setWorkspaceSession((currentSession) => ({
                  ...currentSession,
                  sidebarCollapsed: !currentSession.sidebarCollapsed,
                }))}
                className="rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                {workspaceSession.sidebarCollapsed ? (
                  <PanelLeftOpen size={16} />
                ) : (
                  <PanelLeftClose size={16} />
                )}
              </button>
            </div>

            {!workspaceSession.sidebarCollapsed ? (
              <>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    ref={searchInputRef}
                    value={sidebarQuery}
                    onChange={(event) => setSidebarQuery(event.target.value)}
                    placeholder="Search docs"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-9 text-sm text-zinc-100 outline-none transition focus:border-orange-400"
                  />
                  {sidebarQuery ? (
                    <button
                      type="button"
                      onClick={() => setSidebarQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </label>

                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{flatFiles.length} docs indexed</span>
                  <span>{components.length} components</span>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
            {workspaceSession.sidebarCollapsed ? (
              <div className="space-y-2">
                {workspaceSession.openFiles.slice(-5).map((filePath) => (
                  <button
                    key={filePath}
                    type="button"
                    onClick={() => void openFile(filePath)}
                    className={[
                      'flex h-10 w-full items-center justify-center rounded-md border text-zinc-300',
                      selectedFile === filePath
                        ? 'border-orange-400 bg-orange-500/10 text-orange-200'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:text-white',
                    ].join(' ')}
                    title={filePath}
                  >
                    <FileText size={16} />
                  </button>
                ))}
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading files…
              </div>
            ) : (
              <div className="space-y-6">
                {sidebarQuery ? (
                  <section className="space-y-2">
                    <div className="px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Search results
                    </div>
                    {filteredFiles.length ? (
                      filteredFiles.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => void openFile(file.path)}
                          className={[
                            'flex w-full flex-col rounded-lg border px-3 py-2 text-left transition-colors',
                            selectedFile === file.path
                              ? 'border-orange-400/60 bg-orange-500/10'
                              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900',
                          ].join(' ')}
                        >
                          <span className="text-sm text-zinc-100">{file.name}</span>
                          <span className="text-xs text-zinc-500">{file.path}</span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-5 text-sm text-zinc-500">
                        No docs match “{sidebarQuery}”.
                      </div>
                    )}
                  </section>
                ) : null}

                {!sidebarQuery && recentFiles.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <span>Recent</span>
                      <button
                        type="button"
                        onClick={() => setWorkspaceSession((currentSession) => ({
                          ...currentSession,
                          recentFiles: [],
                        }))}
                        className="rounded px-2 py-1 text-[11px] tracking-normal text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        Clear recent
                      </button>
                    </div>
                    {recentFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => void openFile(file.path)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                          selectedFile === file.path
                            ? 'border-orange-400/60 bg-orange-500/10'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900',
                        ].join(' ')}
                      >
                        <FileText size={15} className="shrink-0 text-sky-400" />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-zinc-100">{file.name}</div>
                          <div className="truncate text-xs text-zinc-500">{file.path}</div>
                        </div>
                      </button>
                    ))}
                  </section>
                ) : null}

                {!sidebarQuery ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <span>Files</span>
                      <button
                        type="button"
                        onClick={() => setWorkspaceSession((currentSession) => ({
                          ...currentSession,
                          expandedPaths: [],
                        }))}
                        className="rounded px-2 py-1 text-[11px] tracking-normal text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        Collapse all
                      </button>
                    </div>

                    <div className="space-y-1">
                      {tree.map((node) => (
                        <SidebarTreeNode
                          key={node.path}
                          node={node}
                          selectedPath={selectedFile}
                          activeAncestorPaths={activeAncestorPaths}
                          expandedPaths={expandedPaths}
                          onToggle={handleToggle}
                          onSelect={(path) => void openFile(path)}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-800 bg-zinc-950/90 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-zinc-500">
                <span>Docs root</span>
                {config ? <span className="text-zinc-700">•</span> : null}
                {config ? <span className="normal-case tracking-normal">{config.docsPath}</span> : null}
              </div>
              <h2 className="mt-2 text-xl font-semibold text-zinc-50">
                {selectedFile || 'Choose a document to begin'}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Source stays authoritative, preview stays renderable, and shared SigNoz components load from your local checkout.
              </p>
              {selectedFile ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInsertPosition(null)
                      setIsPickerOpen(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
                  >
                    <Sparkles size={15} />
                    Add component
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing || isSaving}
                    className={[
                      'inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-600',
                      isRefreshing || isSaving ? 'cursor-not-allowed opacity-60' : '',
                    ].join(' ')}
                  >
                    <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : undefined} />
                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!isDirty || isSaving || isRefreshing}
                    className={[
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      !isDirty || isSaving || isRefreshing
                        ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                        : 'bg-orange-500 text-white hover:bg-orange-400',
                    ].join(' ')}
                  >
                    <Save size={15} />
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                {isLoadingComponents ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Loading components
                  </span>
                ) : (
                  <span>
                    {Object.keys(signozComponents).length}/{loadableComponentCount} local components ready
                    {unsupportedComponentCount > 0 ? ` • ${unsupportedComponentCount} external/unsupported` : ''}
                  </span>
                )}
              </div>

              {cursorPosition ? (
                <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-400">
                  Ln {cursorPosition.line}, Col {cursorPosition.column}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleRefreshAll()}
                disabled={!workspaceSession.openFiles.length || isRefreshing || isSaving}
                className={[
                  'inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-600',
                  !workspaceSession.openFiles.length || isRefreshing || isSaving
                    ? 'cursor-not-allowed opacity-60'
                    : '',
                ].join(' ')}
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : undefined} />
                {isRefreshing ? 'Refreshing…' : 'Refresh all'}
              </button>

              <button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={!hasDirtyTabs || isSaving || isRefreshing}
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  !hasDirtyTabs || isSaving || isRefreshing
                    ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                    : 'bg-orange-500 text-white hover:bg-orange-400',
                ].join(' ')}
              >
                <Save size={15} />
                {isSaving ? 'Saving…' : 'Save all'}
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-zinc-800 bg-zinc-950/70 px-3 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {workspaceSession.openFiles.length ? workspaceSession.openFiles.map((filePath) => (
              <div
                key={filePath}
                className={[
                  'group inline-flex max-w-[260px] items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  selectedFile === filePath
                    ? 'border-orange-400/60 bg-orange-500/10 text-orange-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => void openFile(filePath)}
                  className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{filePath.split('/').pop()}</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleCloseTab(filePath)
                  }}
                  className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label={`Close ${filePath.split('/').pop()}`}
                >
                  <X size={13} />
                </button>
              </div>
            )) : (
              <div className="px-3 py-2 text-sm text-zinc-500">
                Open files appear here and are restored next session.
              </div>
            )}
          </div>
        </div>

        <div
          ref={splitContainerRef}
          className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-zinc-800 xl:[grid-template-columns:minmax(30rem,var(--source-pane-size))_10px_minmax(0,1fr)]"
          style={splitLayoutStyle}
        >
          <section className="flex min-h-0 min-w-0 flex-col bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <span className="text-xs uppercase tracking-[0.24em] text-zinc-500">Source</span>
              <span className="text-xs text-zinc-500">
                {isDirty ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodePane
                key={selectedFile ?? 'empty-state'}
                value={mdxSource}
                cursorOffset={cursorPosition?.offset}
                onChange={(nextValue) => {
                  if (!selectedFile) {
                    return
                  }

                  setOpenFileStates((currentStates) => ({
                    ...currentStates,
                    [selectedFile]: {
                      draft: nextValue,
                      isDirty: true,
                      cursorPosition: currentStates[selectedFile]?.cursorPosition ?? null,
                    },
                  }))
                }}
                onCursorChange={(nextCursorPosition) => {
                  if (!selectedFile) {
                    return
                  }

                  setOpenFileStates((currentStates) => ({
                    ...currentStates,
                    [selectedFile]: {
                      draft: currentStates[selectedFile]?.draft ?? mdxSource,
                      isDirty: currentStates[selectedFile]?.isDirty ?? false,
                      cursorPosition: nextCursorPosition,
                    },
                  }))
                }}
              />
            </div>
          </section>

          <div className="hidden min-h-0 bg-zinc-900 xl:block">
            <button
              type="button"
              aria-label="Resize source and preview panes"
              onPointerDown={handleSplitPointerDown}
              className="flex h-full w-full cursor-col-resize items-center justify-center bg-zinc-900 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <span className="h-16 w-px rounded-full bg-zinc-700" />
            </button>
          </div>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <span className="text-xs uppercase tracking-[0.24em] text-zinc-500">Preview</span>
              <span className="text-xs text-zinc-500">Shared components enabled</span>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-hidden">
              <PreviewPane
                mdxSource={mdxSource}
                sourcePath={previewSourcePath}
                components={signozComponents}
                onInsertRequest={(position) => {
                  setInsertPosition(position)
                  setIsPickerOpen(true)
                }}
                onContentEdit={() => undefined}
                enableBidirectionalEdit={false}
              />
            </div>
          </section>
        </div>
      </main>

      <ComponentPicker
        isOpen={isPickerOpen}
        onClose={() => {
          setInsertPosition(null)
          setIsPickerOpen(false)
        }}
        onSelect={handleComponentInsert}
        components={discoveredComponents}
      />
    </div>
  )
}

export default Editor
