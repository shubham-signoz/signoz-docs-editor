// Frontmatter utilities
export {
  parseFrontmatter,
  stringifyFrontmatter,
  updateFrontmatterField,
  removeFrontmatterField,
  extractTitle,
  validateFrontmatter,
} from './frontmatter'
export type { ParsedFrontmatter, DocFrontmatter } from './frontmatter'

// Platform utilities
export {
  isMac,
  modKey,
  formatShortcut,
  formatShortcutSymbols,
  matchesShortcut,
  isWindows,
  isLinux,
  getPlatform,
} from './platform'
