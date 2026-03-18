import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilePicker } from '../FilePicker'
import type { FileIndexItem } from '@/hooks/useFileIndex'

// Mock file data for testing
const mockFiles: FileIndexItem[] = [
  {
    path: 'getting-started/installation.mdx',
    name: 'installation.mdx',
    title: 'Installation Guide',
    description: 'How to install SigNoz',
    tags: ['setup', 'installation'],
    lastModified: Date.now(),
    extension: '.mdx',
    directory: 'getting-started',
  },
  {
    path: 'getting-started/quickstart.mdx',
    name: 'quickstart.mdx',
    title: 'Quick Start',
    description: 'Get started quickly',
    tags: ['setup', 'quickstart'],
    lastModified: Date.now() - 1000,
    extension: '.mdx',
    directory: 'getting-started',
  },
  {
    path: 'guides/traces/overview.mdx',
    name: 'overview.mdx',
    title: 'Traces Overview',
    description: 'Understanding distributed tracing',
    tags: ['traces', 'overview'],
    lastModified: Date.now() - 2000,
    extension: '.mdx',
    directory: 'guides/traces',
  },
  {
    path: 'api-reference/query.md',
    name: 'query.md',
    title: 'Query API',
    description: 'Query API documentation',
    tags: ['api', 'reference'],
    lastModified: Date.now() - 3000,
    extension: '.md',
    directory: 'api-reference',
  },
  {
    path: 'troubleshooting.mdx',
    name: 'troubleshooting.mdx',
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    tags: ['help', 'troubleshooting'],
    lastModified: Date.now() - 4000,
    extension: '.mdx',
    directory: '',
  },
]

