// Theme hook
export { useTheme } from './useTheme'
export type { ThemePreference, ResolvedTheme, UseThemeReturn } from './useTheme'

// Keyboard shortcuts hook
export { useKeyboardShortcuts, useFormattedShortcuts } from './useKeyboardShortcuts'
export type { Shortcut, KeyboardShortcut } from './useKeyboardShortcuts'

// Debounce hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedCallbackWithControls,
} from './useDebounce'

// Local storage hooks
export {
  useLocalStorage,
  useLocalStorageRemove,
  useLocalStorageExists,
} from './useLocalStorage'

// Enhanced repo hook with component discovery
export { useRepo } from './useRepo'
export type { UseRepoReturn, ComponentDiscoveryState } from './useRepo'

// File indexing hooks
export { useFileIndex, useRecentFiles } from './useFileIndex'
export type { FileIndexItem, UseFileIndexOptions } from './useFileIndex'

// File operations hooks
export {
  useFileOperations,
  useFileOperationsFallback,
  isFileSystemAccessSupported,
} from './useFileOperations'
export type { FileOperationResult } from './useFileOperations'
