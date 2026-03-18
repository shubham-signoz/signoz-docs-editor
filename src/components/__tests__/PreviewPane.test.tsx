import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PreviewPane } from '../PreviewPane'
import * as mdxCompiler from '@/mdx-compiler'

describe('PreviewPane', () => {
  const compileMDXMock = vi.spyOn(mdxCompiler, 'compileMDX')

  beforeEach(() => {
    compileMDXMock.mockReset()
  })

  it('renders empty state for empty source without compiling', () => {
    render(<PreviewPane mdxSource="" />)

    expect(screen.getByTestId('preview-pane')).toBeInTheDocument()
    expect(screen.getByText(/Start typing MDX content/i)).toBeInTheDocument()
    expect(compileMDXMock).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<PreviewPane mdxSource="" className="custom-preview-class" />)
    expect(screen.getByTestId('preview-pane')).toHaveClass('custom-preview-class')
  })

  it('renders compiler output and forwards compile arguments', async () => {
    const components = {
      CustomButton: ({ children }: { children: React.ReactNode }) => (
        <button data-testid="custom-button">{children}</button>
      ),
    }

    compileMDXMock.mockResolvedValue({
      content: <h1>Compiled heading</h1>,
      error: null,
    })

    render(
      <PreviewPane
        mdxSource="# Hello"
        sourcePath="data/docs/example.mdx"
        components={components}
      />
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Compiled heading' })).toBeInTheDocument()
    expect(compileMDXMock).toHaveBeenCalledWith(
      '# Hello',
      components,
      'data/docs/example.mdx',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('shows loading state while compilation is pending', () => {
    compileMDXMock.mockReturnValue(new Promise(() => undefined))

    render(<PreviewPane mdxSource="# Loading" />)

    expect(screen.getByText('Compiling...')).toBeInTheDocument()
  })

  it('displays compilation errors returned by the compiler', async () => {
    compileMDXMock.mockResolvedValue({
      content: null,
      error: 'Unexpected token',
    })

    render(<PreviewPane mdxSource="<broken" />)

    expect(await screen.findByTestId('compilation-error')).toHaveTextContent('Unexpected token')
  })

  it('adds insertion markers and invokes onInsertRequest', async () => {
    const onInsertRequest = vi.fn()

    compileMDXMock.mockResolvedValue({
      content: (
        <>
          <p>First block</p>
          <p>Second block</p>
        </>
      ),
      error: null,
    })

    render(
      <PreviewPane
        mdxSource="# Test"
        onInsertRequest={onInsertRequest}
      />
    )

    const insertButtons = await screen.findAllByLabelText('Insert content here')
    expect(insertButtons).toHaveLength(2)

    fireEvent.click(insertButtons[1])
    expect(onInsertRequest).toHaveBeenCalledWith({ index: 1 })
  })
})
