import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // App-Version aus package.json (einzige Quelle), angezeigt in der Sidebar
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
})
