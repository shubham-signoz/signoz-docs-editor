import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  let originalMatchMedia: typeof window.matchMedia
  let mockMatchMedia: ReturnType<typeof vi.fn>
  let mediaQueryListeners: Set<(event: MediaQueryListEvent) => void>

  beforeEach(() => {
    localStorage.clear()

    originalMatchMedia = window.matchMedia
    mediaQueryListeners = new Set()

    mockMatchMedia = vi.fn((query: string) => ({
      matches: query.includes('light') ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener)
      }),
      removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener)
      }),
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.add(listener)
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.delete(listener)
        }
      }),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = mockMatchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.clearAllMocks()
  })

  it('should return dark theme by default when system prefers dark', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')
    expect(result.current.systemTheme).toBe('dark')
    expect(result.current.themePreference).toBe('system')
  })

  it('should return light theme when system prefers light', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('light'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useTheme())

    expect(result.current.systemTheme).toBe('light')
    expect(result.current.theme).toBe('light')
  })

  it('should persist theme preference to localStorage', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(localStorage.getItem('signoz-doc-editor-theme-preference')).toBe('light')
    expect(result.current.themePreference).toBe('light')
    expect(result.current.theme).toBe('light')
  })

  it('should load theme preference from localStorage', () => {
    localStorage.setItem('signoz-doc-editor-theme-preference', 'light')

    const { result } = renderHook(() => useTheme())

    expect(result.current.themePreference).toBe('light')
    expect(result.current.theme).toBe('light')
  })

  it('should support system theme preference', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })
    expect(result.current.theme).toBe('light')

    act(() => {
      result.current.setTheme('system')
    })
    expect(result.current.themePreference).toBe('system')
    expect(result.current.theme).toBe('dark')
  })

  it('should respond to system theme changes when preference is system', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')

    act(() => {
      mediaQueryListeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    expect(result.current.systemTheme).toBe('light')
    expect(result.current.theme).toBe('light')
  })

  it('should not change theme on system change when preference is explicit', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    act(() => {
      mediaQueryListeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    expect(result.current.systemTheme).toBe('light')
    expect(result.current.theme).toBe('dark')
  })

  it('should apply theme class to document root', () => {
    const { result } = renderHook(() => useTheme())

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useTheme())

    const mediaQueryObject =
      mockMatchMedia.mock.results[mockMatchMedia.mock.results.length - 1]?.value

    unmount()

    expect(mediaQueryObject?.removeEventListener).toHaveBeenCalled()
  })

  it('should handle invalid localStorage data gracefully', () => {
    localStorage.setItem('signoz-doc-editor-theme-preference', 'invalid-json')

    const { result } = renderHook(() => useTheme())

    expect(result.current.themePreference).toBe('system')
  })

  it('should handle unknown theme values in localStorage', () => {
    localStorage.setItem('signoz-doc-editor-theme-preference', 'unknown-theme')

    const { result } = renderHook(() => useTheme())

    expect(result.current.themePreference).toBe('system')
  })
})
