import { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode
  /** Custom fallback UI to show on error */
  fallback?: ReactNode
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Key to trigger reset when changed */
  resetKey?: string | number
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - Catches runtime errors in child components.
 * Displays a friendly error message with option to retry.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.reset()
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onReset: () => void
}

/**
 * Default error fallback UI
 */
function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 h-full bg-signoz-bg-ink"
      role="alert"
      data-testid="error-boundary-fallback"
    >
      <div className="max-w-lg w-full bg-signoz-bg-elevated rounded-lg border border-red-500/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="w-5 h-5 text-red-500"
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
          </div>
          <div>
            <h3 className="text-lg font-semibold text-signoz-text-primary">
              Preview Error
            </h3>
            <p className="text-sm text-signoz-text-secondary">
              Something went wrong while rendering the preview
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-signoz-text-primary mb-2">
              Error Message
            </h4>
            <pre className="p-3 bg-signoz-bg-ink rounded text-sm text-red-400 overflow-auto max-h-32 font-mono">
              {error.message}
            </pre>
          </div>
        )}

        {errorInfo?.componentStack && (
          <details className="mb-4">
            <summary className="text-sm font-medium text-signoz-text-secondary cursor-pointer hover:text-signoz-text-primary">
              Component Stack
            </summary>
            <pre className="mt-2 p-3 bg-signoz-bg-ink rounded text-xs text-signoz-text-muted overflow-auto max-h-40 font-mono">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}

        <button
          onClick={onReset}
          className="w-full px-4 py-2 bg-signoz-accent hover:bg-signoz-accent-hover text-white rounded-md transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary
