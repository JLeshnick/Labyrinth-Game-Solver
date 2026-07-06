import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import pkg from './package.json' with { type: 'json' }

// Vitest augments Vite's config with a `test` field. We import `defineConfig`
// from `vite` (not `vitest/config`) so the plugin types resolve against the
// project's Vite install; assigning to a typed variable first avoids the
// excess-property check that would otherwise reject `test`.
const config: UserConfig & { test?: Record<string, unknown> } = {
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}

// https://vite.dev/config/
export default defineConfig(config)
