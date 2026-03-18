import React, { useState, useCallback } from 'react'

interface InsertionMarkerProps {
  /** Callback when the marker is clicked to insert a component */
  onClick: () => void
  /** Top position of the marker */
  top: number
  /** Whether the marker should be visible (controlled externally) */
  isVisible?: boolean
}

/**
 * InsertionMarker - A subtle "+" button that appears between elements
 * to allow inserting components at that position.
 */
export function InsertionMarker({
  onClick,
  top,
  isVisible = false,
}: InsertionMarkerProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    },
    [onClick]
  )

  const shouldShow = isVisible || isHovered

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-10"
      style={{ top }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`
          flex items-center justify-center
          w-6 h-6
          rounded-full
          bg-signoz-primary/80 hover:bg-signoz-primary
          text-white
          shadow-md hover:shadow-lg
          transition-all duration-200 ease-in-out
          ${shouldShow ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          focus:outline-none focus:ring-2 focus:ring-signoz-primary/50 focus:ring-offset-2 focus:ring-offset-signoz-bg-elevated
        `}
        aria-label="Insert component here"
        tabIndex={shouldShow ? 0 : -1}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}

interface InsertionMarkerContainerProps {
  /** Array of positions (top values) where markers should appear */
  positions: number[]
  /** Callback when a marker is clicked, receives the index */
  onInsert: (index: number) => void
  /** Index of the currently hovered marker (controlled by parent) */
  activeIndex?: number | null
}

/**
 * InsertionMarkerContainer - Manages multiple insertion markers.
 * Use this when you need to show insertion points between multiple elements.
 */
export function InsertionMarkerContainer({
  positions,
  onInsert,
  activeIndex = null,
}: InsertionMarkerContainerProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleMouseEnterArea = useCallback(
    (index: number) => () => {
      setHoveredIndex(index)
    },
    []
  )

  const handleMouseLeaveArea = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  return (
    <div className="relative">
      {positions.map((top, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 h-8 -translate-y-1/2 cursor-pointer"
          style={{ top }}
          onMouseEnter={handleMouseEnterArea(index)}
          onMouseLeave={handleMouseLeaveArea}
        >
          <InsertionMarker
            top={16} // Center within the hover area
            onClick={() => onInsert(index)}
            isVisible={hoveredIndex === index || activeIndex === index}
          />
        </div>
      ))}
    </div>
  )
}

interface UseInsertionMarkersOptions {
  /** Container element to calculate positions from */
  containerRef: React.RefObject<HTMLElement>
  /** Selector for elements to insert between */
  elementSelector: string
}

interface InsertionMarkersResult {
  /** Calculated positions for markers */
  positions: number[]
  /** Recalculate positions */
  recalculate: () => void
}

/**
 * Hook to calculate insertion marker positions between elements.
 */
export function useInsertionMarkers({
  containerRef,
  elementSelector,
}: UseInsertionMarkersOptions): InsertionMarkersResult {
  const [positions, setPositions] = useState<number[]>([])

  const recalculate = useCallback(() => {
    if (!containerRef.current) {
      setPositions([])
      return
    }

    const elements = containerRef.current.querySelectorAll(elementSelector)
    const containerRect = containerRef.current.getBoundingClientRect()
    const newPositions: number[] = []

    // Add position before first element
    if (elements.length > 0) {
      const firstElement = elements[0]
      if (firstElement) {
        const firstRect = firstElement.getBoundingClientRect()
        newPositions.push(firstRect.top - containerRect.top)
      }
    }

    // Add positions between elements
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      const bottom = rect.bottom - containerRect.top

      if (index < elements.length - 1) {
        const nextElement = elements[index + 1]
        if (nextElement) {
          const nextRect = nextElement.getBoundingClientRect()
          const nextTop = nextRect.top - containerRect.top
          // Position marker between elements
          newPositions.push((bottom + nextTop) / 2)
        }
      } else {
        // Position marker after last element
        newPositions.push(bottom + 8)
      }
    })

    setPositions(newPositions)
  }, [containerRef, elementSelector])

  return {
    positions,
    recalculate,
  }
}
