import { useState } from 'react'
import { useRepo, type RepoConfig } from '@/contexts'

/**
 * RepoSetup component - displayed when no repository is selected.
 * Configures the signoz.io repository path and dev server URL.
 */
export function RepoSetup() {
  const { setRepo } = useRepo()
  const [docsPath, setDocsPath] = useState('data/docs')
  const [componentsPath, setComponentsPath] = useState('components')
  const [devServerUrl, setDevServerUrl] = useState('http://localhost:3000')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectFolder = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Use File System Access API to select folder
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })

      const config: RepoConfig = {
        path: dirHandle.name,
        name: dirHandle.name,
        docsPath: docsPath.trim() || 'data/docs',
        componentsPath: componentsPath.trim() || 'components',
        devServerUrl: devServerUrl.trim() || 'http://localhost:3000',
        dirHandle,
      }

      setRepo(config)
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
      <div className="w-full max-w-lg">
        <div className="bg-signoz-bg-elevated rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-signoz-text-primary mb-2">
            SigNoz Doc Editor
          </h1>
          <p className="text-signoz-text-secondary mb-6">
            Configure your signoz.io repository to start editing documentation.
          </p>

          <div className="space-y-4">
            {/* Dev Server URL */}
            <div>
              <label
                htmlFor="devServerUrl"
                className="block text-sm font-medium text-signoz-text-primary mb-1"
              >
                Next.js Dev Server URL
              </label>
              <input
                type="text"
                id="devServerUrl"
                value={devServerUrl}
                onChange={(e) => setDevServerUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full px-3 py-2 bg-signoz-bg-surface border border-signoz-text-muted rounded-md text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-2 focus:ring-signoz-primary focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-signoz-text-muted mt-1">
                Run <code className="bg-signoz-bg-surface px-1 rounded">npm run dev</code> in signoz.io first
              </p>
            </div>

            {/* Docs Path */}
            <div>
              <label
                htmlFor="docsPath"
                className="block text-sm font-medium text-signoz-text-primary mb-1"
              >
                Docs Directory
              </label>
              <input
                type="text"
                id="docsPath"
                value={docsPath}
                onChange={(e) => setDocsPath(e.target.value)}
                placeholder="data/docs"
                className="w-full px-3 py-2 bg-signoz-bg-surface border border-signoz-text-muted rounded-md text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-2 focus:ring-signoz-primary focus:border-transparent"
              />
              <p className="text-xs text-signoz-text-muted mt-1">
                Relative path to docs within the repository
              </p>
            </div>

            {/* Components Path */}
            <div>
              <label
                htmlFor="componentsPath"
                className="block text-sm font-medium text-signoz-text-primary mb-1"
              >
                Components Directory
              </label>
              <input
                type="text"
                id="componentsPath"
                value={componentsPath}
                onChange={(e) => setComponentsPath(e.target.value)}
                placeholder="components"
                className="w-full px-3 py-2 bg-signoz-bg-surface border border-signoz-text-muted rounded-md text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-2 focus:ring-signoz-primary focus:border-transparent"
              />
              <p className="text-xs text-signoz-text-muted mt-1">
                Path to MDX components (for future dynamic loading)
              </p>
            </div>

            {error && (
              <div className="text-signoz-error text-sm">{error}</div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-signoz-primary text-white font-medium rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-signoz-primary focus:ring-offset-2 focus:ring-offset-signoz-bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Opening...' : 'Select signoz.io Folder'}
              </button>
            </div>

            <div className="text-xs text-signoz-text-muted text-center space-y-1">
              <p>Your browser will ask for permission to access files</p>
              <p className="text-yellow-500">
                Make sure Next.js dev server is running before selecting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
