import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Set root to dev directory for consistency
  root: './dev',
  
  // Set base path for assets
  base: '/assets/bundle/',
  
  // Production build optimization
  build: {
    // Generate manifest for dynamic imports
    manifest: true,
    
    // Increase chunk size warning limit to 1MB (from default 500kB)
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'dev/js/index.js'),
        three: resolve(__dirname, 'dev/js/three/runExperience.js'),
      },
      output: {
        dir: resolve(__dirname, 'app/assets/bundle'),
        entryFileNames: '[name].bundle.js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return '[name].css'
          }
          return 'assets/[name]-[hash].[ext]'
        },
        // Manual chunk splitting for better optimization
        manualChunks: {
          // Vendor libraries chunk
          'vendor-three': ['three']
        }
      }
    },
    outDir: resolve(__dirname, 'app/assets/bundle'),
    emptyOutDir: true,
    
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true,
        pure_funcs: ['console.log'] // Remove console.log in production if needed
      }
    },
    
    // Enable source maps for debugging
    sourcemap: true,
    
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  
  // Asset handling
  publicDir: 'assets',
  
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
  ],

  // Optimization for dependencies
  optimizeDeps: {
    include: ['three'],
    exclude: ['dat.gui', 'stats-js'] // These might be loaded differently
  }
})
