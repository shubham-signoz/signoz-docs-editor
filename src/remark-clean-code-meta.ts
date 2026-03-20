import { visit } from 'unist-util-visit'
import type { Root, Code } from 'mdast'

/**
 * Remark plugin that cleans code fence metadata so it doesn't break MDX compilation.
 *
 * Handles two common conventions used by remark-code-titles / rehype-prism-plus:
 *   1. Language:title syntax  →  ```yaml:config.yaml  →  lang becomes "yaml"
 *   2. Line highlight metadata →  ```yaml {4-6}        →  meta is preserved for renderers
 *
 * Without this plugin, the colon-title syntax causes language detection to fail
 * (e.g. "yaml:config.yaml" is not a valid language identifier).
 */
export function remarkCleanCodeMeta() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code) => {
      if (!node.lang) return

      // Split lang:title — e.g. "yaml:config.yaml" → lang="yaml"
      const colonIndex = node.lang.indexOf(':')
      if (colonIndex > 0) {
        node.lang = node.lang.slice(0, colonIndex)
      }
    })
  }
}
