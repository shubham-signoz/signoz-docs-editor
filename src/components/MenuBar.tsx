import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { DiscoveredComponent, ComponentCategory } from '@/types'

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

interface MenuBarProps {
  /** Available components for the Insert menu */
  components: DiscoveredComponent[]
  /** File operations */
  onNewFile?: () => void
  onOpenFile?: () => void
  onSaveFile?: () => void
  onSaveFileAs?: () => void
  /** Edit operations */
  onUndo?: () => void
  onRedo?: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  /** Insert operations */
  onInsertComponent?: (component: DiscoveredComponent) => void
  onInsertLink?: () => void
  onInsertImage?: () => void
  onInsertCodeBlock?: () => void
  /** View operations */
  onToggleSplitView?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  /** Current state */
  isSplitView?: boolean
  hasUnsavedChanges?: boolean
}

interface MenuItemData {
  label?: string
  shortcut?: string
  onClick?: () => void
  divider?: boolean
  disabled?: boolean
  submenu?: MenuItemData[]
}

interface MenuDropdownProps {
  label: string
  items: MenuItemData[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

function MenuDropdown({ label, items, isOpen, onOpen, onClose }: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSubmenuOpen(null)
    }
  }, [isOpen])

  const renderMenuItem = (item: MenuItemData, index: number) => {
    if (item.divider) {
      return (
        <div key={index} className="my-1 h-px bg-signoz-bg-surface" role="separator" />
      )
    }

    if (item.submenu) {
      return (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() => setSubmenuOpen(item.label ?? null)}
          onMouseLeave={() => setSubmenuOpen(null)}
        >
          <button
            type="button"
            className={`
              w-full px-3 py-1.5 text-left text-sm
              flex items-center justify-between
              transition-colors
              ${
                submenuOpen === item.label
                  ? 'bg-signoz-primary/20 text-signoz-text-primary'
                  : 'text-signoz-text-secondary hover:bg-signoz-bg-surface hover:text-signoz-text-primary'
              }
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={item.disabled}
          >
            <span>{item.label}</span>
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
          </button>
          {submenuOpen === item.label && (
            <div
              className="absolute left-full top-0 ml-0.5 bg-signoz-bg-elevated border border-signoz-bg-surface rounded-md shadow-lg py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
              role="menu"
            >
              {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={item.label}
        type="button"
        className={`
          w-full px-3 py-1.5 text-left text-sm
          flex items-center justify-between
          text-signoz-text-secondary hover:bg-signoz-bg-surface hover:text-signoz-text-primary
          transition-colors
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick()
            onClose()
          }
        }}
        disabled={item.disabled}
      >
        <span>{item.label}</span>
        {item.shortcut && (
          <span className="text-xs text-signoz-text-muted ml-4">{item.shortcut}</span>
        )}
      </button>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className={`
          px-3 py-1 text-sm
          transition-colors
          ${
            isOpen
              ? 'bg-signoz-bg-surface text-signoz-text-primary'
              : 'text-signoz-text-secondary hover:text-signoz-text-primary hover:bg-signoz-bg-surface/50'
          }
        `}
        onClick={isOpen ? onClose : onOpen}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {label}
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-0.5 bg-signoz-bg-elevated border border-signoz-bg-surface rounded-md shadow-lg py-1 min-w-[200px] z-50"
          role="menu"
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  )
}

export function MenuBar({
  components,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onInsertComponent,
  onInsertLink,
  onInsertImage,
  onInsertCodeBlock,
  onToggleSplitView,
  onZoomIn,
  onZoomOut,
  isSplitView = false,
  hasUnsavedChanges = false,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenu])

  // Group components by category for Insert menu
  const componentSubmenuItems = React.useMemo(() => {
    const grouped: Partial<Record<ComponentCategory, DiscoveredComponent[]>> = {}

    for (const component of components) {
      if (!grouped[component.category]) {
        grouped[component.category] = []
      }
      grouped[component.category]!.push(component)
    }

    const items: MenuItemData[] = []

    for (const category of categoryOrder) {
      const categoryComponents = grouped[category]
      if (categoryComponents && categoryComponents.length > 0) {
        items.push({
          label: categoryLabels[category],
          submenu: categoryComponents.map((c) => ({
            label: c.name,
            onClick: () => onInsertComponent?.(c),
          })),
        })
      }
    }

    return items
  }, [components, onInsertComponent])

  // File menu items
  const fileMenuItems: MenuItemData[] = [
    { label: 'New', shortcut: 'Cmd+N', onClick: onNewFile },
    { label: 'Open...', shortcut: 'Cmd+O', onClick: onOpenFile },
    { divider: true },
    { label: 'Save', shortcut: 'Cmd+S', onClick: onSaveFile, disabled: !hasUnsavedChanges },
    { label: 'Save As...', shortcut: 'Cmd+Shift+S', onClick: onSaveFileAs },
  ]

  // Edit menu items
  const editMenuItems: MenuItemData[] = [
    { label: 'Undo', shortcut: 'Cmd+Z', onClick: onUndo },
    { label: 'Redo', shortcut: 'Cmd+Shift+Z', onClick: onRedo },
    { divider: true },
    { label: 'Cut', shortcut: 'Cmd+X', onClick: onCut },
    { label: 'Copy', shortcut: 'Cmd+C', onClick: onCopy },
    { label: 'Paste', shortcut: 'Cmd+V', onClick: onPaste },
  ]

  // Insert menu items
  const insertMenuItems: MenuItemData[] = [
    {
      label: 'Component',
      submenu: componentSubmenuItems.length > 0 ? componentSubmenuItems : [{ label: 'No components available', disabled: true }],
    },
    { divider: true },
    { label: 'Link', shortcut: 'Cmd+K', onClick: onInsertLink },
    { label: 'Image', shortcut: 'Cmd+Shift+I', onClick: onInsertImage },
    { label: 'Code Block', shortcut: 'Cmd+Shift+C', onClick: onInsertCodeBlock },
  ]

  // View menu items
  const viewMenuItems: MenuItemData[] = [
    {
      label: isSplitView ? 'Hide Preview' : 'Show Preview',
      shortcut: 'Cmd+\\',
      onClick: onToggleSplitView,
    },
    { divider: true },
    { label: 'Zoom In', shortcut: 'Cmd++', onClick: onZoomIn },
    { label: 'Zoom Out', shortcut: 'Cmd+-', onClick: onZoomOut },
  ]

  const handleOpenMenu = useCallback((menuName: string) => {
    setOpenMenu(menuName)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(null)
  }, [])

  return (
    <div
      ref={menuBarRef}
      className="flex items-center bg-signoz-bg-elevated border-b border-signoz-bg-surface"
      role="menubar"
      aria-label="Main menu"
    >
      <MenuDropdown
        label="File"
        items={fileMenuItems}
        isOpen={openMenu === 'file'}
        onOpen={() => handleOpenMenu('file')}
        onClose={handleCloseMenu}
      />
      <MenuDropdown
        label="Edit"
        items={editMenuItems}
        isOpen={openMenu === 'edit'}
        onOpen={() => handleOpenMenu('edit')}
        onClose={handleCloseMenu}
      />
      <MenuDropdown
        label="Insert"
        items={insertMenuItems}
        isOpen={openMenu === 'insert'}
        onOpen={() => handleOpenMenu('insert')}
        onClose={handleCloseMenu}
      />
      <MenuDropdown
        label="View"
        items={viewMenuItems}
        isOpen={openMenu === 'view'}
        onOpen={() => handleOpenMenu('view')}
        onClose={handleCloseMenu}
      />
    </div>
  )
}
