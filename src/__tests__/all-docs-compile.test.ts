/**
 * Integration test that compiles AND renders every MDX doc in the signoz.io repo.
 *
 * NOT included in the default test suite — run explicitly with:
 *   SIGNOZ_DIR=/path/to/signoz.io npx vitest run src/__tests__/all-docs-compile.test.ts
 *
 * Requires SIGNOZ_DIR to point to a signoz.io checkout with `npm install` done.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { compileMDX } from '../mdx-compiler'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SIGNOZ_DIR = process.env.SIGNOZ_DIR
const DOCS_ROOT = SIGNOZ_DIR ? path.join(SIGNOZ_DIR, 'data', 'docs') : ''

function collectFiles(dir: string, ext: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, ext))
    } else if (entry.name.endsWith(ext)) {
      files.push(fullPath)
    }
  }
  return files
}

function collectMdxFiles(dir: string): string[] {
  return collectFiles(dir, '.mdx')
}

// Create a stub component that renders its children
function makeStub(name: string): React.ComponentType<any> {
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-component': name }, children)
  Stub.displayName = `Stub(${name})`
  return Stub
}

// Comprehensive list of ALL components used across signoz.io docs.
// Extracted from MDXComponents.tsx + common MDX components.
const ALL_COMPONENT_NAMES = [
  // From MDXComponents.tsx registry
  'Admonition', 'DocCard', 'Figure', 'GetStartedSigNoz', 'YouTube',
  'Image', 'KeyPointCallout', 'ToggleHeading', 'Region', 'RegionTable',
  'LogsQuickStartOverview', 'APMQuickStartOverview', 'MetricsQuickStartOverview',
  'GetStartedOpenTelemetryButton', 'GetStartedInfrastructureMonitoring',
  'PricingCTA', 'ImageCTA', 'FAQAccordion', 'DatadogVsSigNoz',
  'NewRelicVsSigNoz', 'GrafanaVsSigNoz', 'DatadogAlternativesFinder',
  'DatadogPricingCalculator', 'CustomMetricPlayground', 'Carousel',
  'ProductFeatureShowcase', 'OtelCollectorFlow', 'InArticleVideoShowcaseModal',
  'IconCardGrid', 'ArticleSeriesTop', 'ArticleSeriesBottom',
  'Button', 'ClientZoom', 'ReactMarkdown', 'HostingDecision',
  'LiteLLMDashboardsListicle', 'APMDashboardsListicle',
  'DashboardActions', 'DashboardTemplatesListicle',
  'HostMetricsDashboardsListicle', 'KubernetesDashboardsListicle',
  'APMInstrumentationListicle', 'JavaInstrumentationListicle',
  'JavascriptInstrumentationListicle', 'LogsInstrumentationListicle',
  'LogsQuickStartOverview', 'CollectionAgentsListicle',
  'SelfHostInstallationListicle', 'MarketplaceInstallationListicle',
  'K8sInstallationListicle', 'MigrateToSigNozOverview',
  'IntegrationsListicle', 'LLMMonitoringListicle',
  'AWSMonitoringListicle', 'AWSOneClickListicle',
  'CICDMonitoringListicle', 'GetHelp',
  // Common MDX/JSX components used in docs
  'Tab', 'Tabs', 'TabItem', 'TabList', 'TabPanel',
  'SignedIn', 'SignedOut',
  // HTML elements that might be used as components
  'a', 'img', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
  'blockquote', 'hr', 'br', 'div', 'span', 'strong', 'em',
]

const stubComponents: Record<string, React.ComponentType<any>> = {}
for (const name of ALL_COMPONENT_NAMES) {
  stubComponents[name] = makeStub(name)
}

const shouldRun = SIGNOZ_DIR && fs.existsSync(DOCS_ROOT)

describe.skipIf(!shouldRun)('All docs compile and render without errors', () => {
  let mdxFiles: string[] = []

  beforeAll(() => {
    // Mock fetch — compileMDX uses it for resolving cross-file MDX imports.
    // Return 404 so local .mdx imports are skipped (they'd need the API server).
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => null,
    }))

    mdxFiles = collectMdxFiles(DOCS_ROOT)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should find docs to test', () => {
    expect(mdxFiles.length).toBeGreaterThan(0)
    console.log(`Found ${mdxFiles.length} MDX files to compile and render`)
  })

  it('all docs compile and render without errors', async () => {
    const failures: { file: string; stage: 'compile' | 'render'; error: string }[] = []
    let passed = 0

    const BATCH_SIZE = 20
    for (let i = 0; i < mdxFiles.length; i += BATCH_SIZE) {
      const batch = mdxFiles.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (filePath) => {
          const relativePath = path.relative(DOCS_ROOT, filePath)
          const source = fs.readFileSync(filePath, 'utf-8')

          // Extract component-like tags from the source and add stubs for any
          // that aren't already in the stub map. This catches components used
          // directly without import statements (e.g. <Admonition>).
          const tagMatches = source.matchAll(/<([A-Z][A-Za-z0-9]*)/g)
          const perFileComponents = { ...stubComponents }
          for (const m of tagMatches) {
            const name = m[1]
            if (name && !(name in perFileComponents)) {
              perFileComponents[name] = makeStub(name)
            }
          }

          // Stage 1: Compile
          let result
          try {
            result = await compileMDX(source, perFileComponents, relativePath)
          } catch (err) {
            return {
              relativePath,
              stage: 'compile' as const,
              error: err instanceof Error ? err.message : String(err),
            }
          }

          if (result.error) {
            return { relativePath, stage: 'compile' as const, error: result.error }
          }

          // Stage 2: Render
          if (result.content) {
            try {
              renderToStaticMarkup(result.content)
            } catch (err) {
              return {
                relativePath,
                stage: 'render' as const,
                error: err instanceof Error ? err.message : String(err),
              }
            }
          }

          return { relativePath, stage: null, error: null }
        })
      )

      for (const r of results) {
        if (r.error) {
          failures.push({ file: r.relativePath, stage: r.stage!, error: r.error })
        } else {
          passed++
        }
      }

      // Progress log every 100 files
      if ((i + BATCH_SIZE) % 100 < BATCH_SIZE) {
        console.log(`  Progress: ${Math.min(i + BATCH_SIZE, mdxFiles.length)}/${mdxFiles.length}`)
      }
    }

    console.log(`\nResults: ${passed} passed, ${failures.length} failed out of ${mdxFiles.length} docs`)

    if (failures.length > 0) {
      const summary = failures
        .map(({ file, stage, error }) => `  [${stage}] ${file}: ${error}`)
        .join('\n')
      console.error(`\nFailed docs:\n${summary}\n`)
    }

    expect(failures).toEqual([])
  }, 300_000) // 5 min timeout for 665 docs
})

/**
 * Targeted test: .md files imported from docs that contain patterns invalid in MDX.
 *
 * Scans ALL shared .md files for known MDX-breaking patterns (email autolinks,
 * HTML comments, raw HTML attributes, etc.), then verifies each one compiles
 * and renders when imported into an .mdx doc — using the REAL file content,
 * not mocked data.
 *
 * BEFORE the format:'md' fix, these would fail with errors like:
 *   "Unexpected character `@` (U+0040) in name"
 *   "Unexpected closing tag `-->`, expected corresponding opening tag"
 *
 * AFTER the fix, .md imports are compiled separately with format:'md',
 * which preserves standard markdown semantics.
 */
