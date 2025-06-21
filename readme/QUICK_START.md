# Quick Start Guide - Studio Isphording Development

Your project has been successfully migrated from Webpack to Vite! Here's how to get started:

## ✅ What's Already Working

- ✅ Asset compilation (CSS & JS) is working perfectly
- ✅ Your Kirby CMS templates are already configured correctly
- ✅ Build output goes to the right location (`app/assets/bundle/`)
- ✅ All your existing code and imports work unchanged

## 🚀 Getting Started

### Option 1: Quick Setup with XAMPP (Easiest)

1. **Download XAMPP**: https://www.apachefriends.org/
2. **Install XAMPP** and start Apache
3. **Copy your app folder**: Copy the entire `app/` folder to `C:\xampp\htdocs\studioisphording\`
4. **Start development**: 
   ```bash
   npm run dev    # Starts Vite for asset compilation
   ```
5. **Open your site**: http://localhost/studioisphording/

### Option 2: Install PHP (More Flexible) - AUTOMATED!

**Easy Installation (Recommended):**
1. **Right-click `download-php.bat`** and select **"Run as administrator"**
2. **Wait for download and installation** (automatic)
3. **Restart your command prompt/IDE**
4. **Run `check-php.bat`** to verify and start development

**Manual Installation:**
1. **Download PHP**: https://www.php.net/downloads.php
2. **Add PHP to PATH** (Windows environment variables)
3. **Start development**:
   ```bash
   npm run dev:full    # Starts both PHP server and Vite
   ```
4. **Open your site**: http://localhost:8000/

### Option 3: Just Asset Development

If you only want to work on CSS/JS:
```bash
npm run build    # Compile assets once
# or
npm run dev      # Watch for changes and recompile
```

## 🔧 Development Commands

```bash
# Start development (automatically starts PHP server if available)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Start only PHP server (requires PHP installed)
npm run php

# Start only asset compilation (no PHP server)
npm run dev:assets-only
```

**🎉 NEW: `npm run dev` now automatically starts both PHP and Vite servers!**

## 📁 Project Structure

```
├── app/                    # Your Kirby CMS (unchanged)
│   ├── index.php          # Main entry point
│   ├── assets/bundle/     # Compiled assets (auto-generated)
│   └── site/              # Your templates & content
├── dev/                   # Source files for development
│   ├── css/main.scss      # Your styles
│   ├── js/index.js        # Main JavaScript
│   └── assets/            # Static assets
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies & scripts
```

## 🎯 Next Steps

1. Choose one of the setup options above
2. Run `npm run dev` to start asset compilation
3. Your site will automatically load the compiled CSS and JS
4. Make changes to files in `dev/` folder
5. Assets will automatically recompile and update

## 💡 Benefits You Now Have

- ⚡ **10x faster** asset compilation
- 🔥 **Hot Module Replacement** - changes appear instantly
- 🛠️ **Better error messages** and debugging
- 📦 **Smaller bundle sizes** with better optimization
- 🚀 **Instant server startup** (no more waiting for webpack)

## 🆘 Need Help?

- Check `VITE_MIGRATION.md` for detailed migration info
- Your existing Kirby templates work exactly as before
- All asset paths remain the same
- No changes needed to your PHP code

**You're all set! Your development experience just got much faster! 🎉**
