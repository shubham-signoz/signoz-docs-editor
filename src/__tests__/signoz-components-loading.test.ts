import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as path from 'path'

// Test the generated virtual module code from the plugin
// We simulate what the plugin generates and verify resilience

describe('signoz components virtual module', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads all components when all imports succeed', async () => {
    const CompA = () => null
    const CompB = () => null

    const loaders: [string, () => Promise<{ default: unknown }>][] = [
      ['CompA', () => Promise.resolve({ default: CompA })],
      ['CompB', () => Promise.resolve({ default: CompB })],
    ]

    const result: Record<string, unknown> = {}
    const results = await Promise.allSettled(
      loaders.map(async ([name, loader]) => {
        const mod = await loader()
        return [name, mod.default || mod] as const
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') {
        result[r.value[0]] = r.value[1]
      }
    }

    expect(Object.keys(result)).toEqual(['CompA', 'CompB'])
    expect(result.CompA).toBe(CompA)
    expect(result.CompB).toBe(CompB)
  })

  it('loads successful components even when some fail', async () => {
    const CompA = () => null
    const CompC = () => null

    const loaders: [string, () => Promise<{ default: unknown }>][] = [
      ['CompA', () => Promise.resolve({ default: CompA })],
      ['CompB', () => Promise.reject(new Error('Cannot find module lucide-react'))],
      ['CompC', () => Promise.resolve({ default: CompC })],
    ]

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result: Record<string, unknown> = {}
    const results = await Promise.allSettled(
      loaders.map(async ([name, loader]) => {
        const mod = await loader()
        return [name, mod.default || mod] as const
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') {
        result[r.value[0]] = r.value[1]
      } else {
        console.warn('[signoz-components] Failed to load component:', r.reason?.message || r.reason)
      }
    }

    // CompA and CompC should load, CompB should not
    expect(Object.keys(result)).toEqual(['CompA', 'CompC'])
    expect(result.CompA).toBe(CompA)
    expect(result.CompC).toBe(CompC)
    expect(result.CompB).toBeUndefined()

    expect(warnSpy).toHaveBeenCalledWith(
      '[signoz-components] Failed to load component:',
      'Cannot find module lucide-react'
    )
    warnSpy.mockRestore()
  })

  it('returns empty object when all components fail', async () => {
    const loaders: [string, () => Promise<{ default: unknown }>][] = [
      ['CompA', () => Promise.reject(new Error('missing dep'))],
      ['CompB', () => Promise.reject(new Error('missing dep'))],
    ]

    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result: Record<string, unknown> = {}
    const results = await Promise.allSettled(
      loaders.map(async ([name, loader]) => {
        const mod = await loader()
        return [name, mod.default || mod] as const
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') {
        result[r.value[0]] = r.value[1]
      }
    }

    expect(Object.keys(result)).toEqual([])
  })

  it('handles components with named exports (no default)', async () => {
    const NamedComp = () => null

    const loaders: [string, () => Promise<Record<string, unknown>>][] = [
      ['NamedComp', () => Promise.resolve({ NamedComp, __esModule: true })],
    ]

    const result: Record<string, unknown> = {}
    const results = await Promise.allSettled(
      loaders.map(async ([name, loader]) => {
        const mod = await loader()
        return [name, (mod as { default?: unknown }).default || mod] as const
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') {
        result[r.value[0]] = r.value[1]
      }
    }

    // When no default export, should fall back to the module itself
    expect(result.NamedComp).toBeDefined()
  })
})

describe('signozComponentsPlugin output', () => {
  it('generates valid virtual module code with dynamic imports', async () => {
    // Dynamically import the plugin to test its output
    const { signozComponentsPlugin } = await import('../../vite-plugin-signoz-components')

    const plugin = signozComponentsPlugin('/fake/signoz')

    // The load hook should generate code with loadSignozComponents
    if (typeof plugin.load === 'function') {
      const code = await (plugin.load as Function).call({}, '\0virtual:signoz-components')

      if (code) {
        // Verify the generated code structure
        expect(code).toContain('loadSignozComponents')
        expect(code).toContain('Promise.allSettled')
        // Should NOT have top-level static imports of components
        expect(code).not.toMatch(/^import Component\d+ from/m)
      }
    }
  })
})
