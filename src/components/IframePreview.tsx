import { useState, useEffect, useRef } from 'react'

export interface IframePreviewProps {
  /** Base URL of the Next.js dev server */
  baseUrl: string
  /** Current file path being edited (e.g., "docs/introduction.mdx") */
  filePath: string | null
  /** Callback when iframe loads */
  onLoad?: () => void
  /** Callback on iframe error */
  onError?: (error: string) => void
}

/**
 * Converts a file path to a URL path for the Next.js dev server.
 * e.g., "docs/introduction.mdx" -> "/docs/introduction"
 */
function filePathToUrl(filePath: string): string {
  // Remove file extension
  let url = filePath.replace(/\.(mdx?|tsx?)$/, '')

  // Handle index files
  if (url.endsWith('/index')) {
    url = url.slice(0, -6)
  }

  // Ensure leading slash
  if (!url.startsWith('/')) {
    url = '/' + url
  }

  return url
}

/**
 * IframePreview - Renders the actual Next.js page in an iframe.
 * This allows real component rendering from the signoz.io dev server.
 */
export function IframePreview({
  baseUrl,
  filePath,
  onLoad,
  onError,
}: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  // Construct the full URL
  const pageUrl = filePath ? `${baseUrl}${filePathToUrl(filePath)}` : null

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false)
    setError(null)
    onLoad?.()
  }

  // Handle iframe error
  const handleError = () => {
    const errorMsg = 'Failed to load preview. Is the Next.js dev server running?'
    setError(errorMsg)
    setIsLoading(false)
    onError?.(errorMsg)
  }

  // Refresh the iframe
  const refresh = () => {
    setKey(k => k + 1)
    setIsLoading(true)
    setError(null)
  }

  // Set loading when URL changes
  useEffect(() => {
    if (pageUrl) {
      setIsLoading(true)
      setError(null)
    }
  }, [pageUrl])

  if (!pageUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-signoz-bg-ink text-signoz-text-muted">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>Select a file to preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-signoz-bg-ink">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-signoz-bg-elevated border-b border-signoz-bg-surface">
        <button
          onClick={refresh}
          className="p-1.5 hover:bg-signoz-bg-surface rounded transition-colors"
          title="Refresh preview"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <span className="text-xs text-signoz-text-muted truncate flex-1 font-mono">
          {pageUrl}
        </span>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-signoz-bg-surface rounded transition-colors"
          title="Open in new tab"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Preview area */}
      <div className="flex-1 relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-signoz-bg-ink bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 text-signoz-text-muted">
              <div className="w-6 h-6 border-2 border-signoz-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading preview...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 bg-signoz-bg-ink flex items-center justify-center z-10">
            <div className="text-center p-6 max-w-md">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-signoz-text-primary mb-2">{error}</p>
              <p className="text-sm text-signoz-text-muted mb-4">
                Make sure to run <code className="bg-signoz-bg-surface px-1 rounded">npm run dev</code> in the signoz.io directory
              </p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-signoz-primary text-white rounded hover:bg-opacity-90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          key={key}
          ref={iframeRef}
          src={pageUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          title="Page preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  )
}

export default IframePreview
