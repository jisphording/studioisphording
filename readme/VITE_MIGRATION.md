# Migration from Webpack to Vite

This project has been successfully migrated from Webpack to Vite for faster development and easier configuration.

## What Changed

### Removed Files
- `bundler/` directory (webpack.common.js, webpack.dev.js, webpack.prod.js)
- All webpack-related dependencies

### Added Files
- `vite.config.js` - Vite configuration
- `index.html` - Development entry point for Vite
- `VITE_MIGRATION.md` - This documentation

### Updated Files
- `package.json` - Updated scripts and dependencies

## New Commands

```bash
# Development server for assets only (Vite dev server)
npm run dev

# Production build (replaces webpack build)
npm run build

# Preview production build
npm run preview

# Start PHP development server (requires PHP installed)
npm run php

# Start both PHP server and Vite dev server together
npm run dev:full
```

## PHP Server Setup

Since your project uses PHP templates, you have two options:

### Option 1: Install PHP (Recommended)
1. Download PHP from https://www.php.net/downloads.php
2. Add PHP to your system PATH
3. Run `npm run dev:full` to start both servers

### Option 2: Use XAMPP/WAMP (Alternative)
1. Install XAMPP (https://www.apachefriends.org/) or WAMP
2. Copy your `app/` folder to the htdocs directory
3. Start Apache in XAMPP/WAMP control panel
4. Run `npm run dev` for asset compilation
5. Access your site at http://localhost/app

### Option 3: Development with Static Files
For now, you can:
1. Run `npm run build` to compile assets
2. Open your PHP files directly in a browser as static files
3. The compiled CSS and JS will be available in `app/assets/bundle/`

## Development Server

The development server now runs on `http://localhost:9000/` (same port as before) with:
- Hot Module Replacement (HMR)
- Fast refresh
- SCSS preprocessing
- Asset handling for images, fonts, and shaders

## Build Output

Production builds are output to `app/assets/bundle/` maintaining the same structure:
- `app.bundle.js` - Main application bundle
- `three.bundle.js` - Three.js experience bundle
- `app.css` - Compiled styles
- Assets are copied from `dev/assets/` to `app/assets/`

## Benefits of Vite

1. **Faster Development**: Vite uses native ES modules during development
2. **Instant Server Start**: No bundling during development
3. **Lightning Fast HMR**: Updates reflect immediately
4. **Simpler Configuration**: Less complex than webpack
5. **Better Developer Experience**: Clearer error messages and faster builds

## Configuration

The `vite.config.js` file maintains compatibility with your existing:
- SCSS preprocessing
- Asset handling (images, fonts, shaders)
- Multiple entry points (app and three.js)
- Development server settings
- Production build optimization

## Notes

- The `index.html` file is used only for development asset bundling
- Your PHP templates in `app/` remain unchanged
- All existing import paths and module structure work as before
- Asset paths and public directory structure are preserved
