import { useMemo } from 'react'

/**
 * Next.js useSearchParams shim - reads from window.location
 */
export function useSearchParams() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return new URLSearchParams()
    }
    return new URLSearchParams(window.location.search)
  }, [])
}

/**
 * Next.js usePathname shim
 */
export function usePathname() {
  if (typeof window === 'undefined') {
    return '/'
  }
  return window.location.pathname
}

/**
 * Next.js useRouter shim
 */
export function useRouter() {
  return {
    push: (url: string) => {
      window.location.href = url
    },
    replace: (url: string) => {
      window.location.replace(url)
    },
    back: () => {
      window.history.back()
    },
    forward: () => {
      window.history.forward()
    },
    refresh: () => {
      window.location.reload()
    },
    prefetch: () => Promise.resolve(),
  }
}

/**
 * Next.js useParams shim
 */
export function useParams() {
  return {}
}

/**
 * Next.js redirect shim
 */
export function redirect(url: string) {
  window.location.href = url
}

/**
 * Next.js notFound shim
 */
export function notFound() {
  throw new Error('Not Found')
}
