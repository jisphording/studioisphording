import { defineConfig } from 'vite'
import { resolve } from 'path'
import { spawn } from 'child_process'

let phpServer = null

export default defineConfig({
  // Set root to dev directory for proper file watching
  root: './dev',
  
  plugins: [
    {
      name: 'php-server',
      configureServer(server) {
        // Start PHP server when Vite dev server starts
        const { execSync } = require('child_process')
        
        try {
          execSync('php --version', { stdio: 'ignore' })
          console.log('\n🚀 PHP found! Starting PHP development server...')
          
          phpServer = spawn('php', ['-S', 'localhost:8000', '-t', './app'], {
            stdio: 'pipe',
            shell: true,
            cwd: process.cwd()
          })
          
          phpServer.stdout.on('data', (data) => {
            const output = data.toString().trim()
            if (output) console.log(`PHP Server: ${output}`)
          })
          
          phpServer.stderr.on('data', (data) => {
            const output = data.toString().trim()
            if (output && !output.includes('Development Server')) {
              console.log(`PHP Server: ${output}`)
            }
          })
          
          phpServer.on('close', (code) => {
            if (code !== 0) {
              console.log(`PHP server exited with code ${code}`)
            }
          })
          
          // Give PHP server a moment to start
          setTimeout(() => {
            console.log('✅ PHP Server started on http://localhost:8000')
            console.log('✅ Your site will be available at: http://localhost:8000')
            console.log('✅ Asset compilation via Vite on: http://localhost:9002')
          }, 1000)
          
        } catch (error) {
          console.log('\n⚠️  PHP not found in system PATH.')
          console.log('📋 Options:')
          console.log('   1. Install PHP and add to PATH')
          console.log('   2. Install XAMPP/WAMP and copy app/ folder to htdocs')
          console.log('   3. Use Vite dev server for asset compilation only')
          console.log('\n🔧 For now, starting Vite dev server for asset compilation...')
        }
        
        // Handle server shutdown
        process.on('SIGINT', () => {
          if (phpServer) {
            phpServer.kill()
            phpServer = null
            console.log('\n🛑 PHP server stopped')
          }
          process.exit()
        })
        
        process.on('SIGTERM', () => {
          if (phpServer) {
            phpServer.kill()
            phpServer = null
          }
        })
      }
    }
  ],
  
  // Simple build configuration for development
  build: {
    // Output to the same directory as production for consistency
    outDir: '../app/assets/bundle',
    emptyOutDir: true,
    
    // Simple rollup options for development
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'dev/js/index.js'),
        three: resolve(__dirname, 'dev/js/three/runExperience.js'),
      },
      output: {
        dir: '../app/assets/bundle',
        entryFileNames: '[name].bundle.js',
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
    port: 9002,
    host: 'localhost',
    open: 'http://localhost:8000', // Open PHP server instead of Vite dev server
    cors: true,
    
    // Enhanced file watching for HMR
    watch: {
      usePolling: true, // Helps with file watching on Windows
      interval: 100,
      include: ['**/*.js', '**/*.mjs', '**/*.css', '**/*.scss', '**/*.html', '**/*.glsl', '**/*.vs', '**/*.fs'],
      ignored: ['**/node_modules/**', '**/app/**', '**/test/**', '**/utils/**']
    },
    
    // CORS headers for PHP integration
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    
    // HMR configuration
    hmr: {
      port: 9003,
      overlay: true
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
