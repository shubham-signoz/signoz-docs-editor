import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react'

export interface WorkspaceSessionState {
  selectedFile: string | null
  openFiles: string[]
  recentFiles: string[]
  expandedPaths: string[]
  sidebarCollapsed: boolean
  paneSplits: Record<string, number>
}

export const WORKSPACE_SESSION_STORAGE_KEY = 'signoz-doc-editor-workspace-v2'

const DEFAULT_SESSION_STATE: WorkspaceSessionState = {
  selectedFile: null,
  openFiles: [],
  recentFiles: [],
  expandedPaths: [],
  sidebarCollapsed: false,
  paneSplits: {},
}

function uniqueStrings(items: unknown[] | undefined): string[] {
  if (!Array.isArray(items)) {
    return []
  }

  return Array.from(new Set(items.filter((item): item is string => typeof item === 'string')))
}

function sanitizeState(value: Partial<WorkspaceSessionState> | null | undefined): WorkspaceSessionState {
  const paneSplits = typeof value?.paneSplits === 'object' && value?.paneSplits !== null
    ? Object.fromEntries(
      Object.entries(value.paneSplits).filter(
        ([filePath, split]) => typeof filePath === 'string' && typeof split === 'number' && Number.isFinite(split)
      )
    )
    : {}

  return {
    selectedFile: typeof value?.selectedFile === 'string' ? value.selectedFile : null,
    openFiles: uniqueStrings(value?.openFiles),
    recentFiles: uniqueStrings(value?.recentFiles),
    expandedPaths: uniqueStrings(value?.expandedPaths),
    sidebarCollapsed: Boolean(value?.sidebarCollapsed),
    paneSplits,
  }
}

function readInitialState(): WorkspaceSessionState {
  if (typeof window === 'undefined') {
    return DEFAULT_SESSION_STATE
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SESSION_STATE
    }

    return sanitizeState(JSON.parse(raw) as Partial<WorkspaceSessionState>)
  } catch {
    return DEFAULT_SESSION_STATE
  }
}

export function useWorkspaceSession(): readonly [
  WorkspaceSessionState,
  Dispatch<SetStateAction<WorkspaceSessionState>>,
] {
  const [state, setState] = useState<WorkspaceSessionState>(readInitialState)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify(state)
    )
  }, [state])

  const setWorkspaceState = useCallback<Dispatch<SetStateAction<WorkspaceSessionState>>>((value) => {
    setState((currentState) => {
      const nextState = typeof value === 'function'
        ? (value as (previousState: WorkspaceSessionState) => WorkspaceSessionState)(currentState)
        : value

      return sanitizeState(nextState)
    })
  }, [])

  return [state, setWorkspaceState] as const
}
