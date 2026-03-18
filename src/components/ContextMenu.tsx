import React, { useEffect, useRef, useCallback, useState } from 'react'
import type { DiscoveredComponent, Position, ComponentCategory } from '@/types'

interface ContextMenuProps {
  /** Position of the context menu */
  position: Position
  /** Whether the menu is open */
  isOpen: boolean
  /** Callback when the menu is closed */
  onClose: () => void
  /** Callback when insert component is selected */
  onInsertComponent: (component: DiscoveredComponent) => void
  /** Callback when insert link is selected */
  onInsertLink?: () => void
  /** Callback when insert image is selected */
  onInsertImage?: () => void
  /** Available components to insert */
  components: DiscoveredComponent[]
}

/** Category display labels */
const categoryLabels: Record<ComponentCategory, string> = {
  layout: 'Layout',
  navigation: 'Navigation',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  data: 'Data',
  utility: 'Utility',
  custom: 'Custom',
}

/** Category order for display */
const categoryOrder: ComponentCategory[] = [
  'content',
  'layout',
  'navigation',
  'media',
  'interactive',
  'data',
  'utility',
  'custom',
]

interface MenuItemProps {
  label: string
  shortcut?: string
  onClick: () => void
  hasSubmenu?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  isHighlighted?: boolean
}

function MenuItem({
  label,
  shortcut,
  onClick,
  hasSubmenu = false,
  onMouseEnter,
  onMouseLeave,
  isHighlighted = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      className={`
        w-full px-3 py-1.5 text-left text-sm
        flex items-center justify-between
        transition-colors
        ${
          isHighlighted
            ? 'bg-signoz-primary/20 text-signoz-text-primary'
            : 'text-signoz-text-secondary hover:bg-signoz-bg-surface hover:text-signoz-text-primary'
        }
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {shortcut && (
          <span className="text-xs text-signoz-text-muted">{shortcut}</span>
        )}
        {hasSubmenu && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </span>
    </button>
  )
}

interface SubmenuProps {
  components: DiscoveredComponent[]
  onSelect: (component: DiscoveredComponent) => void
  parentPosition: Position
}

function ComponentSubmenu({ components, onSelect, parentPosition: _parentPosition }: SubmenuProps) {
  // Group components by category
  const groupedComponents = React.useMemo(() => {
    const groups: Partial<Record<ComponentCategory, DiscoveredComponent[]>> = {}

    for (const component of components) {
      if (!groups[component.category]) {
        groups[component.category] = []
      }
      groups[component.category]!.push(component)
    }

    return groups
  }, [components])

  return (
    <div
      className="absolute bg-signoz-bg-elevated border border-signoz-bg-surface rounded-md shadow-lg py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
      style={{
        left: '100%',
        top: 0,
        marginLeft: '2px',
      }}
    >
      {categoryOrder.map((category) => {
        const categoryComponents = groupedComponents[category]
        if (!categoryComponents || categoryComponents.length === 0) {
          return null
        }

        return (
          <div key={category}>
            <div className="px-3 py-1 text-xs font-medium text-signoz-text-muted uppercase tracking-wide">
              {categoryLabels[category]}
            </div>
            {categoryComponents.map((component) => (
              <button
                key={component.name}
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm text-signoz-text-secondary hover:bg-signoz-bg-surface hover:text-signoz-text-primary transition-colors"
                onClick={() => onSelect(component)}
              >
                {component.name}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function ContextMenu({
  position,
  isOpen,
  onClose,
  onInsertComponent,
  onInsertLink,
  onInsertImage,
  components,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showComponentSubmenu, setShowComponentSubmenu] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let newX = position.x
      let newY = position.y

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 8
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 8
      }

      setAdjustedPosition({ x: Math.max(8, newX), y: Math.max(8, newY) })
    }
  }, [isOpen, position])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Use a small delay to prevent immediate closing from the context menu event
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Reset submenu state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setShowComponentSubmenu(false)
    }
  }, [isOpen])

  const handleInsertLink = useCallback(() => {
    onInsertLink?.()
    onClose()
  }, [onInsertLink, onClose])

  const handleInsertImage = useCallback(() => {
    onInsertImage?.()
    onClose()
  }, [onInsertImage, onClose])

  const handleSelectComponent = useCallback(
    (component: DiscoveredComponent) => {
      onInsertComponent(component)
      onClose()
    },
    [onInsertComponent, onClose]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-signoz-bg-elevated border border-signoz-bg-surface rounded-md shadow-lg py-1 min-w-[200px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      aria-label="Context menu"
    >
      {/* Insert Component with submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowComponentSubmenu(true)}
        onMouseLeave={() => setShowComponentSubmenu(false)}
      >
        <MenuItem
          label="Insert Component"
          shortcut="Cmd+Shift+I"
          onClick={() => setShowComponentSubmenu(!showComponentSubmenu)}
          hasSubmenu
          isHighlighted={showComponentSubmenu}
        />
        {showComponentSubmenu && components.length > 0 && (
          <ComponentSubmenu
            components={components}
            onSelect={handleSelectComponent}
            parentPosition={adjustedPosition}
          />
        )}
      </div>

      {/* Divider */}
      <div className="my-1 h-px bg-signoz-bg-surface" role="separator" />

      {/* Quick insert options */}
      <MenuItem
        label="Insert Link"
        shortcut="Cmd+K"
        onClick={handleInsertLink}
      />
      <MenuItem
        label="Insert Image"
        shortcut="Cmd+Shift+I"
        onClick={handleInsertImage}
      />
    </div>
  )
}

/**
 * Hook to manage context menu state
 */
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    position,
    openMenu,
    closeMenu,
  }
}
