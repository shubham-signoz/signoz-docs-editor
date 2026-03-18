import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CodePane } from '../CodePane'
import { ThemeProvider } from '@/contexts'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
describe('CodePane', () => {
  it('renders a CodeMirror editor surface', () => {
    const onChange = vi.fn()
    render(
      <TestWrapper>
        <CodePane value="" onChange={onChange} />
      </TestWrapper>
    )

    const codePane = screen.getByTestId('code-pane')
    expect(codePane).toBeInTheDocument()
    expect(codePane.querySelector('.cm-editor')).toBeInTheDocument()
  })

  it('renders with initial value', () => {
    const onChange = vi.fn()
    const initialValue = '# Hello World'

    render(
      <TestWrapper>
        <CodePane value={initialValue} onChange={onChange} />
      </TestWrapper>
    )

    const codePane = screen.getByTestId('code-pane')
    expect(codePane).toBeInTheDocument()
    expect(codePane.textContent).toContain('Hello World')
  })

  it('applies custom className', () => {
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <CodePane value="" onChange={onChange} className="custom-class" />
      </TestWrapper>
    )

    const codePane = screen.getByTestId('code-pane')
    expect(codePane).toHaveClass('custom-class')
  })

  it('renders with different themes', () => {
    const onChange = vi.fn()

    const { container, rerender } = render(
      <ThemeProvider>
        <CodePane value="# Test" onChange={onChange} />
      </ThemeProvider>
    )

    expect(screen.getByTestId('code-pane')).toBeInTheDocument()
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(1)

    rerender(
      <ThemeProvider>
        <CodePane value="# Updated" onChange={onChange} />
      </ThemeProvider>
    )

    expect(screen.getByTestId('code-pane')).toBeInTheDocument()
    expect(container.querySelectorAll('.cm-editor')).toHaveLength(1)
  })

  it('renders an empty editor without user content leakage', () => {
    const onChange = vi.fn()

    render(
      <TestWrapper>
        <CodePane value="" onChange={onChange} />
      </TestWrapper>
    )

    const codePane = screen.getByTestId('code-pane')
    expect(codePane).toBeInTheDocument()
    expect(codePane.querySelector('.cm-content')?.textContent ?? '').toBe('')
  })

  it('updates content when value prop changes', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <TestWrapper>
        <CodePane value="Initial content" onChange={onChange} />
      </TestWrapper>
    )

    expect(screen.getByTestId('code-pane').textContent).toContain('Initial content')

    // Update the value prop
    rerender(
      <TestWrapper>
        <CodePane value="Updated content" onChange={onChange} />
      </TestWrapper>
    )

    expect(screen.getByTestId('code-pane').textContent).toContain('Updated content')
  })

  it('keeps a single CodeMirror instance across rerenders', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <TestWrapper>
        <CodePane value="# Initial" onChange={onChange} />
      </TestWrapper>
    )

    expect(screen.getByTestId('code-pane').querySelectorAll('.cm-editor')).toHaveLength(1)

    rerender(
      <TestWrapper>
        <CodePane value="# Updated" onChange={vi.fn()} />
      </TestWrapper>
    )

    expect(screen.getByTestId('code-pane').querySelectorAll('.cm-editor')).toHaveLength(1)
  })

  it('accepts an optional cursor callback while keeping one editor instance', () => {
    const onChange = vi.fn()
    const onCursorChange = vi.fn()

    render(
      <TestWrapper>
        <CodePane
          value="Hello"
          onChange={onChange}
          onCursorChange={onCursorChange}
        />
      </TestWrapper>
    )

    const codePane = screen.getByTestId('code-pane')
    expect(codePane).toBeInTheDocument()
    expect(codePane.querySelectorAll('.cm-editor')).toHaveLength(1)
  })
})
