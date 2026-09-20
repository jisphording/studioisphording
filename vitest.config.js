// Vitest configuration for the front-end (dev/js) test suite.
//
// Deliberately standalone: it does NOT import vite.config.build.js, so the
// production build's terser/manifest/draco machinery never runs during tests.
// Tests live in tests/js/ (outside dev/js), so the bundle and the refactor
// scan stay test-free. The default environment is 'node' — DOM-touching tests
// opt into jsdom with a `// @vitest-environment jsdom` docblock.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/js/**/*.test.{js,mjs}'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true
  }
})
