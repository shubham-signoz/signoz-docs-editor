import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import type { DiscoveredComponent, ComponentCategory, RecentComponent } from '@/types'

const RECENT_COMPONENTS_KEY = 'signoz-doc-editor-recent-components'
const MAX_RECENT_COMPONENTS = 5

interface ComponentPickerProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal is closed */
  onClose: () => void
  /** Callback when a component is selected */
  onSelect: (component: DiscoveredComponent) => void
  /** List of available components */
  components: DiscoveredComponent[]
}

/** Get recent components from localStorage */
function getRecentComponents(): RecentComponent[] {
  try {
    const stored = localStorage.getItem(RECENT_COMPONENTS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

/** Save a component to recent list */
function saveRecentComponent(componentName: string): void {
  const recent = getRecentComponents()
  const existing = recent.find((r) => r.name === componentName)

  if (existing) {
    existing.timestamp = Date.now()
    existing.useCount += 1
  } else {
    recent.push({
      name: componentName,
      timestamp: Date.now(),
      useCount: 1,
    })
  }

  // Sort by timestamp and keep only the most recent
  const sorted = recent
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT_COMPONENTS)

  localStorage.setItem(RECENT_COMPONENTS_KEY, JSON.stringify(sorted))
}

/** Category display names */
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

/** Format props for display */
function formatPropsPreview(component: DiscoveredComponent): string {
  const requiredProps = component.props.filter((p) => p.required)
  if (requiredProps.length === 0) {
    return 'No required props'
  }
  const propNames = requiredProps.map((p) => p.name).slice(0, 3)
  const suffix = requiredProps.length > 3 ? `, +${requiredProps.length - 3} more` : ''
  return propNames.join(', ') + suffix
}

export function ComponentPicker({
  isOpen,
  onClose,
  onSelect,
  components,
}: ComponentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentComponents, setRecentComponents] = useState<RecentComponent[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fuse.js instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(components, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'description', weight: 0.3 },
        { name: 'category', weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
    })
  }, [components])

  // Filter components based on search query
  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) {
      return components
    }
    return fuse.search(searchQuery).map((result) => result.item)
  }, [fuse, searchQuery, components])

  // Get recent components that exist in the component list
  const recentComponentsList = useMemo(() => {
    return recentComponents
      .map((recent) => components.find((c) => c.name === recent.name))
      .filter((c): c is DiscoveredComponent => c !== undefined)
  }, [recentComponents, components])

  // Group components by category
  const groupedComponents = useMemo(() => {
    const groups: Partial<Record<ComponentCategory, DiscoveredComponent[]>> = {}

    for (const component of filteredComponents) {
      if (!groups[component.category]) {
        groups[component.category] = []
      }
      groups[component.category]!.push(component)
    }

    return groups
  }, [filteredComponents])

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const items: { component: DiscoveredComponent; isRecent?: boolean }[] = []

    // Add recent components first (only when not searching)
    if (!searchQuery.trim() && recentComponentsList.length > 0) {
      for (const component of recentComponentsList) {
        items.push({ component, isRecent: true })
      }
    }

    // Add grouped components
    for (const category of categoryOrder) {
      const categoryComponents = groupedComponents[category]
      if (categoryComponents) {
        for (const component of categoryComponents) {
          // Skip if already in recent
          if (!items.some((item) => item.component.name === component.name)) {
            items.push({ component })
          }
        }
      }
    }

    return items
  }, [groupedComponents, recentComponentsList, searchQuery])

  // Load recent components on mount
  useEffect(() => {
    if (isOpen) {
      setRecentComponents(getRecentComponents())
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredComponents])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]')
      if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Handle component selection
  const handleSelect = useCallback(
    (component: DiscoveredComponent) => {
      saveRecentComponent(component.name)
      onSelect(component)
      onClose()
    },
    [onSelect, onClose]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatList[selectedIndex]) {
            handleSelect(flatList[selectedIndex].component)
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatList, selectedIndex, handleSelect, onClose]
  )

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="component-picker-title"
    >
      <div
        className="w-full max-w-lg bg-signoz-bg-elevated border border-signoz-bg-surface rounded-lg shadow-xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-signoz-bg-surface">
          <h2 id="component-picker-title" className="text-lg font-semibold text-signoz-text-primary mb-2">
            Insert Component
          </h2>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full px-3 py-2 bg-signoz-bg-base border border-signoz-bg-surface rounded text-signoz-text-primary placeholder:text-signoz-text-muted focus:outline-none focus:border-signoz-primary"
            aria-label="Search components"
          />
        </div>

        {/* Component list */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Available components"
        >
          {flatList.length === 0 ? (
            <div className="px-4 py-8 text-center text-signoz-text-secondary">
              No components found
            </div>
          ) : (
            <>
              {/* Recent section */}
              {!searchQuery.trim() && recentComponentsList.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-medium text-signoz-text-muted uppercase tracking-wide">
                    Recent
                  </div>
                  {recentComponentsList.map((component, index) => {
                    const flatIndex = index
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <button
                        key={`recent-${component.name}`}
                        className={`w-full px-4 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-signoz-primary/20 text-signoz-text-primary'
                            : 'hover:bg-signoz-bg-surface text-signoz-text-secondary hover:text-signoz-text-primary'
                        }`}
                        onClick={() => handleSelect(component)}
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected}
                      >
                        <div className="font-medium">{component.name}</div>
                        <div className="text-xs text-signoz-text-muted">
                          {formatPropsPreview(component)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Category sections */}
              {categoryOrder.map((category) => {
                const categoryComponents = groupedComponents[category]
                if (!categoryComponents || categoryComponents.length === 0) {
                  return null
                }

                return (
                  <div key={category} className="py-2">
                    <div className="px-4 py-1 text-xs font-medium text-signoz-text-muted uppercase tracking-wide">
                      {categoryLabels[category]}
                    </div>
                    {categoryComponents.map((component) => {
                      const flatIndex = flatList.findIndex(
                        (item) => item.component.name === component.name && !item.isRecent
                      )
                      const isSelected = flatIndex === selectedIndex
                      return (
                        <button
                          key={component.name}
                          className={`w-full px-4 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-signoz-primary/20 text-signoz-text-primary'
                              : 'hover:bg-signoz-bg-surface text-signoz-text-secondary hover:text-signoz-text-primary'
                          }`}
                          onClick={() => handleSelect(component)}
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isSelected}
                        >
                          <div className="font-medium">{component.name}</div>
                          <div className="text-xs text-signoz-text-muted">
                            {formatPropsPreview(component)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2 border-t border-signoz-bg-surface bg-signoz-bg-base">
          <div className="flex items-center justify-between text-xs text-signoz-text-muted">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-signoz-bg-surface rounded text-signoz-text-secondary">
                  ↑↓
                </kbd>{' '}
                Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-signoz-bg-surface rounded text-signoz-text-secondary">
                  Enter
                </kbd>{' '}
                Select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-signoz-bg-surface rounded text-signoz-text-secondary">
                  Esc
                </kbd>{' '}
                Close
              </span>
            </div>
            <span>{filteredComponents.length} components</span>
          </div>
        </div>
      </div>
    </div>
  )
}
