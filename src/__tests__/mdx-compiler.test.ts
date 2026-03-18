import { afterEach, describe, it, expect, vi } from 'vitest'
import { compileMDX, isValidComponent } from '../mdx-compiler'
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe('compileMDX', () => {
  it('should compile simple markdown', async () => {
    const result = await compileMDX('# Hello World')

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should compile markdown with formatting', async () => {
    const result = await compileMDX(`
# Title

This is **bold** and *italic* text.

- List item 1
- List item 2
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should compile code blocks', async () => {
    const result = await compileMDX(`
\`\`\`javascript
const x = 1
console.log(x)
\`\`\`
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should handle empty source', async () => {
    const result = await compileMDX('')

    expect(result.error).toBeNull()
    expect(result.content).toBeNull()
  })

  it('should handle whitespace-only source', async () => {
    const result = await compileMDX('   \n\n   ')

    expect(result.error).toBeNull()
    expect(result.content).toBeNull()
  })

  it('should compile MDX with JSX components', async () => {
    const result = await compileMDX(`
# Hello

<div className="test">
  <span>Content</span>
</div>
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should use custom components when provided', async () => {
    const CustomComponent = ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-custom': true }, children)

    const result = await compileMDX(
      '<CustomComponent>Hello</CustomComponent>',
      { CustomComponent }
    )

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should return error for invalid JSX syntax', async () => {
    const result = await compileMDX('<div className=>broken</div>')

    expect(result.error).not.toBeNull()
    expect(result.content).toBeNull()
  })

  it('should return error for unclosed tags', async () => {
    const result = await compileMDX('<div>unclosed')

    expect(result.error).not.toBeNull()
    expect(result.content).toBeNull()
  })

  it('should inline local md imports through the API resolver', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          path: 'components/shared/get-help.md',
          content: 'Imported help text from shared markdown.',
        }),
      })
    )

    const result = await compileMDX(`
import GetHelp from '@/components/shared/get-help.md'

# Hello
<GetHelp />
    `, {}, 'data/docs/instrumentation/opentelemetry-deno.mdx')

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()

    render(result.content as React.ReactElement)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Imported help text from shared markdown.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('should compile complex nested JSX', async () => {
    const result = await compileMDX(`
<div>
  <section>
    <h1>Nested Title</h1>
    <p>Paragraph with **markdown** inside JSX</p>
  </section>
</div>
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should handle JSX expressions', async () => {
    const result = await compileMDX(`
<div>
  {['a', 'b', 'c'].map(x => <span key={x}>{x}</span>)}
</div>
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()
  })

  it('should compile frontmatter and content (frontmatter is stripped)', async () => {
    const result = await compileMDX(`
---
date: 2026-03-12
id: nginx
title: NGINX Opentelemetry Instrumentation
description: Send events from your NGINX web server to SigNoz
hide_table_of_contents: true
---

# Title

Content after the title.
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()

    render(result.content as React.ReactElement)

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('Content after the title.')).toBeInTheDocument()
    expect(screen.queryByText(/date:\s*2026-03-12/)).not.toBeInTheDocument()
  })

  it('should inject frontmatter title as h1 when the body has no h1', async () => {
    const result = await compileMDX(`
---
date: 2026-03-12
id: nginx
title: NGINX Opentelemetry Instrumentation
---

## Overview

Content after the overview.
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()

    render(result.content as React.ReactElement)

    expect(screen.getByRole('heading', { level: 1, name: 'NGINX Opentelemetry Instrumentation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByText(/date:\s*2026-03-12/)).not.toBeInTheDocument()
  })

  it('should not inject a title heading when frontmatter title is missing', async () => {
    const result = await compileMDX(`
---
date: 2026-03-12
id: nginx
---

Content after the frontmatter.
    `)

    expect(result.error).toBeNull()
    expect(result.content).not.toBeNull()

    render(result.content as React.ReactElement)

    expect(screen.getByText('Content after the frontmatter.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByText(/date:\s*2026-03-12/)).not.toBeInTheDocument()
  })
})

describe('isValidComponent', () => {
  it('should return true for function components', () => {
    const FunctionComponent = () => React.createElement('div')
    expect(isValidComponent(FunctionComponent)).toBe(true)
  })

  it('should return true for arrow function components', () => {
    const ArrowComponent = () => React.createElement('span')
    expect(isValidComponent(ArrowComponent)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isValidComponent(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isValidComponent(undefined)).toBe(false)
  })

  it('should return false for strings', () => {
    expect(isValidComponent('div')).toBe(false)
  })

  it('should return false for numbers', () => {
    expect(isValidComponent(42)).toBe(false)
  })

  it('should return false for plain objects', () => {
    expect(isValidComponent({ name: 'test' })).toBe(false)
  })

  it('should return true for React elements with $$typeof', () => {
    const element = React.createElement('div')
    // React elements have $$typeof
    expect(isValidComponent(element)).toBe(true)
  })
})