describe('FilePicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectFile: vi.fn(),
    files: mockFiles,
    recentFiles: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<FilePicker {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<FilePicker {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display all files when no search query', () => {
      render(<FilePicker {...defaultProps} />)
      expect(screen.getByText('Installation Guide')).toBeInTheDocument()
      expect(screen.getByText('Quick Start')).toBeInTheDocument()
      expect(screen.getByText('Traces Overview')).toBeInTheDocument()
      expect(screen.getByText('Query API')).toBeInTheDocument()
      expect(screen.getByText('Troubleshooting')).toBeInTheDocument()
    })

    it('should show file count in footer', () => {
      render(<FilePicker {...defaultProps} />)
      expect(screen.getByText('5 files')).toBeInTheDocument()
    })

    it('should show loading state when isLoading is true', () => {
      render(<FilePicker {...defaultProps} isLoading={true} files={[]} />)
      expect(screen.getByText('Indexing files...')).toBeInTheDocument()
    })

    it('should show placeholder text in search input', () => {
      render(<FilePicker {...defaultProps} placeholder="Find a doc..." />)
      expect(screen.getByPlaceholderText('Find a doc...')).toBeInTheDocument()
    })
  })

  describe('Fuzzy Search', () => {
    it('should filter files based on title search', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, 'install')

      expect(screen.getByText('Installation Guide')).toBeInTheDocument()
      expect(screen.queryByText('Troubleshooting')).not.toBeInTheDocument()
    })

    it('should filter files based on filename search', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, 'query.md')

      expect(screen.getByText('Query API')).toBeInTheDocument()
      expect(screen.queryByText('Installation Guide')).not.toBeInTheDocument()
    })

    it('should filter files based on path search', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, 'guides/traces')

      expect(screen.getByText('Traces Overview')).toBeInTheDocument()
    })

    it('should show empty state when no files match search', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, 'xyz123nonexistent')

      expect(
        screen.getByText(/No files found for "xyz123nonexistent"/)
      ).toBeInTheDocument()
    })

    it('should perform fuzzy matching', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      // "qkstrt" should fuzzy match "quickstart"
      await user.type(input, 'qkstrt')

      // With fuzzy matching, Quick Start should still appear
      // (threshold of 0.4 should allow this)
      expect(screen.getByText('Quick Start')).toBeInTheDocument()
    })
  })

  describe('Recent Files', () => {
    it('should show recent files section when recentFiles provided', () => {
      render(
        <FilePicker
          {...defaultProps}
          recentFiles={['getting-started/installation.mdx']}
        />
      )

      const recentSections = screen.getAllByText('Recent')
      expect(recentSections.length).toBeGreaterThan(0)
      expect(recentSections[0]).toBeInTheDocument()
    })

    it('should mark recent files with a badge', () => {
      render(
        <FilePicker
          {...defaultProps}
          recentFiles={['getting-started/installation.mdx']}
        />
      )

      // Recent badge should be visible
      const recentBadges = screen.getAllByText('Recent')
      expect(recentBadges.length).toBeGreaterThan(0)
    })

    it('should show recent files at the top', () => {
      render(
        <FilePicker
          {...defaultProps}
          recentFiles={['troubleshooting.mdx']}
        />
      )

      // The Recent section header should appear before All Files
      const headers = screen.getAllByText(/Recent|All Files/)
      expect(headers[0]).toHaveTextContent('Recent')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should call onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, '{Escape}')

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('should navigate down with ArrowDown', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, '{ArrowDown}')

      // Second item should now be selected
      // We can verify by pressing Enter and checking which file was selected
      await user.type(input, '{Enter}')

      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        mockFiles[1].path
      )
    })

    it('should navigate up with ArrowUp', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')

      // First go down, then up
      await user.type(input, '{ArrowDown}')
      await user.type(input, '{ArrowUp}')
      await user.type(input, '{Enter}')

      // Should be back at first item
      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        mockFiles[0].path
      )
    })

    it('should select file with Enter', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, '{Enter}')

      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        mockFiles[0].path
      )
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should not navigate past the last item', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')

      // Press down more times than there are items
      for (let i = 0; i < 10; i++) {
        await user.type(input, '{ArrowDown}')
      }

      await user.type(input, '{Enter}')

      // Should select the last item
      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        mockFiles[mockFiles.length - 1].path
      )
    })

    it('should not navigate before the first item', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')

      // Press up multiple times
      for (let i = 0; i < 5; i++) {
        await user.type(input, '{ArrowUp}')
      }

      await user.type(input, '{Enter}')

      // Should still be at first item
      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        mockFiles[0].path
      )
    })
  })

  describe('Mouse Interaction', () => {
    it('should select file on click', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const fileItem = screen.getByText('Traces Overview')
      await user.click(fileItem)

      expect(defaultProps.onSelectFile).toHaveBeenCalledWith(
        'guides/traces/overview.mdx'
      )
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should close when clicking backdrop', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      // Click the backdrop (the semi-transparent overlay)
      const backdrop = document.querySelector('.bg-black.bg-opacity-50')
      if (backdrop) {
        await user.click(backdrop)
      }

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Empty States', () => {
    it('should show no files indexed message when files array is empty', () => {
      render(<FilePicker {...defaultProps} files={[]} />)
      expect(screen.getByText('No files indexed')).toBeInTheDocument()
    })

    it('should show empty search message with query', async () => {
      const user = userEvent.setup()
      render(<FilePicker {...defaultProps} />)

      const input = screen.getByPlaceholderText('Search files...')
      await user.type(input, 'nonexistentfile')

      expect(
        screen.getByText(/No files found for "nonexistentfile"/)
      ).toBeInTheDocument()
      expect(
        screen.getByText('Try a different search term')
      ).toBeInTheDocument()
    })
  })

  describe('File Display', () => {
    it('should show file title and path', () => {
      render(<FilePicker {...defaultProps} />)

      const title = screen.getByText('Installation Guide')
      const fileItem = title.closest('button')

      expect(fileItem).not.toBeNull()
      if (fileItem) {
        expect(within(fileItem).getByText('installation.mdx')).toBeInTheDocument()
        expect(within(fileItem).getByText('getting-started')).toBeInTheDocument()
      }
    })

    it('should use filename if title is not available', () => {
      const filesWithoutTitle: FileIndexItem[] = [
        {
          path: 'test.mdx',
          name: 'test.mdx',
          lastModified: Date.now(),
          extension: '.mdx',
          directory: '',
        },
      ]

      render(<FilePicker {...defaultProps} files={filesWithoutTitle} />)
      expect(screen.getByText('test.mdx')).toBeInTheDocument()
    })
  })
})
