import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuBar } from '../MenuBar'
import type { DiscoveredComponent } from '@/types'

const mockComponents: DiscoveredComponent[] = [
  {
    name: 'Admonition',
    category: 'content',
    description: 'A callout component',
    filePath: '/components/Admonition.tsx',
    props: [{ name: 'type', type: 'string', required: true }],
  },
  {
    name: 'CodeBlock',
    category: 'content',
    description: 'Code block component',
    filePath: '/components/CodeBlock.tsx',
    props: [{ name: 'language', type: 'string', required: true }],
  },
  {
    name: 'Grid',
    category: 'layout',
    description: 'Grid layout',
    filePath: '/components/Grid.tsx',
    props: [],
  },
  {
    name: 'Video',
    category: 'media',
    description: 'Video component',
    filePath: '/components/Video.tsx',
    props: [{ name: 'src', type: 'string', required: true }],
  },
]

describe('MenuBar', () => {
  const defaultProps = {
    components: mockComponents,
    onNewFile: vi.fn(),
    onOpenFile: vi.fn(),
    onSaveFile: vi.fn(),
    onSaveFileAs: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCut: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    onInsertComponent: vi.fn(),
    onInsertLink: vi.fn(),
    onInsertImage: vi.fn(),
    onInsertCodeBlock: vi.fn(),
    onToggleSplitView: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all menu buttons', () => {
      render(<MenuBar {...defaultProps} />)

      expect(screen.getByText('File')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Insert')).toBeInTheDocument()
      expect(screen.getByText('View')).toBeInTheDocument()
    })

    it('has proper menubar role', () => {
      render(<MenuBar {...defaultProps} />)

      expect(screen.getByRole('menubar')).toBeInTheDocument()
    })
  })

  describe('File Menu', () => {
    it('opens File menu when clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))

      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('Open...')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Save As...')).toBeInTheDocument()
    })

    it('shows keyboard shortcuts', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))

      expect(screen.getByText('Cmd+N')).toBeInTheDocument()
      expect(screen.getByText('Cmd+O')).toBeInTheDocument()
      expect(screen.getByText('Cmd+S')).toBeInTheDocument()
      expect(screen.getByText('Cmd+Shift+S')).toBeInTheDocument()
    })

    it('calls onNewFile when New is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))
      await user.click(screen.getByText('New'))

      expect(defaultProps.onNewFile).toHaveBeenCalled()
    })

    it('calls onOpenFile when Open is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))
      await user.click(screen.getByText('Open...'))

      expect(defaultProps.onOpenFile).toHaveBeenCalled()
    })

    it('disables Save when no unsaved changes', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} hasUnsavedChanges={false} />)

      await user.click(screen.getByText('File'))

      const saveButton = screen.getByText('Save').closest('button')
      expect(saveButton).toBeDisabled()
    })

    it('enables Save when there are unsaved changes', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} hasUnsavedChanges={true} />)

      await user.click(screen.getByText('File'))

      const saveButton = screen.getByText('Save').closest('button')
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('Edit Menu', () => {
    it('opens Edit menu when clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Edit'))

      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.getByText('Redo')).toBeInTheDocument()
      expect(screen.getByText('Cut')).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
      expect(screen.getByText('Paste')).toBeInTheDocument()
    })

    it('calls onUndo when Undo is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Edit'))
      await user.click(screen.getByText('Undo'))

      expect(defaultProps.onUndo).toHaveBeenCalled()
    })

    it('calls onRedo when Redo is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Edit'))
      await user.click(screen.getByText('Redo'))

      expect(defaultProps.onRedo).toHaveBeenCalled()
    })
  })

  describe('Insert Menu', () => {
    it('opens Insert menu when clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))

      expect(screen.getByText('Component')).toBeInTheDocument()
      expect(screen.getByText('Link')).toBeInTheDocument()
      expect(screen.getByText('Image')).toBeInTheDocument()
      expect(screen.getByText('Code Block')).toBeInTheDocument()
    })

    it('shows Component submenu on hover', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))

      // Hover over Component to show submenu
      const componentItem = screen.getByText('Component').closest('div')
      fireEvent.mouseEnter(componentItem!)

      // Should show category headers
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Layout')).toBeInTheDocument()
      expect(screen.getByText('Media')).toBeInTheDocument()
    })

    it('shows Component submenu with category headers on hover', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))

      // The Component item should exist
      expect(screen.getByText('Component')).toBeInTheDocument()

      // Hover over Component to show submenu (find the parent div with onMouseEnter handler)
      const componentButton = screen.getByText('Component')
      const componentItem = componentButton.closest('div.relative')
      if (componentItem) {
        fireEvent.mouseEnter(componentItem)
      }

      // After hover, check that category headers appear in the submenu
      // Note: The submenu shows category labels, not component names directly
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Layout')).toBeInTheDocument()
      expect(screen.getByText('Media')).toBeInTheDocument()
    })

    it('has Component submenu with proper nested structure', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))

      // Verify Component menu item is a submenu (has arrow icon)
      const componentButton = screen.getByText('Component').closest('button')
      expect(componentButton).toBeInTheDocument()

      // Check there's an SVG (arrow) indicating submenu
      const svg = componentButton?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('calls onInsertLink when Link is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))
      await user.click(screen.getByText('Link'))

      expect(defaultProps.onInsertLink).toHaveBeenCalled()
    })

    it('calls onInsertImage when Image is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))
      await user.click(screen.getByText('Image'))

      expect(defaultProps.onInsertImage).toHaveBeenCalled()
    })

    it('calls onInsertCodeBlock when Code Block is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('Insert'))
      await user.click(screen.getByText('Code Block'))

      expect(defaultProps.onInsertCodeBlock).toHaveBeenCalled()
    })

    it('shows no components message when components list is empty', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} components={[]} />)

      await user.click(screen.getByText('Insert'))

      const componentItem = screen.getByText('Component').closest('div')
      fireEvent.mouseEnter(componentItem!)

      expect(screen.getByText('No components available')).toBeInTheDocument()
    })
  })

  describe('View Menu', () => {
    it('opens View menu when clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('View'))

      expect(screen.getByText('Show Preview')).toBeInTheDocument()
      expect(screen.getByText('Zoom In')).toBeInTheDocument()
      expect(screen.getByText('Zoom Out')).toBeInTheDocument()
    })

    it('shows "Hide Preview" when split view is active', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} isSplitView={true} />)

      await user.click(screen.getByText('View'))

      expect(screen.getByText('Hide Preview')).toBeInTheDocument()
    })

    it('shows "Show Preview" when split view is inactive', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} isSplitView={false} />)

      await user.click(screen.getByText('View'))

      expect(screen.getByText('Show Preview')).toBeInTheDocument()
    })

    it('calls onToggleSplitView when preview toggle is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('View'))
      await user.click(screen.getByText('Show Preview'))

      expect(defaultProps.onToggleSplitView).toHaveBeenCalled()
    })

    it('calls onZoomIn when Zoom In is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('View'))
      await user.click(screen.getByText('Zoom In'))

      expect(defaultProps.onZoomIn).toHaveBeenCalled()
    })

    it('calls onZoomOut when Zoom Out is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('View'))
      await user.click(screen.getByText('Zoom Out'))

      expect(defaultProps.onZoomOut).toHaveBeenCalled()
    })
  })

  describe('Menu Interactions', () => {
    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <MenuBar {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      )

      await user.click(screen.getByText('File'))
      expect(screen.getByText('New')).toBeInTheDocument()

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'))

      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })

    it('closes menu when pressing Escape', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))
      expect(screen.getByText('New')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })

    it('closes menu after selecting an item', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      await user.click(screen.getByText('File'))
      await user.click(screen.getByText('New'))

      // Menu should be closed
      expect(screen.queryByText('Open...')).not.toBeInTheDocument()
    })

    it('switches between menus', async () => {
      const user = userEvent.setup()
      render(<MenuBar {...defaultProps} />)

      // Open File menu
      await user.click(screen.getByText('File'))
      expect(screen.getByText('New')).toBeInTheDocument()

      // Click Edit to switch
      await user.click(screen.getByText('Edit'))

      // Edit menu should be open, File menu should be closed
      expect(screen.queryByText('New')).not.toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })
  })
})
