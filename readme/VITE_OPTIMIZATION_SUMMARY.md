# Vite Build Optimization Summary

## Problem Solved
The original build was generating chunks larger than 500kB, triggering Vite's warning about large bundle sizes that could impact loading performance.

## Optimizations Implemented

### 1. Manual Chunk Splitting
`vite.config.build.js` uses a function-form `manualChunks` callback (required for
Rolldown compatibility — the object-form shorthand isn't supported there) that
isolates Three.js into a single chunk:

- **vendor-three**: everything imported from `node_modules/three`, split into its
  own chunk so it can be cached independently of app code
- Everything else stays in `app.bundle.js` or its dynamically-imported chunks:
  animation glue and cookie consent, the `runExperience` chunk (Experience,
  camera, renderer, resources) and one chunk per world
  (`dev/js/three/projects/<world>/index.mjs`).

### 2. Dynamic Imports
The main entry point (`dev/js/index.js`) uses dynamic imports for better code
splitting:
- Animation modules (`animGsap`, `animBarba`) and cookie consent load
  asynchronously after the initial page render
- **Three.js is route-split**: `dev/js/utils/startWebgl.mjs` imports
  `three/runExperience.js` only when the page has a `#webgl` canvas with a
  `data-world`, and `dev/js/three/worlds.mjs` is a registry of lazy loaders,
  so `vendor-three` and the world chunks are never fetched on other routes.
  `scripts/smoke.sh` fails if the built entry statically imports `vendor-three`
- **Barba lifecycle**: `startWebgl(root)` keeps the stop handle
  `runExperience()` returns; `animBarba.mjs` calls `stopWebgl()` while the
  cover hides a page holding `#webgl` (→ `Experience.destroy()`: rAF loop,
  resize listener, controls, renderer, scene GPU resources, Draco workers,
  singleton reset) and `startWebgl(container)` in `afterEnter`. Starting the
  canvas already running is a no-op, so the initial load never starts twice
- Reduces initial bundle size
- Enables lazy loading of non-critical functionality

### 3. Build Configuration
- **Single rollup entry**: `app` (`dev/js/index.js`) — Three.js is reached
  through a dynamic import from there rather than declared as a second rollup
  entry, so it is bundled as a normal chunk instead of emitting its own
  top-level `three.bundle.js` artifact
- **Chunk Size Warning Limit**: Increased to 1MB (from 500kB) for vendor libraries
- **Terser Minification**: Proper minification with source maps
- **Hash-based Naming**: Chunks include content hashes for better caching
- **Source Maps**: Enabled for debugging while maintaining production optimization

### 4. Dependency Optimization
- Three.js is pre-bundled and optimized
- Excluded development-only dependencies from optimization
- Proper CommonJS handling for node_modules

### 5. Modulepreload (PHP)
`vite()` in `app/site/plugins/vite-manifest/index.php` modulepreloads the
entry's dynamic imports. Chunks that reach `vendor-three` are preloaded only
when `vite('js/index.js', true, $world)` is called, and then only
`runExperience` plus the page's own world chunk — never `vendor-three`, which
the dynamic import fetches itself (it competed with CSS/fonts in `<head>`).
`header.php` passes the world (`$page->webglWorldChunk()`, from
`WEBGL_WORLD_CHUNKS`, pinned against `worlds.mjs` by a test) for pages whose
`$page->rendersWebgl()` is true (templates listed in `WEBGL_TEMPLATES` in the
site-methods plugin; `tests/php/plugins/PageMethodsTest.php` fails if that
list drifts from the templates that render `#webgl`).

## File Structure
```
app/assets/bundle/
├── app.bundle.js - Main application entry
├── vendor-three-[hash].js - Three.js library (WebGL pages only)
├── runExperience-[hash].js - the Experience (WebGL pages only)
├── index-[hash].js - one chunk per world (only the page's world loads)
├── animBarba-[hash].js, animGsap-[hash].js, cookieconsent-[hash].js - dynamically-loaded chunks
└── app.css - Compiled styles
```

## Recommendations for Future Development

1. **Monitor Bundle Sizes**: Use `npm run build` to check chunk sizes regularly
2. **Lazy Load Heavy Features**: Consider dynamic imports for large, optional features
3. **Optimize Images**: Use modern formats (WebP, AVIF) and appropriate sizing
4. **Consider CDN**: For frequently used libraries like GSAP and Barba.js
5. **Regular Audits**: Periodically review and optimize bundle composition

## Commands
- `npm run build` - Build optimized production bundles
- `npm run dev` - Start development server with hot reload
- `npm run preview` - Preview production build locally
