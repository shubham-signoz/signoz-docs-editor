import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Debounces a value, returning the debounced version after the specified delay.
 *
 * Useful for expensive operations that should only run after user input has settled,
 * such as MDX compilation or API calls.
 *
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const [content, setContent] = useState('')
 *   const debouncedContent = useDebounce(content, 300)
 *
 *   useEffect(() => {
 *     // This will only run 300ms after the user stops typing
 *     compileMDX(debouncedContent)
 *   }, [debouncedContent])
 *
 *   return <textarea value={content} onChange={(e) => setContent(e.target.value)} />
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timeout if value or delay changes before it fires
    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Creates a debounced version of a callback function.
 *
 * The returned function will only execute after the specified delay has passed
 * since the last invocation. Useful for event handlers that shouldn't fire rapidly.
 *
 * @param callback The callback function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [query, setQuery] = useState('')
 *
 *   const debouncedSearch = useDebouncedCallback(
 *     (searchQuery: string) => {
 *       console.log('Searching for:', searchQuery)
 *       // API call here
 *     },
 *     300
 *   )
 *
 *   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const value = e.target.value
 *     setQuery(value)
 *     debouncedSearch(value)
 *   }
 *
 *   return <input value={query} onChange={handleChange} />
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  // Store the callback in a ref to always have the latest version
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  // Store the timeout ID in a ref for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear any existing timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }

      // Set up a new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
        timeoutRef.current = null
      }, delay)
    },
    [delay]
  ) as T

  return debouncedCallback
}

/**
 * Creates a debounced callback with additional controls.
 *
 * Provides methods to cancel pending invocations and to immediately execute
 * the callback, which is useful for "submit on blur" patterns.
 *
 * @param callback The callback function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns Object with the debounced callback and control methods
 *
 * @example
 * ```tsx
 * function AutoSaveEditor() {
 *   const { debouncedCallback: saveContent, flush, cancel } = useDebouncedCallbackWithControls(
 *     (content: string) => {
 *       api.saveDocument(content)
 *     },
 *     1000
 *   )
 *
 *   const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 *     saveContent(e.target.value)
 *   }
 *
 *   const handleBlur = () => {
 *     flush() // Save immediately when user leaves the field
 *   }
 *
 *   const handleEscape = () => {
 *     cancel() // Cancel pending save when user presses escape
 *   }
 *
 *   return <textarea onChange={handleChange} onBlur={handleBlur} />
 * }
 * ```
 */
export function useDebouncedCallbackWithControls<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): {
  debouncedCallback: T
  /** Cancels any pending invocation */
  cancel: () => void
  /** Immediately executes any pending invocation */
  flush: () => void
  /** Whether there's a pending invocation */
  isPending: () => boolean
} {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingArgsRef = useRef<Parameters<T> | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      pendingArgsRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    if (timeoutRef.current !== null && pendingArgsRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      callbackRef.current(...pendingArgsRef.current)
      pendingArgsRef.current = null
    }
  }, [])

  const isPending = useCallback(() => {
    return timeoutRef.current !== null
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }

      pendingArgsRef.current = args

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
        timeoutRef.current = null
        pendingArgsRef.current = null
      }, delay)
    },
    [delay]
  ) as T

  return {
    debouncedCallback,
    cancel,
    flush,
    isPending,
  }
}
