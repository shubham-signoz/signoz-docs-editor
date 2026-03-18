import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedCallback, useDebouncedCallbackWithControls } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    // Update value
    rerender({ value: 'updated' })

    // Value should still be initial immediately after update
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now value should be updated
    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    // First update
    rerender({ value: 'first' })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Second update before delay expires
    rerender({ value: 'second' })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Value should still be initial
    expect(result.current).toBe('initial')

    // Advance past the delay from second update
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now should be 'second', never 'first'
    expect(result.current).toBe('second')
  })

  it('should handle different types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { count: 0 } } }
    )

    expect(result.current).toEqual({ count: 0 })

    rerender({ value: { count: 1 } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toEqual({ count: 1 })
  })

  it('should cleanup timeout on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    unmount()

    // Should not throw or cause issues
    act(() => {
      vi.advanceTimersByTime(500)
    })
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce callback execution', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    // Call the debounced function
    act(() => {
      result.current('arg1')
    })

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled()

    // Advance time
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now callback should be called
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg1')
  })

  it('should only call once for rapid invocations', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    // Multiple rapid calls
    act(() => {
      result.current('call1')
      result.current('call2')
      result.current('call3')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should only be called once with the last arguments
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('call3')
  })

  it('should cleanup on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current('arg')
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled()
  })

  it('should use latest callback version', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 300),
      { initialProps: { callback: callback1 } }
    )

    act(() => {
      result.current('arg')
    })

    // Update callback before debounce fires
    rerender({ callback: callback2 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should call the new callback
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('arg')
  })
})

describe('useDebouncedCallbackWithControls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should provide cancel functionality', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallbackWithControls(callback, 300)
    )

    act(() => {
      result.current.debouncedCallback('arg')
    })

    expect(result.current.isPending()).toBe(true)

    act(() => {
      result.current.cancel()
    })

    expect(result.current.isPending()).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Callback should not be called
    expect(callback).not.toHaveBeenCalled()
  })

  it('should provide flush functionality', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallbackWithControls(callback, 300)
    )

    act(() => {
      result.current.debouncedCallback('arg')
    })

    // Flush immediately
    act(() => {
      result.current.flush()
    })

    // Callback should be called immediately
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg')
    expect(result.current.isPending()).toBe(false)
  })

  it('should report pending state correctly', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallbackWithControls(callback, 300)
    )

    expect(result.current.isPending()).toBe(false)

    act(() => {
      result.current.debouncedCallback('arg')
    })

    expect(result.current.isPending()).toBe(true)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.isPending()).toBe(false)
  })

  it('should not flush if nothing is pending', () => {
    const callback = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedCallbackWithControls(callback, 300)
    )

    act(() => {
      result.current.flush()
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
