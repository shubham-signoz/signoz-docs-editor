import { useEffect, useCallback, useRef } from 'react'

export interface Shortcut {
  /** The key to listen for (e.g., 's', 'p', 'Enter', 'Escape') */
  key: string
  /** Whether Cmd (Mac) / Ctrl (Windows/Linux) should be pressed */
  meta?: boolean
  /** Whether Shift should be pressed */
  shift?: boolean
  /** Whether Alt/Option should be pressed */
  alt?: boolean
  /** The action to execute when the shortcut is triggered */
  action: () => void
  /** Human-readable description of what the shortcut does */
  description: string
  /** Whether to prevent default browser behavior (default: true) */
  preventDefault?: boolean
  /** Whether the shortcut is currently enabled (default: true) */
  enabled?: boolean
}

/**
 * Detects if the current platform is macOS
 * SSR-safe: returns false when window is not available
 */
function isMacPlatform(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  // Prefer legacy navigator.platform for reliable environment-based mocking in tests.
  // Fall back to navigator.userAgentData when navigator.platform is unavailable.
  if (navigator.platform) {
    return navigator.platform.toLowerCase().includes('mac')
  }

  if ('userAgentData' in navigator) {
    const userAgentData = navigator.userAgentData as { platform?: string }
    return userAgentData.platform?.toLowerCase().includes('mac') ?? false
  }

  return false
}

/**
 * Checks if the event matches the shortcut configuration
 */
function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  // Check the key (case-insensitive for letters)
  const eventKey = event.key.toLowerCase()
  const shortcutKey = shortcut.key.toLowerCase()

  if (eventKey !== shortcutKey) {
    return false
  }

  // Check meta key (Cmd on Mac, Ctrl on Windows/Linux).
  // Include both modifiers to remain resilient in environments where
  // platform detection is not available in tests/runtime.
  const metaPressed = event.metaKey || event.ctrlKey
  if (shortcut.meta && !metaPressed) {
    return false
  }
  if (!shortcut.meta && metaPressed) {
    return false
  }

  // Check shift key
  if (shortcut.shift && !event.shiftKey) {
    return false
  }
  if (!shortcut.shift && event.shiftKey) {
    return false
  }

  // Check alt key
  if (shortcut.alt && !event.altKey) {
    return false
  }
  if (!shortcut.alt && event.altKey) {
    return false
  }

  return true
}

/**
 * Checks if the event target is an input element where shortcuts might interfere
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  const isContentEditable = target.getAttribute('contenteditable') === 'true'

  return isInput || isContentEditable
}

/**
 * Global keyboard shortcuts hook
 *
 * Features:
 * - Registers global keydown listeners
 * - Handles Cmd (Mac) / Ctrl (Windows/Linux) automatically
 * - Prevents default browser behavior for registered shortcuts
 * - Properly cleans up listeners on unmount
 * - SSR-safe
 *
 * @param shortcuts Array of shortcut configurations
 * @param options Optional configuration
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const handleSave = useCallback(() => {
 *     console.log('Saving...')
 *   }, [])
 *
 *   useKeyboardShortcuts([
 *     {
 *       key: 's',
 *       meta: true,
 *       action: handleSave,
 *       description: 'Save document',
 *     },
 *     {
 *       key: 'p',
 *       meta: true,
 *       shift: true,
 *       action: () => console.log('Preview'),
 *       description: 'Toggle preview',
 *     },
 *   ])
 *
 *   return <div>Editor content</div>
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: {
    /** Whether to allow shortcuts when focus is in an input element (default: false for meta shortcuts) */
    allowInInputs?: boolean
  } = {}
): void {
  const { allowInInputs = false } = options

  // Store shortcuts in a ref to avoid recreating the handler on every render
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const isMacRef = useRef<boolean | null>(null)

  // Detect platform once on mount
  useEffect(() => {
    isMacRef.current = isMacPlatform()
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Use detected platform or detect lazily if not yet set
    for (const shortcut of shortcutsRef.current) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) {
          continue
        }

        // Check if shortcut matches
        if (!matchesShortcut(event, shortcut)) {
          continue
        }

        // Check if we should skip because target is an input
        // For meta shortcuts, we typically want to prevent default even in inputs
        // unless explicitly allowed
        const targetIsInput = isInputElement(event.target)
        if (targetIsInput && !allowInInputs && !shortcut.meta) {
          continue
        }

        // Prevent default browser behavior unless explicitly disabled
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
          event.stopPropagation()
        }

        // Execute the action
        shortcut.action()

        // Only handle the first matching shortcut
        return
      }
    },
    [allowInInputs]
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Use capture phase to intercept shortcuts before they reach inputs
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleKeyDown])
}

/**
 * Hook to get a formatted list of registered shortcuts for display
 *
 * @param shortcuts Array of shortcut configurations
 * @returns Array of shortcuts with formatted key combinations
 */
export function useFormattedShortcuts(shortcuts: Shortcut[]): Array<{
  shortcut: Shortcut
  formatted: string
}> {
  const isMac = useRef<boolean | null>(null)

  useEffect(() => {
    isMac.current = isMacPlatform()
  }, [])

  return shortcuts.map((shortcut) => {
    const mac = isMac.current ?? isMacPlatform()
    const parts: string[] = []

    if (shortcut.meta) {
      parts.push(mac ? 'Cmd' : 'Ctrl')
    }
    if (shortcut.alt) {
      parts.push(mac ? 'Option' : 'Alt')
    }
    if (shortcut.shift) {
      parts.push('Shift')
    }

    // Capitalize single letter keys
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key

    parts.push(key)

    return {
      shortcut,
      formatted: parts.join('+'),
    }
  })
}

export type { Shortcut as KeyboardShortcut }
