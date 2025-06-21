import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Entry points
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'dev/js/index.js'),
        three: resolve(__dirname, 'dev/js/three/runExperience.js'),
      },
      output: {
        dir: 'app/assets/bundle',
        entryFileNames: '[name].bundle.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return '[name].css'
          }
          return 'assets/[name].[ext]'
        }
      }
    },
    outDir: 'app/assets/bundle',
    emptyOutDir: true,
  },
  
  // Development server (assets only, no PHP server)
  server: {
    port: 9000,
    host: 'localhost',
    open: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },

  // Asset handling
  publicDir: 'dev/assets',
  
  // CSS preprocessing
  css: {
    preprocessorOptions: {
      scss: {
        // Enable source maps for SCSS
        sourceMap: true,
      }
    }
  },

  // File extensions to resolve
  resolve: {
    extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.scss', '.css']
  },

  // Asset types
  assetsInclude: [
    '**/*.glsl',
    '**/*.vs', 
    '**/*.fs',
    '**/*.vert',
    '**/*.frag'
  ]
})
