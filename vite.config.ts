import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Which vendor chunk a node_modules package belongs to. html2canvas and canvg are
// reached only through jsPDF's own dynamic imports (.html() / SVG rendering), so they
// stay in chunks of their own — folding them into vendor-pdf would force every PDF
// export to download ~360 kB it never executes.
const VENDOR_CHUNKS: Record<string, string> = {
  'react': 'vendor-react',
  'react-dom': 'vendor-react',
  'scheduler': 'vendor-react',
  'react-router': 'vendor-react',
  'react-router-dom': 'vendor-react',
  '@remix-run/router': 'vendor-react',
  'jspdf': 'vendor-pdf',
  'fflate': 'vendor-pdf',
  'fast-png': 'vendor-pdf',
  'html2canvas': 'vendor-html2canvas',
  'canvg': 'vendor-canvg',
  'rgbcolor': 'vendor-canvg',
  'stackblur-canvas': 'vendor-canvg',
  'svg-pathdata': 'vendor-canvg',
  'raf': 'vendor-canvg',
  'performance-now': 'vendor-canvg',
  'jszip': 'vendor-zip',
  'pako': 'vendor-zip',
  'lie': 'vendor-zip',
  'readable-stream': 'vendor-zip',
  'setimmediate': 'vendor-zip',
  'immediate': 'vendor-zip',
}

function vendorChunk(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/')
  // Rollup's CommonJS interop helpers are a virtual module shared by every CJS
  // dependency. Left unassigned they land inside whichever vendor chunk claims them
  // first, which drags that chunk (jsPDF's, in practice) into the entry's static
  // import graph and defeats the lazy loading below.
  if (normalized.includes('commonjsHelpers')) return 'vendor-shared'
  const marker = normalized.lastIndexOf('node_modules/')
  if (marker === -1) return undefined
  const segments = normalized.slice(marker + 'node_modules/'.length).split('/')
  const pkg = segments[0].startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]
  if (pkg.startsWith('@supabase/')) return 'vendor-supabase'
  return VENDOR_CHUNKS[pkg]
}

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: (id) => vendorChunk(id)
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  }
})
