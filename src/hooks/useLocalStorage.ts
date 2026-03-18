import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Type-safe hook for persisting state in localStorage.
 *
 * Features:
 * - Type-safe with generics
 * - SSR-safe (checks for window existence)
 * - Handles JSON parse/stringify errors gracefully
 * - Syncs state across tabs via storage event
 * - Falls back to initialValue on errors
 *
 * @param key The localStorage key
 * @param initialValue The initial value if nothing is stored
 * @returns A tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const [fontSize, setFontSize] = useLocalStorage('editor-font-size', 14)
 *   const [settings, setSettings] = useLocalStorage('editor-settings', {
 *     wordWrap: true,
 *     lineNumbers: true,
 *   })
 *
 *   return (
 *     <div>
 *       <input
 *         type="range"
 *         value={fontSize}
 *         onChange={(e) => setFontSize(Number(e.target.value))}
 *       />
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.wordWrap}
 *           onChange={(e) => setSettings({ ...settings, wordWrap: e.target.checked })}
 *         />
 *         Word Wrap
 *       </label>
 *     </div>
 *   )
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use a ref to track if we've initialized
  const initializedRef = useRef(false)

  // Get the initial value from localStorage or use the provided initialValue
  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = localStorage.getItem(key)
      if (item === null) {
        return initialValue
      }

      return JSON.parse(item) as T
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue])

  // Initialize state with a lazy initializer to avoid SSR issues
  const [storedValue, setStoredValue] = useState<T>(() => {
    // On SSR, always return initialValue
    if (typeof window === 'undefined') {
      return initialValue
    }
    return getStoredValue()
  })

  // Handle hydration mismatch by syncing with localStorage after mount
  useEffect(() => {
    if (!initializedRef.current && typeof window !== 'undefined') {
      initializedRef.current = true
      const stored = getStoredValue()
      // Only update if different to avoid unnecessary re-renders
      if (JSON.stringify(stored) !== JSON.stringify(storedValue)) {
        setStoredValue(stored)
      }
    }
  }, [getStoredValue, storedValue])

  // Setter function that also updates localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Handle both direct values and updater functions
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Update React state
        setStoredValue(valueToStore)

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (event: StorageEvent) => {
      // Only respond to changes to our key
      if (event.key !== key) {
        return
      }

      // If the key was removed, reset to initial value
      if (event.newValue === null) {
        setStoredValue(initialValue)
        return
      }

      try {
        const newValue = JSON.parse(event.newValue) as T
        setStoredValue(newValue)
      } catch (error) {
        console.warn(`Error parsing localStorage change for key "${key}":`, error)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, initialValue])

  return [storedValue, setValue]
}

/**
 * Hook to remove an item from localStorage
 *
 * @param key The localStorage key to manage
 * @returns A function to remove the item
 *
 * @example
 * ```tsx
 * function ClearSettings() {
 *   const [settings, setSettings] = useLocalStorage('settings', defaultSettings)
 *   const removeSettings = useLocalStorageRemove('settings')
 *
 *   const handleReset = () => {
 *     removeSettings()
 *     setSettings(defaultSettings)
 *   }
 *
 *   return <button onClick={handleReset}>Reset Settings</button>
 * }
 * ```
 */
export function useLocalStorageRemove(key: string): () => void {
  return useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key])
}

/**
 * Hook to check if a key exists in localStorage
 *
 * @param key The localStorage key to check
 * @returns Boolean indicating if the key exists
 */
export function useLocalStorageExists(key: string): boolean {
  const [exists, setExists] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return localStorage.getItem(key) !== null
  })

  // Listen for changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setExists(event.newValue !== null)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])

  return exists
}
