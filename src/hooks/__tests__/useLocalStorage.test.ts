import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, useLocalStorageRemove, useLocalStorageExists } from '../useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('default')
  })

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('stored-value')
  })

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('updated')
  })

  it('should handle complex objects', () => {
    const initialValue = { name: 'test', settings: { theme: 'dark' } }

    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))

    expect(result.current[0]).toEqual(initialValue)

    const updatedValue = { name: 'test', settings: { theme: 'light' } }
    act(() => {
      result.current[1](updatedValue)
    })

    expect(result.current[0]).toEqual(updatedValue)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toEqual(updatedValue)
  })

  it('should handle arrays', () => {
    const initialValue = [1, 2, 3]

    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))

    expect(result.current[0]).toEqual(initialValue)

    act(() => {
      result.current[1]([...result.current[0], 4])
    })

    expect(result.current[0]).toEqual([1, 2, 3, 4])
  })

  it('should handle updater function', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)

    act(() => {
      result.current[1]((prev) => prev + 5)
    })

    expect(result.current[0]).toBe(6)
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('test-key', 'invalid-json{')

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('default')
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('should sync across tabs via storage event', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    expect(result.current[0]).toBe('initial')

    // Simulate storage event from another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('from-other-tab'),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('from-other-tab')
  })

  it('should reset to initial value when key is removed in another tab', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    expect(result.current[0]).toBe('stored')

    // Simulate removal in another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: null,
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('initial')
  })

  it('should ignore storage events for other keys', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('initial')
  })

  it('should cleanup storage event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useLocalStorage('test-key', 'initial'))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('bool-key', false))

    expect(result.current[0]).toBe(false)

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(JSON.parse(localStorage.getItem('bool-key')!)).toBe(true)
  })

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('null-key', null))

    expect(result.current[0]).toBe(null)

    act(() => {
      result.current[1]('value')
    })

    expect(result.current[0]).toBe('value')

    act(() => {
      result.current[1](null)
    })

    expect(result.current[0]).toBe(null)
  })
})

describe('useLocalStorageRemove', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should remove item from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('value'))

    const { result } = renderHook(() => useLocalStorageRemove('test-key'))

    act(() => {
      result.current()
    })

    expect(localStorage.getItem('test-key')).toBe(null)
  })

  it('should not throw when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorageRemove('non-existent'))

    expect(() => {
      act(() => {
        result.current()
      })
    }).not.toThrow()
  })
})

describe('useLocalStorageExists', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return true when key exists', () => {
    localStorage.setItem('test-key', JSON.stringify('value'))

    const { result } = renderHook(() => useLocalStorageExists('test-key'))

    expect(result.current).toBe(true)
  })

  it('should return false when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorageExists('non-existent'))

    expect(result.current).toBe(false)
  })

  it('should update when key is added/removed in another tab', () => {
    const { result } = renderHook(() => useLocalStorageExists('test-key'))

    expect(result.current).toBe(false)

    // Simulate addition in another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('value'),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current).toBe(true)

    // Simulate removal in another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: null,
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current).toBe(false)
  })
})
