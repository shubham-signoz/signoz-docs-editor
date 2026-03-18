/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { signozComponentsPlugin } from './vite-plugin-signoz-components'
import { contextAwareResolver } from './vite-plugin-context-resolver'

const SIGNOZ_DIR = process.env.SIGNOZ_DIR || resolve(__dirname, '../signoz.io')
const LOCAL_SRC = resolve(__dirname, './src')

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
    include: ['@mdx-js/mdx', 'react-medium-image-zoom'],
    exclude: [],
  },
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      '/img': 'http://localhost:3001',
      '/svgs': 'http://localhost:3001',
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
