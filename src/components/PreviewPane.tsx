import React, { useEffect, useState, useMemo, memo } from 'react'
import { compileMDX, CompilationResult } from '@/mdx-compiler'
import { ErrorBoundary } from './ErrorBoundary'

const EMPTY_COMPONENTS: Record<string, React.ComponentType<unknown>> = {}

export interface InsertPosition {
  index: number
  beforeElement?: string
  afterElement?: string
}

export interface EditableChange {
  elementType: string
  originalText: string
  newText: string
  lineNumber?: number
}

export interface PreviewPaneProps {
  mdxSource: string
  sourcePath?: string
  components?: Record<string, React.ComponentType<unknown>>
  onInsertRequest?: (position: InsertPosition) => void
  onContentEdit?: (change: EditableChange) => void
  enableBidirectionalEdit?: boolean
  className?: string
}
export const PreviewPane = memo(function PreviewPane({
  mdxSource,
  sourcePath,
  components = EMPTY_COMPONENTS,
  onInsertRequest,
  onContentEdit,
  enableBidirectionalEdit = false,
  className = '',
}: PreviewPaneProps) {
  const [result, setResult] = useState<CompilationResult>({
    content: null,
    error: null,
  })
  const [isCompiling, setIsCompiling] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const isEmptySource = mdxSource.trim().length === 0

  useEffect(() => {
    if (isEmptySource) {
      setResult({
        content: null,
        error: null,
      })
      setIsCompiling(false)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    async function compile() {
      setIsCompiling(true)
      try {
        const compilationResult = await compileMDX(mdxSource, components, sourcePath, {
          signal: abortController.signal,
        })
        if (!cancelled) {
          setResult(compilationResult)
          if (!compilationResult.error) {
            setResetKey((k) => k + 1)
          }
        }
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === 'AbortError')) {
          return
        }

        throw error
      } finally {
        if (!cancelled) {
          setIsCompiling(false)
        }
      }
    }

    compile()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [mdxSource, components, isEmptySource, sourcePath])

  const contentWithMarkers = useMemo(() => {
    if (!result.content) return null

    const wrappedContent = enableBidirectionalEdit ? (
      <EditableWrapper onContentEdit={(change) => onContentEdit?.(change)}>
        {result.content}
      </EditableWrapper>
    ) : (
      result.content
    )

    if (!onInsertRequest) {
      return wrappedContent
    }

    return (
      <InsertionWrapper onInsertClick={(index) => onInsertRequest({ index })}>
        {wrappedContent}
      </InsertionWrapper>
    )
  }, [result.content, onInsertRequest, enableBidirectionalEdit, onContentEdit])

  return (
    <div
      className={`h-full overflow-auto bg-signoz-bg-ink ${className}`}
      data-testid="preview-pane"
    >
      <div className="p-6 prose prose-invert max-w-none">
        {result.error && <CompilationError error={result.error} />}
        {isCompiling && !result.content && !result.error && (
          <div className="flex items-center gap-2 text-signoz-text-muted">
            <LoadingSpinner />
            <span>Compiling...</span>
          </div>
        )}
        {!result.error && result.content && (
          <ErrorBoundary resetKey={resetKey}>
            {contentWithMarkers}
          </ErrorBoundary>
        )}
        {!isCompiling && !result.error && !result.content && isEmptySource && (
          <div className="text-signoz-text-muted italic">
            Start typing MDX content to see a preview...
          </div>
        )}
      </div>
    </div>
  )
})

interface CompilationErrorProps {
  error: string
}

