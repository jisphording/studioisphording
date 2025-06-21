import { defineConfig } from 'vite'
import { resolve } from 'path'
import { spawn } from 'child_process'

let phpServer = null

export default defineConfig({
  plugins: [
    {
      name: 'php-server',
      configureServer(server) {
        // Start PHP server when Vite dev server starts
        const { execSync } = require('child_process')
        
        try {
          execSync('php --version', { stdio: 'ignore' })
          console.log('\n🚀 PHP found! Starting PHP development server...')
          
          phpServer = spawn('php', ['-S', 'localhost:8000', '-t', 'app'], {
            stdio: 'pipe',
            shell: true
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
            console.log('✅ Asset compilation via Vite on: http://localhost:9000')
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
  
  // Development server
  server: {
    port: 9000,
    host: 'localhost',
    open: 'http://localhost:8000', // Open PHP server instead of Vite dev server
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
