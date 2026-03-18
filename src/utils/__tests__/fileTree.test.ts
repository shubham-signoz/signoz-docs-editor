import { describe, expect, it } from 'vitest'
import { flattenFileTree, getAncestorPaths, treeContainsPath } from '../fileTree'

const tree = [
  {
    name: 'guides',
    path: 'guides',
    type: 'directory' as const,
    children: [
      {
        name: 'intro.mdx',
        path: 'guides/intro.mdx',
        type: 'file' as const,
      },
      {
        name: 'advanced',
        path: 'guides/advanced',
        type: 'directory' as const,
        children: [
          {
            name: 'routing.mdx',
            path: 'guides/advanced/routing.mdx',
            type: 'file' as const,
          },
        ],
      },
    ],
  },
]

describe('fileTree utilities', () => {
  it('flattens nested file nodes', () => {
    expect(flattenFileTree(tree)).toEqual([
      { name: 'intro.mdx', path: 'guides/intro.mdx' },
      { name: 'routing.mdx', path: 'guides/advanced/routing.mdx' },
    ])
  })

  it('returns ancestor paths for a file path', () => {
    expect(getAncestorPaths('guides/advanced/routing.mdx')).toEqual([
      'guides',
      'guides/advanced',
    ])
  })

  it('checks whether a path exists in the tree', () => {
    expect(treeContainsPath(tree, 'guides/advanced/routing.mdx')).toBe(true)
    expect(treeContainsPath(tree, 'guides/missing.mdx')).toBe(false)
  })
})
