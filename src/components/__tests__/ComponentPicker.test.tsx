import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentPicker } from '../ComponentPicker'
import type { DiscoveredComponent } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockComponents: DiscoveredComponent[] = [
  {
    name: 'Admonition',
    category: 'content',
    description: 'A callout component for notes, warnings, etc.',
    filePath: '/components/Admonition.tsx',
    props: [
      { name: 'type', type: 'string', required: true },
      { name: 'title', type: 'string', required: false },
    ],
  },
  {
    name: 'CodeBlock',
    category: 'content',
    description: 'Syntax highlighted code block',
    filePath: '/components/CodeBlock.tsx',
    props: [
      { name: 'language', type: 'string', required: true },
      { name: 'showLineNumbers', type: 'boolean', required: false },
    ],
  },
  {
    name: 'TabGroup',
    category: 'interactive',
    description: 'Tabbed content container',
    filePath: '/components/TabGroup.tsx',
    props: [
      { name: 'defaultTab', type: 'string', required: false },
    ],
  },
  {
    name: 'Image',
    category: 'media',
    description: 'Responsive image component',
    filePath: '/components/Image.tsx',
    props: [
      { name: 'src', type: 'string', required: true },
      { name: 'alt', type: 'string', required: true },
    ],
  },
  {
    name: 'Grid',
    category: 'layout',
    description: 'Grid layout component',
    filePath: '/components/Grid.tsx',
    props: [
      { name: 'columns', type: 'number', required: false },
    ],
  },
]

describe('ComponentPicker', () => {
  const mockOnClose = vi.fn()
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Rendering', () => {
    it('renders nothing when not open', () => {
      render(
        <ComponentPicker
          isOpen={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal when open', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Insert Component')).toBeInTheDocument()
    })

    it('renders all components grouped by category', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      // Check category headers
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Interactive')).toBeInTheDocument()
      expect(screen.getByText('Media')).toBeInTheDocument()
      expect(screen.getByText('Layout')).toBeInTheDocument()

      // Check component names
      expect(screen.getByText('Admonition')).toBeInTheDocument()
      expect(screen.getByText('CodeBlock')).toBeInTheDocument()
      expect(screen.getByText('TabGroup')).toBeInTheDocument()
      expect(screen.getByText('Image')).toBeInTheDocument()
      expect(screen.getByText('Grid')).toBeInTheDocument()
    })

    it('shows component count', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.getByText('5 components')).toBeInTheDocument()
    })

    it('displays keyboard hints', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.getByText('Navigate')).toBeInTheDocument()
      expect(screen.getByText('Select')).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('filters components based on search query', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.type(searchInput, 'code')

      // CodeBlock should be visible (matches "code")
      expect(screen.getByText('CodeBlock')).toBeInTheDocument()

      // Other components should be filtered out
      expect(screen.queryByText('Admonition')).not.toBeInTheDocument()
      expect(screen.queryByText('TabGroup')).not.toBeInTheDocument()
    })

    it('shows fuzzy search results', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.type(searchInput, 'admon')

      expect(screen.getByText('Admonition')).toBeInTheDocument()
    })

    it('shows empty state when no matches found', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.type(searchInput, 'xyz123nonexistent')

      expect(screen.getByText('No components found')).toBeInTheDocument()
    })

    it('updates component count based on filter', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.type(searchInput, 'code')

      expect(screen.getByText('1 components')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('calls onSelect when clicking a component', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      await user.click(screen.getByText('Admonition'))

      expect(mockOnSelect).toHaveBeenCalledWith(mockComponents[0])
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('saves selected component to recent', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      await user.click(screen.getByText('Admonition'))

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const setItemCall = localStorageMock.setItem.mock.calls[0]
      expect(setItemCall[0]).toBe('signoz-doc-editor-recent-components')

      const savedData = JSON.parse(setItemCall[1])
      expect(savedData[0].name).toBe('Admonition')
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates down with ArrowDown', async () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog.querySelector('div')!, { key: 'ArrowDown' })

      // Second item should be selected
      await waitFor(() => {
        const selectedItem = screen.getByRole('option', { selected: true })
        expect(selectedItem).toHaveTextContent('CodeBlock')
      })
    })

    it('navigates up with ArrowUp', async () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const dialog = screen.getByRole('dialog')
      const keyTarget = dialog.querySelector('div')!

      // Navigate down first
      fireEvent.keyDown(keyTarget, { key: 'ArrowDown' })
      fireEvent.keyDown(keyTarget, { key: 'ArrowDown' })

      // Then navigate up
      fireEvent.keyDown(keyTarget, { key: 'ArrowUp' })

      await waitFor(() => {
        const selectedItem = screen.getByRole('option', { selected: true })
        expect(selectedItem).toHaveTextContent('CodeBlock')
      })
    })

    it('selects with Enter key', async () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog.querySelector('div')!, { key: 'Enter' })

      // First item should be selected
      expect(mockOnSelect).toHaveBeenCalledWith(mockComponents[0])
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes with Escape key', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog.querySelector('div')!, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Recent Components', () => {
    it('displays recent components section', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([
          { name: 'Admonition', timestamp: Date.now(), useCount: 3 },
          { name: 'CodeBlock', timestamp: Date.now() - 1000, useCount: 1 },
        ])
      )

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.getByText('Recent')).toBeInTheDocument()
    })

    it('hides recent section when searching', async () => {
      const user = userEvent.setup()

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([
          { name: 'Admonition', timestamp: Date.now(), useCount: 3 },
        ])
      )

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      expect(screen.getByText('Recent')).toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.type(searchInput, 'code')

      expect(screen.queryByText('Recent')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'component-picker-title')

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveAttribute('aria-label', 'Available components')
    })

    it('focuses search input on open', () => {
      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      expect(document.activeElement).toBe(searchInput)
    })
  })

  describe('Click Outside', () => {
    it('closes when clicking backdrop', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const backdrop = screen.getByRole('dialog')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not close when clicking inside modal', async () => {
      const user = userEvent.setup()

      render(
        <ComponentPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          components={mockComponents}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search components...')
      await user.click(searchInput)

      // onClose should not be called just from clicking inside
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
