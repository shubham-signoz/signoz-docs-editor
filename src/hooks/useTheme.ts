import { useState, useEffect, useCallback } from 'react'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface UseThemeReturn {
  theme: ResolvedTheme
  themePreference: ThemePreference
  setTheme: (theme: ThemePreference) => void
  systemTheme: ResolvedTheme
}

const THEME_STORAGE_KEY = 'signoz-doc-editor-theme-preference'

/**
 * Detects the system's color scheme preference
 * SSR-safe: returns 'dark' as default when window is not available
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/**
 * Retrieves the stored theme preference from localStorage
 * SSR-safe: returns 'system' as default when window is not available
 */
function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch (error) {
    // localStorage might be unavailable (e.g., private browsing)
    console.warn('Failed to read theme preference from localStorage:', error)
  }

  return 'system'
}

/**
 * Resolves the actual theme based on user preference and system theme
 */
function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  if (preference === 'system') {
    return systemTheme
  }
  return preference
}

/**
 * Enhanced theme detection hook with system preference support
 *
 * Features:
 * - Detects system color scheme preference via matchMedia
 * - Listens for system preference changes in real-time
 * - Stores user override in localStorage
 * - 'system' option follows OS preference automatically
 *
 * @returns Object containing theme state and controls
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, setTheme, systemTheme } = useTheme()
 *
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *       <option value="system">System ({systemTheme})</option>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *     </select>
 *   )
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredPreference)

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'light' : 'dark')
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    // Legacy browsers (Safari < 14)
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    mediaQuery.addListener(handleChange)
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const resolvedTheme = resolveTheme(themePreference, systemTheme)
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [themePreference, systemTheme])

  const setTheme = useCallback((newPreference: ThemePreference) => {
    setThemePreference(newPreference)

    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newPreference)
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error)
    }
  }, [])

  const theme = resolveTheme(themePreference, systemTheme)

  return {
    theme,
    themePreference,
    setTheme,
    systemTheme,
  }
}

export type { ThemePreference, ResolvedTheme, UseThemeReturn }
