import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Set root to dev directory for proper file watching
  root: './dev',
  
  // Simple build configuration for development
  build: {
    // Output to a temporary directory, as assets are served from memory in dev
    outDir: '../public/dist',
    emptyOutDir: true,
    
    // Simple rollup options for development
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'dev/js/index.js'),
        three: resolve(__dirname, 'dev/js/three/runExperience.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    
    // Fast source maps for development
    sourcemap: true,
    
    // Disable minification for faster builds
    minify: false
  },
  
  // Development server optimized for HMR
  server: {
    port: 9001, // Explicitly set to 9001 as it was found to be available
    host: '0.0.0.0',
    open: 'http://localhost:8000', // Open PHP server instead of Vite dev server
    cors: true,
    
    // Enhanced file watching for HMR
    watch: {
      usePolling: true, // Helps with file watching on Windows
      interval: 500,
      include: ['**/*.js', '**/*.mjs', '**/*.css', '**/*.scss', '**/*.html', '**/*.glsl', '**/*.vs', '**/*.fs'],
      ignored: ['**/node_modules/**', '**/app/**', '**/test/**', '**/utils/**']
    },
    
    // CORS headers for Kirby integration
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    
    // HMR configuration
    hmr: {
      port: 9005, // Explicitly set HMR port to 9005
      overlay: true,
      host: 'localhost' // Ensure HMR connects to localhost
    }
  },

  // Asset handling
  publicDir: 'assets',
  
  // CSS preprocessing with fast source maps
  css: {
    preprocessorOptions: {
      scss: {
        sourceMap: true,
      }
    },
    devSourcemap: true
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
  ],

  // Optimization for dependencies - keep it simple for dev
  optimizeDeps: {
    include: ['three'],
    exclude: ['dat.gui', 'stats-js']
  }
})
