import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  groupComponentsByCategory,
  parseSignozComponentRegistry,
} from '../../signoz-component-registry.js'

const tempDirectories: string[] = []

describe('signoz component registry parsing', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    )
  })

  it('parses MDXComponents.tsx once and preserves export aliases', async () => {
    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'signoz-doc-editor-'))
    tempDirectories.push(rootDirectory)

    const componentsDirectory = path.join(rootDirectory, 'components')
    await mkdir(componentsDirectory, { recursive: true })
    await writeFile(
      path.join(componentsDirectory, 'MDXComponents.tsx'),
      `
import Admonition from './Shared/Admonition'
import Tabs from './Tabs/Tabs'
import MDXCodeBlock from './Shared/CodeBlock'
import Link from 'pliny/link'

export const components = {
  Callout: Admonition,
  Tabs,
  CodeBlock: MDXCodeBlock,
  a: Link,
}
      `,
      'utf-8'
    )

    const components = await parseSignozComponentRegistry(rootDirectory)

    expect(components).toEqual([
      expect.objectContaining({
        name: 'Callout',
        importName: 'Admonition',
        resolvedPath: 'Shared/Admonition',
        category: 'Shared',
      }),
      expect.objectContaining({
        name: 'Tabs',
        importName: 'Tabs',
        resolvedPath: 'Tabs/Tabs',
        category: 'Tabs',
      }),
      expect.objectContaining({
        name: 'CodeBlock',
        importName: 'MDXCodeBlock',
        resolvedPath: 'Shared/CodeBlock',
        category: 'Shared',
      }),
    ])

    expect(groupComponentsByCategory(components)).toEqual({
      Shared: [components[0], components[2]],
      Tabs: [components[1]],
    })
  })
})
