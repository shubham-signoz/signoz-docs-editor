import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@/contexts'
import { WORKSPACE_SESSION_STORAGE_KEY } from '@/hooks/useWorkspaceSession'
import { Editor } from '../Editor'

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockUseApi = vi.fn()
const mockUseSignozComponents = vi.fn()

vi.mock('@/hooks/useApi', () => ({
  useApi: () => mockUseApi(),
}))

vi.mock('@/hooks/useSignozComponents', () => ({
  useSignozComponents: () => mockUseSignozComponents(),
}))

vi.mock('../CodePane', () => ({
  CodePane: ({
    value,
    onChange,
    onCursorChange,
  }: {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (position: { line: number; column: number; offset: number }) => void
  }) => (
    <textarea
      aria-label="Code pane"
      data-testid="code-pane"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClick={() => onCursorChange?.({ line: 1, column: 1, offset: 0 })}
    />
  ),
}))

vi.mock('../PreviewPane', () => ({
  PreviewPane: ({ mdxSource }: { mdxSource: string }) => (
    <div data-testid="preview-pane">{mdxSource}</div>
  ),
}))

vi.mock('../ComponentPicker', () => ({
  ComponentPicker: () => null,
}))

function renderEditor() {
  return render(
    <ThemeProvider>
      <Editor />
    </ThemeProvider>
  )
}

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    mockReadFile.mockResolvedValue('# Loaded doc')
    mockWriteFile.mockResolvedValue(true)
    mockUseApi.mockReturnValue({
      config: {
        signozDir: '/tmp/signoz',
        docsPath: 'data/docs',
        docsRoot: '/tmp/signoz/data/docs',
        componentsDir: '/tmp/signoz/components',
      },
      tree: [
        {
          name: 'guides',
          path: 'guides',
          type: 'directory',
          children: [
            {
              name: 'intro.mdx',
              path: 'guides/intro.mdx',
              type: 'file',
            },
          ],
        },
      ],
      components: [
        {
          name: 'Callout',
          importName: 'Callout',
          importPath: './Callout',
          resolvedPath: 'Callout',
          category: 'general',
        },
      ],
      isLoading: false,
      error: null,
      readFile: mockReadFile,
      writeFile: mockWriteFile,
    })
    mockUseSignozComponents.mockReturnValue({
      components: { Callout: () => null },
      isLoading: false,
      errors: {},
    })
  })

  it('keeps the tree collapsed by default', () => {
    renderEditor()

    expect(screen.getByText('guides')).toBeInTheDocument()
    expect(screen.queryByText('intro.mdx')).not.toBeInTheDocument()
  })

  it('opens a file after expanding its folder', async () => {
    renderEditor()

    fireEvent.click(screen.getByText('guides'))
    fireEvent.click(screen.getByText('intro.mdx'))

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('guides/intro.mdx')
    })

    expect(
      await screen.findByRole('heading', { name: 'guides/intro.mdx' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('preview-pane')).toHaveTextContent('# Loaded doc')
  })

  it('restores the previous session selection and expanded folders', async () => {
    window.localStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify({
        selectedFile: 'guides/intro.mdx',
        openFiles: ['guides/intro.mdx'],
        recentFiles: ['guides/intro.mdx'],
        expandedPaths: ['guides'],
        sidebarCollapsed: false,
      })
    )

    renderEditor()

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('guides/intro.mdx')
    })

    expect(
      await screen.findByRole('heading', { name: 'guides/intro.mdx' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Open files appear here and are restored next session.')).not.toBeInTheDocument()
  })

  it('drops stale open files and falls back to the last valid open file during restore', async () => {
    window.localStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify({
        selectedFile: 'guides/missing.mdx',
        openFiles: ['guides/missing.mdx', 'guides/intro.mdx'],
        recentFiles: ['guides/missing.mdx', 'guides/intro.mdx'],
        expandedPaths: ['guides'],
        sidebarCollapsed: false,
      })
    )

    renderEditor()

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('guides/intro.mdx')
    })

    expect(
      await screen.findByRole('heading', { name: 'guides/intro.mdx' })
    ).toBeInTheDocument()
    expect(screen.queryByText('missing.mdx')).not.toBeInTheDocument()
    expect(screen.getAllByText('intro.mdx').length).toBeGreaterThan(0)
  })

  it('restores the last valid open file when no selected file is persisted', async () => {
    window.localStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify({
        selectedFile: null,
        openFiles: ['guides/intro.mdx'],
        recentFiles: ['guides/intro.mdx'],
        expandedPaths: ['guides'],
        sidebarCollapsed: false,
      })
    )

    renderEditor()

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('guides/intro.mdx')
    })

    expect(
      await screen.findByRole('heading', { name: 'guides/intro.mdx' })
    ).toBeInTheDocument()
  })
})
