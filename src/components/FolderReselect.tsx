import { useState } from 'react'
import { useRepo } from '@/contexts'

/**
 * FolderReselect - displayed when repo config exists but needs folder re-selection.
 * This happens after page reload since FileSystemDirectoryHandle can't be persisted.
 */
export function FolderReselect() {
  const { repo, setRepo, clearRepo } = useRepo()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReselectFolder = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })

      // Verify it's the same folder (by name)
      if (dirHandle.name !== repo?.name) {
        setError(`Expected folder "${repo?.name}" but got "${dirHandle.name}". Please select the correct folder.`)
        setIsLoading(false)
        return
      }

      // Update repo with the new dirHandle
      setRepo({
        ...repo!,
        dirHandle,
      })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(`Failed to open folder: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-signoz-bg-ink p-4">
      <div className="w-full max-w-md">
        <div className="bg-signoz-bg-elevated rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-signoz-warning/10 rounded-lg">
              <svg className="w-6 h-6 text-signoz-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-signoz-text-primary">
              Re-select Folder
            </h1>
          </div>

          <p className="text-signoz-text-secondary mb-4">
            For security reasons, browsers require you to re-select the folder after refreshing the page.
          </p>

          <div className="bg-signoz-bg-surface rounded-lg p-4 mb-6">
            <div className="text-sm text-signoz-text-muted mb-1">Previous folder:</div>
            <div className="font-mono text-signoz-text-primary">{repo?.name}</div>
            <div className="text-xs text-signoz-text-muted mt-1">
              Docs path: {repo?.docsPath}
            </div>
          </div>

          {error && (
            <div className="text-signoz-error text-sm mb-4 p-3 bg-signoz-error/10 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleReselectFolder}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-signoz-primary text-white font-medium rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-signoz-primary focus:ring-offset-2 focus:ring-offset-signoz-bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Opening...' : 'Select Folder Again'}
            </button>

            <button
              type="button"
              onClick={clearRepo}
              className="w-full py-2 px-4 text-signoz-text-secondary hover:text-signoz-text-primary font-medium rounded-md hover:bg-signoz-bg-surface focus:outline-none transition-colors"
            >
              Choose Different Repository
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FolderReselect
