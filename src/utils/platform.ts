import type { Shortcut } from '../hooks/useKeyboardShortcuts'

/**
 * Detects if the current platform is macOS.
 * SSR-safe: returns false when window/navigator is not available.
 */
function detectMac(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  // Modern API (Chrome 90+, Edge 90+)
  if ('userAgentData' in navigator) {
    const userAgentData = navigator.userAgentData as { platform?: string }
    return userAgentData.platform?.toLowerCase().includes('mac') ?? false
  }

  // Legacy fallback using navigator.platform
  return navigator.platform?.toLowerCase().includes('mac') ?? false
}

/**
 * Cached result of platform detection to avoid repeated checks.
 * Evaluated lazily on first access.
 */
let cachedIsMac: boolean | null = null

/**
 * Whether the current platform is macOS.
 * Uses a cached result after first detection.
 *
 * @example
 * ```tsx
 * import { isMac } from '../utils/platform'
 *
 * function ShortcutHelp() {
 *   return (
 *     <span>Press {isMac ? 'Cmd' : 'Ctrl'} + S to save</span>
 *   )
 * }
 * ```
 */
export const isMac: boolean = (() => {
  if (cachedIsMac === null) {
    cachedIsMac = detectMac()
  }
  return cachedIsMac
})()

/**
 * The modifier key to use for keyboard shortcuts.
 * 'meta' on macOS (Cmd key), 'ctrl' on Windows/Linux.
 *
 * @example
 * ```tsx
 * import { modKey } from '../utils/platform'
 *
 * function handleKeyDown(event: KeyboardEvent) {
 *   const modPressed = modKey === 'meta' ? event.metaKey : event.ctrlKey
 *   if (modPressed && event.key === 's') {
 *     event.preventDefault()
 *     save()
 *   }
 * }
 * ```
 */
export const modKey: 'meta' | 'ctrl' = isMac ? 'meta' : 'ctrl'

/**
 * Special key display names for different platforms
 */
const MAC_KEY_SYMBOLS: Record<string, string> = {
  meta: '\u2318', // Command symbol
  ctrl: '\u2303', // Control symbol
  alt: '\u2325',  // Option symbol
  shift: '\u21E7', // Shift symbol
  enter: '\u21A9', // Return symbol
  backspace: '\u232B', // Delete symbol
  delete: '\u2326', // Forward delete symbol
  escape: '\u238B', // Escape symbol
  tab: '\u21E5',  // Tab symbol
  arrowup: '\u2191',
  arrowdown: '\u2193',
  arrowleft: '\u2190',
  arrowright: '\u2192',
}

const MAC_KEY_NAMES: Record<string, string> = {
  meta: 'Cmd',
  ctrl: 'Ctrl',
  alt: 'Option',
  shift: 'Shift',
  enter: 'Return',
  backspace: 'Delete',
  delete: 'Fn+Delete',
  escape: 'Esc',
  tab: 'Tab',
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
}

const WINDOWS_KEY_NAMES: Record<string, string> = {
  meta: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  escape: 'Esc',
  tab: 'Tab',
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
}

/**
 * Formats a keyboard shortcut for display.
 *
 * @param shortcut The shortcut configuration
 * @param options Formatting options
 * @returns A formatted string like "Cmd+S" (Mac) or "Ctrl+S" (Windows)
 *
 * @example
 * ```tsx
 * import { formatShortcut } from '../utils/platform'
 *
 * const saveShortcut: Shortcut = {
 *   key: 's',
 *   meta: true,
 *   action: () => save(),
 *   description: 'Save document',
 * }
 *
 * function SaveButton() {
 *   return (
 *     <button title={`Save (${formatShortcut(saveShortcut)})`}>
 *       Save
 *     </button>
 *   )
 * }
 * // On Mac: "Save (Cmd+S)"
 * // On Windows: "Save (Ctrl+S)"
 * ```
 */
