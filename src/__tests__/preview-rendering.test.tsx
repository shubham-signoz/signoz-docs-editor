import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewPane } from '../components/PreviewPane'
import * as mdxCompiler from '@/mdx-compiler'

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe('PreviewPane rendering', () => {
  const compileMDXMock = vi.spyOn(mdxCompiler, 'compileMDX')

  beforeEach(() => {
    compileMDXMock.mockReset()
  })

  it('shows the empty state and skips compilation for whitespace-only content', () => {
    render(<PreviewPane mdxSource="   " />)

    expect(screen.getByText('Start typing MDX content to see a preview...')).toBeInTheDocument()
    expect(compileMDXMock).not.toHaveBeenCalled()
  })

  it('passes source, components, and sourcePath to the compiler', async () => {
    const components = {
      Notice: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    }

    compileMDXMock.mockResolvedValue({
      content: <h1>Compiled</h1>,
      error: null,
    })

    render(
      <PreviewPane
        mdxSource="# Hello"
        sourcePath="data/docs/example.mdx"
        components={components}
      />
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Compiled' })).toBeInTheDocument()
    expect(compileMDXMock).toHaveBeenCalledWith(
      '# Hello',
      components,
      'data/docs/example.mdx',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('shows a loading state while compilation is pending', async () => {
    const deferred = createDeferred<{ content: React.ReactElement | null; error: string | null }>()
    compileMDXMock.mockReturnValue(deferred.promise)

    render(<PreviewPane mdxSource="# Hello" />)

    expect(screen.getByText('Compiling...')).toBeInTheDocument()

    deferred.resolve({
      content: <h1>Hello</h1>,
      error: null,
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument()
  })

  it('renders successful compilation output', async () => {
    compileMDXMock.mockResolvedValue({
      content: (
        <>
          <h1>Welcome</h1>
          <p>Rendered content</p>
        </>
      ),
      error: null,
    })

    render(<PreviewPane mdxSource="# Welcome" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('Rendered content')).toBeInTheDocument()
  })

  it('shows compilation errors returned by the compiler', async () => {
    compileMDXMock.mockResolvedValue({
      content: null,
      error: 'Unexpected token',
    })

    render(<PreviewPane mdxSource="<Broken />" />)

    expect(await screen.findByTestId('compilation-error')).toHaveTextContent('Unexpected token')
  })

  it('does not let a stale compilation overwrite newer preview content', async () => {
    const firstCompile = createDeferred<{ content: React.ReactElement | null; error: string | null }>()
    const secondCompile = createDeferred<{ content: React.ReactElement | null; error: string | null }>()

    compileMDXMock
      .mockReturnValueOnce(firstCompile.promise)
      .mockReturnValueOnce(secondCompile.promise)

    const { rerender } = render(<PreviewPane mdxSource="# First" />)

    rerender(<PreviewPane mdxSource="# Second" />)

    secondCompile.resolve({
      content: <h1>Second</h1>,
      error: null,
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Second' })).toBeInTheDocument()

    firstCompile.resolve({
      content: <h1>First</h1>,
      error: null,
    })

    expect(screen.queryByRole('heading', { level: 1, name: 'First' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Second' })).toBeInTheDocument()
  })
})
