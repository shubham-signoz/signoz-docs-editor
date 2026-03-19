/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { signozComponentsPlugin } from './vite-plugin-signoz-components'
import { contextAwareResolver } from './vite-plugin-context-resolver'

const SIGNOZ_DIR = process.env.SIGNOZ_DIR || process.cwd()
const API_PORT = process.env.PORT || '3001'
const LOCAL_SRC = resolve(__dirname, './src')
const DEFAULT_API_BASE = '/api'
const RAW_API_BASE = (process.env.VITE_API_BASE || DEFAULT_API_BASE).trim()
const API_BASE = RAW_API_BASE.endsWith('/') && RAW_API_BASE.length > 1
  ? RAW_API_BASE.slice(0, -1)
  : RAW_API_BASE || DEFAULT_API_BASE

const API_BASE_PREFIX = API_BASE.startsWith('/')
  ? API_BASE
  : `/${API_BASE}`

const isAbsoluteApiBase = /^https?:\/\//.test(API_BASE_PREFIX)

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildApiProxyConfig() {
  if (isAbsoluteApiBase) {
    return {}
  }

  if (API_BASE_PREFIX === DEFAULT_API_BASE) {
    return {
      [DEFAULT_API_BASE]: `http://localhost:${API_PORT}`,
    }
  }

  return {
    [API_BASE_PREFIX]: {
      target: `http://localhost:${API_PORT}`,
      rewrite: (path: string) => path.replace(
        new RegExp(`^${escapeRegExp(API_BASE_PREFIX)}`),
        DEFAULT_API_BASE
      ),
    },
  }
}

const apiProxyConfig = buildApiProxyConfig()

export default defineConfig({
  plugins: [
    contextAwareResolver(SIGNOZ_DIR, LOCAL_SRC),
    react(),
    signozComponentsPlugin(SIGNOZ_DIR),
  ],
  resolve: {
    alias: [
      { find: 'next/link', replacement: resolve(__dirname, './src/shims/next-link.tsx') },
      { find: 'next/image', replacement: resolve(__dirname, './src/shims/next-image.tsx') },
      { find: 'next/navigation', replacement: resolve(__dirname, './src/shims/next-navigation.tsx') },
      { find: '@react-stately/flags', replacement: resolve(__dirname, './src/shims/react-stately-flags.ts') },
      { find: '@signoz-components', replacement: resolve(SIGNOZ_DIR, 'components') },
      { find: '@signoz-constants', replacement: resolve(SIGNOZ_DIR, 'constants') },
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      '@mdx-js/mdx',
      'react-medium-image-zoom',
      'debug',
      'fuse.js',
      'gray-matter',
      'codemirror',
      '@codemirror/lang-markdown',
      '@codemirror/language',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/language-data',
      '@mdxeditor/editor',
    ],
    // Allow esbuild to resolve packages from signoz.io's node_modules
    // so CJS deps used by signoz components get properly pre-bundled
    esbuildOptions: {
      nodePaths: [resolve(SIGNOZ_DIR, 'node_modules')],
    },
  },
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      ...apiProxyConfig,
      '/img': `http://localhost:${API_PORT}`,
      '/svgs': `http://localhost:${API_PORT}`,
    },
    fs: {
      allow: ['.', SIGNOZ_DIR],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
