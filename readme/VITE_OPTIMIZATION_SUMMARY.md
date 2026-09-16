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
- Everything else (animation glue, cookie consent, project-specific Three.js code)
  stays in `app.bundle.js` or its dynamically-imported chunks — there is no
  separate `three-modules`, `three-world` or `utils` chunk.

### 2. Dynamic Imports
The main entry point (`dev/js/index.js`) uses dynamic imports for better code
splitting:
- Animation modules (`animGsap`, `animBarba`) and cookie consent load
  asynchronously after the initial page render
- Reduces initial bundle size
- Enables lazy loading of non-critical functionality

### 3. Build Configuration
- **Single rollup entry**: `app` (`dev/js/index.js`) — Three.js is imported
  statically from there rather than declared as a second rollup entry, so it
  is bundled as a normal chunk instead of emitting its own top-level
  `three.bundle.js` artifact
- **Chunk Size Warning Limit**: Increased to 1MB (from 500kB) for vendor libraries
- **Terser Minification**: Proper minification with source maps
- **Hash-based Naming**: Chunks include content hashes for better caching
- **Source Maps**: Enabled for debugging while maintaining production optimization

### 4. Dependency Optimization
- Three.js is pre-bundled and optimized
- Excluded development-only dependencies from optimization
- Proper CommonJS handling for node_modules

## File Structure
```
app/assets/bundle/
├── app.bundle.js - Main application entry
├── vendor-three-[hash].js - Three.js library
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