describe.skipIf(!shouldRun)('.md imports with MDX-breaking patterns compile correctly', () => {
  const SHARED_DIR = SIGNOZ_DIR ? path.join(SIGNOZ_DIR, 'components', 'shared') : ''

  const MDX_BREAKING_PATTERNS: { name: string; regex: RegExp }[] = [
    { name: 'email autolink', regex: /<[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}>/ },
    { name: 'HTML comment', regex: /<!--/ },
    { name: 'raw class= attribute', regex: / class=/ },
  ]

  /** Check if a pattern occurs outside code fences */
  function hasPatternOutsideCodeFences(content: string, regex: RegExp): boolean {
    let inFence = false
    for (const line of content.split('\n')) {
      if (line.trim().startsWith('```')) inFence = !inFence
      if (!inFence && regex.test(line)) return true
    }
    return false
  }

  interface ProblematicFile {
    filePath: string
    fileName: string
    content: string
    matchedPatterns: string[]
  }

  let problematicFiles: ProblematicFile[] = []

  beforeAll(() => {
    if (!fs.existsSync(SHARED_DIR)) return

    // Scan all .md files in components/shared for MDX-breaking patterns
    const allMdFiles = collectFiles(SHARED_DIR, '.md')
      .filter(f => !f.endsWith('.mdx'))

    for (const filePath of allMdFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const fileName = path.relative(SHARED_DIR, filePath)
      const matched: string[] = []

      for (const { name, regex } of MDX_BREAKING_PATTERNS) {
        if (hasPatternOutsideCodeFences(content, regex)) {
          matched.push(name)
        }
      }

      if (matched.length > 0) {
        problematicFiles.push({
          filePath,
          fileName,
          content,
          matchedPatterns: matched,
        })
      }
    }

    // Mock fetch to return the real .md content when the import resolver asks
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      for (const file of problematicFiles) {
        if (urlStr.includes('resolve-import') && urlStr.includes(encodeURIComponent(file.fileName))) {
          return {
            ok: true,
            json: async () => ({
              path: `components/shared/${file.fileName}`,
              content: file.content,
            }),
          }
        }
      }

      return { ok: false, status: 404, json: async () => null }
    }))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should find .md files with MDX-breaking patterns', () => {
    expect(problematicFiles.length).toBeGreaterThan(0)
    for (const file of problematicFiles) {
      console.log(`  ${file.fileName}: ${file.matchedPatterns.join(', ')}`)
    }
  })

  it('each problematic .md file compiles and renders when imported into .mdx', async () => {
    const failures: { file: string; patterns: string[]; error: string }[] = []

    for (const file of problematicFiles) {
      const importName = file.fileName
        .replace(/\.md$/, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .replace(/^./, (c) => c.toUpperCase())

      const mdxSource = `
import ${importName} from '@/components/shared/${file.fileName}'

# Test Doc

<${importName} />
`

      const result = await compileMDX(
        mdxSource,
        {},
        `data/docs/test-${file.fileName.replace('.md', '')}.mdx`
      )

      if (result.error) {
        failures.push({
          file: file.fileName,
          patterns: file.matchedPatterns,
          error: result.error,
        })
        continue
      }

      // Also verify it renders without throwing
      if (result.content) {
        try {
          renderToStaticMarkup(result.content)
        } catch (err) {
          failures.push({
            file: file.fileName,
            patterns: file.matchedPatterns,
            error: `Render error: ${err instanceof Error ? err.message : String(err)}`,
          })
        }
      }
    }

    if (failures.length > 0) {
      const summary = failures
        .map(({ file, patterns, error }) => `  ${file} (${patterns.join(', ')}): ${error}`)
        .join('\n')
      console.error(`\nFailed .md imports:\n${summary}\n`)
    }

    expect(failures).toEqual([])
  })
})