function CompilationError({ error }: CompilationErrorProps) {
  return (
    <div
      className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
      role="alert"
      data-testid="compilation-error"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-400 mb-1">
            Compilation Error
          </h4>
          <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface EditableWrapperProps {
  children: React.ReactNode
  onContentEdit: (change: EditableChange) => void
}

function EditableWrapper({ children, onContentEdit }: EditableWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const blurHandlersRef = React.useRef<Map<HTMLElement, (e: Event) => void>>(new Map())
  const [childrenKey, setChildrenKey] = useState(0)

  useEffect(() => {
    setChildrenKey(k => k + 1)
  }, [children])

  useEffect(() => {
    const container = containerRef.current
    if (!container || childrenKey === 0) return

    const timeoutId = setTimeout(() => {
      const editableSelectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote'
      const elements = container.querySelectorAll<HTMLElement>(editableSelectors)

      blurHandlersRef.current.forEach((handler, element) => {
        element.removeEventListener('blur', handler)
      })
      blurHandlersRef.current.clear()

      elements.forEach((element) => {
        if (element.closest('pre') || element.closest('code')) return

        const handleBlur = (e: Event) => {
          const target = e.target as HTMLElement
          const originalText = target.getAttribute('data-original-text')
          const elementType = target.getAttribute('data-element-type') || 'unknown'
          const newText = target.textContent || ''

          if (originalText && originalText !== newText) {
            onContentEdit({
              elementType,
              originalText,
              newText,
            })
            target.setAttribute('data-original-text', newText)
          }
        }

        element.contentEditable = 'true'
        element.setAttribute('data-original-text', element.textContent || '')
        element.setAttribute('data-element-type', element.tagName.toLowerCase())
        element.classList.add(
          'editable-element',
          'cursor-text',
          'hover:ring-1',
          'hover:ring-signoz-accent/30',
          'focus:ring-2',
          'focus:ring-signoz-accent/50',
          'focus:outline-none',
          'rounded',
          'px-1',
          '-mx-1'
        )
        element.addEventListener('blur', handleBlur)
        blurHandlersRef.current.set(element, handleBlur)
      })
    }, 50)

    return () => {
      clearTimeout(timeoutId)
      blurHandlersRef.current.forEach((handler, element) => {
        element.removeEventListener('blur', handler)
      })
      blurHandlersRef.current.clear()
    }
  }, [onContentEdit, childrenKey])

  return <div ref={containerRef}>{children}</div>
}

interface InsertionWrapperProps {
  children: React.ReactNode
  onInsertClick: (index: number) => void
}

function InsertionWrapper({ children, onInsertClick }: InsertionWrapperProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const childArray = React.Children.toArray(children)

  if (childArray.length === 0) {
    return (
      <InsertionMarker
        isHovered={hoveredIndex === 0}
        onHover={() => setHoveredIndex(0)}
        onLeave={() => setHoveredIndex(null)}
        onClick={() => onInsertClick(0)}
      />
    )
  }

  return (
    <>
      <InsertionMarker
        isHovered={hoveredIndex === 0}
        onHover={() => setHoveredIndex(0)}
        onLeave={() => setHoveredIndex(null)}
        onClick={() => onInsertClick(0)}
      />
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          <InsertionMarker
            isHovered={hoveredIndex === index + 1}
            onHover={() => setHoveredIndex(index + 1)}
            onLeave={() => setHoveredIndex(null)}
            onClick={() => onInsertClick(index + 1)}
          />
        </React.Fragment>
      ))}
    </>
  )
}

interface InsertionMarkerProps {
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}

function InsertionMarker({
  isHovered,
  onHover,
  onLeave,
  onClick,
}: InsertionMarkerProps) {
  return (
    <div
      className={`
        relative h-2 -my-1 cursor-pointer transition-all duration-150
        ${isHovered ? 'h-8 my-1' : ''}
      `}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      data-testid="insertion-marker"
    >
      <div
        className={`
          absolute inset-x-0 top-1/2 -translate-y-1/2
          flex items-center justify-center
          transition-opacity duration-150
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div className="flex-1 h-px bg-signoz-accent/50" />
        <button
          className="
            flex items-center justify-center
            w-6 h-6 mx-2
            bg-signoz-accent hover:bg-signoz-accent-hover
            rounded-full
            text-white text-lg font-medium
            transition-colors
          "
          aria-label="Insert content here"
        >
          +
        </button>
        <div className="flex-1 h-px bg-signoz-accent/50" />
      </div>
    </div>
  )
}

export default PreviewPane
