import React, { createContext, useContext, useState, useCallback } from 'react'

export interface RepoConfig {
  /** Path to the local repository */
  path: string
  /** Name of the repository (derived from path) */
  name: string
  /** Path to the docs directory within the repo */
  docsPath: string
  /** Path to the components directory (for custom MDX components) */
  componentsPath?: string
  /** URL of the Next.js dev server for live preview */
  devServerUrl?: string
  /** Directory handle for File System Access API (not persisted) */
  dirHandle?: FileSystemDirectoryHandle
}

/** Stored config without dirHandle (for localStorage) */
interface StoredRepoConfig {
  path: string
  name: string
  docsPath: string
  componentsPath?: string
  devServerUrl?: string
}

interface RepoContextValue {
  /** Current repository configuration, null if no repo selected */
  repo: RepoConfig | null
  /** Set the current repository */
  setRepo: (repo: RepoConfig | null) => void
  /** Clear the current repository */
  clearRepo: () => void
  /** Whether a repository is currently selected */
  hasRepo: boolean
  /** Whether the repo needs to re-select folder (dirHandle missing) */
  needsFolderReselect: boolean
}

const RepoContext = createContext<RepoContextValue | undefined>(undefined)

const REPO_STORAGE_KEY = 'signoz-doc-editor-repo'

function getStoredRepo(): StoredRepoConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(REPO_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as StoredRepoConfig
    } catch {
      return null
    }
  }
  return null
}

interface RepoProviderProps {
  children: React.ReactNode
}

export function RepoProvider({ children }: RepoProviderProps) {
  const [repo, setRepoState] = useState<RepoConfig | null>(() => {
    const stored = getStoredRepo()
    return stored ? { ...stored, dirHandle: undefined } : null
  })

  const setRepo = useCallback((newRepo: RepoConfig | null) => {
    setRepoState(newRepo)
    if (newRepo) {
      // Store only serializable parts (exclude dirHandle)
      const toStore: StoredRepoConfig = {
        path: newRepo.path,
        name: newRepo.name,
        docsPath: newRepo.docsPath,
        componentsPath: newRepo.componentsPath,
        devServerUrl: newRepo.devServerUrl,
      }
      localStorage.setItem(REPO_STORAGE_KEY, JSON.stringify(toStore))
    } else {
      localStorage.removeItem(REPO_STORAGE_KEY)
    }
  }, [])

  const clearRepo = useCallback(() => {
    setRepo(null)
  }, [setRepo])

  // Check if repo exists but needs folder re-selection (no dirHandle)
  const needsFolderReselect = repo !== null && repo.dirHandle === undefined

  const value: RepoContextValue = {
    repo,
    setRepo,
    clearRepo,
    hasRepo: repo !== null,
    needsFolderReselect,
  }

  return (
    <RepoContext.Provider value={value}>
      {children}
    </RepoContext.Provider>
  )
}

export function useRepo(): RepoContextValue {
  const context = useContext(RepoContext)
  if (context === undefined) {
    throw new Error('useRepo must be used within a RepoProvider')
  }
  return context
}