export function formatShortcut(
  shortcut: Shortcut,
  options: {
    /** Use symbols instead of names on Mac (e.g., "\u2318" instead of "Cmd") */
    useSymbols?: boolean
    /** Separator between keys (default: "+") */
    separator?: string
  } = {}
): string {
  const { useSymbols = false, separator = '+' } = options
  const platform = isMac

  const keyNames = platform
    ? (useSymbols ? MAC_KEY_SYMBOLS : MAC_KEY_NAMES)
    : WINDOWS_KEY_NAMES

  const parts: string[] = []

  // Add modifiers in standard order: Ctrl/Cmd, Alt/Option, Shift
  if (shortcut.meta) {
    parts.push(keyNames.meta || (platform ? 'Cmd' : 'Ctrl'))
  }

  if (shortcut.alt) {
    parts.push(keyNames.alt || (platform ? 'Option' : 'Alt'))
  }

  if (shortcut.shift) {
    parts.push(keyNames.shift || 'Shift')
  }

  // Format the main key
  const keyLower = shortcut.key.toLowerCase()
  const keyDisplay = keyNames[keyLower]
    ?? (shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key)

  parts.push(keyDisplay)

  return parts.join(separator)
}

/**
 * Formats a shortcut using macOS-style symbols.
 * On non-Mac platforms, falls back to standard formatting.
 *
 * @param shortcut The shortcut configuration
 * @returns A formatted string like "\u2318S" (Mac) or "Ctrl+S" (Windows)
 *
 * @example
 * ```tsx
 * // On Mac: "\u2318\u21E7P" for Cmd+Shift+P
 * // On Windows: "Ctrl+Shift+P"
 * ```
 */
export function formatShortcutSymbols(shortcut: Shortcut): string {
  return formatShortcut(shortcut, {
    useSymbols: isMac,
    separator: isMac ? '' : '+',
  })
}

/**
 * Parses a keyboard event to check if it matches a shortcut.
 * Useful for manual keyboard handling outside of useKeyboardShortcuts.
 *
 * @param event The keyboard event
 * @param shortcut The shortcut to check against
 * @returns Whether the event matches the shortcut
 *
 * @example
 * ```tsx
 * import { matchesShortcut } from '../utils/platform'
 *
 * const saveShortcut: Shortcut = {
 *   key: 's',
 *   meta: true,
 *   action: () => {},
 *   description: 'Save',
 * }
 *
 * function handleKeyDown(event: KeyboardEvent) {
 *   if (matchesShortcut(event, saveShortcut)) {
 *     event.preventDefault()
 *     save()
 *   }
 * }
 * ```
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  // Check the key (case-insensitive for letters)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false
  }

  // Check meta key (Cmd on Mac, Ctrl on Windows/Linux)
  const metaPressed = isMac ? event.metaKey : event.ctrlKey
  if (shortcut.meta && !metaPressed) return false
  if (!shortcut.meta && metaPressed) return false

  // Check shift key
  if (shortcut.shift && !event.shiftKey) return false
  if (!shortcut.shift && event.shiftKey) return false

  // Check alt key
  if (shortcut.alt && !event.altKey) return false
  if (!shortcut.alt && event.altKey) return false

  return true
}

/**
 * Detects if the current platform is Windows.
 */
export function isWindows(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  if ('userAgentData' in navigator) {
    const userAgentData = navigator.userAgentData as { platform?: string }
    return userAgentData.platform?.toLowerCase().includes('win') ?? false
  }

  return navigator.platform?.toLowerCase().includes('win') ?? false
}

/**
 * Detects if the current platform is Linux.
 */
export function isLinux(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  if ('userAgentData' in navigator) {
    const userAgentData = navigator.userAgentData as { platform?: string }
    return userAgentData.platform?.toLowerCase().includes('linux') ?? false
  }

  return navigator.platform?.toLowerCase().includes('linux') ?? false
}

/**
 * Gets the current platform name.
 */
export function getPlatform(): 'mac' | 'windows' | 'linux' | 'unknown' {
  if (isMac) return 'mac'
  if (isWindows()) return 'windows'
  if (isLinux()) return 'linux'
  return 'unknown'
}
