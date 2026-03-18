import React, { useState, useCallback, useEffect, useRef } from 'react'

interface InsertWidgetProps {
  /** Callback when the widget is clicked to open component picker */
  onClick: () => void
  /** Whether the widget should be visible */
  isVisible?: boolean
}

/**
 * InsertWidget - Floating action button in the preview pane
 * for quick component insertion.
 */
export function InsertWidget({ onClick, isVisible = true }: InsertWidgetProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTooltipTimeout = useCallback(() => {
    if (tooltipTimeoutRef.current !== null) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    clearTooltipTimeout()
    // Show tooltip after a short delay
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 500)
  }, [clearTooltipTimeout])

  const handleMouseLeave = useCallback(() => {
    clearTooltipTimeout()
    setIsHovered(false)
    setShowTooltip(false)
  }, [clearTooltipTimeout])

  useEffect(() => clearTooltipTimeout, [clearTooltipTimeout])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    },
    [onClick]
  )

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
  const shortcutKey = isMac ? 'Cmd' : 'Ctrl'

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-signoz-bg-base border border-signoz-bg-surface rounded-md shadow-lg whitespace-nowrap"
          role="tooltip"
        >
          <span className="text-sm text-signoz-text-primary">Insert Component</span>
          <span className="ml-2 text-xs text-signoz-text-muted">
            {shortcutKey}+Shift+I
          </span>
        </div>
      )}

      {/* FAB Button */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          flex items-center justify-center
          w-14 h-14
          rounded-full
          bg-signoz-primary hover:bg-signoz-primary/90
          text-white
          shadow-lg hover:shadow-xl
          transition-all duration-200 ease-in-out
          ${isHovered ? 'scale-110' : 'scale-100'}
          focus:outline-none focus:ring-2 focus:ring-signoz-primary/50 focus:ring-offset-2 focus:ring-offset-signoz-bg-ink
        `}
        aria-label={`Insert Component (${shortcutKey}+Shift+I)`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform duration-200 ${isHovered ? 'rotate-90' : 'rotate-0'}`}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Hook to manage the InsertWidget visibility and keyboard shortcut
 */
export function useInsertWidget(onInsert: () => void) {
  const [isVisible, setIsVisible] = useState(true)

  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Shift+I (Mac) or Ctrl+Shift+I (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modifierKey = isMac ? e.metaKey : e.ctrlKey

      if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        onInsert()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onInsert])

  const show = useCallback(() => setIsVisible(true), [])
  const hide = useCallback(() => setIsVisible(false), [])
  const toggle = useCallback(() => setIsVisible((prev) => !prev), [])

  return {
    isVisible,
    show,
    hide,
    toggle,
  }
}
