# 🚀 Automated Setup Scripts

These scripts will help you get PHP installed and your development environment running quickly.

## 📋 Available Scripts

### 1. `download-php.bat` - Automatic PHP Installation
**What it does:**
- Downloads PHP 8.3 for Windows automatically
- Extracts it to `C:\php`
- Adds PHP to your system PATH
- Sets up basic configuration
- Verifies installation success

**How to use:**
1. **Right-click** the file
2. Select **"Run as administrator"** (required for PATH modification)
3. Wait for download and installation
4. **Restart your command prompt/IDE** after completion

### 1b. `download-php-alternative.bat` - Enhanced PHP Installation
**What it does:**
- Tries multiple download sources for better reliability
- Better error handling and extraction logic
- Tests PHP installation before completing
- More detailed progress feedback

**How to use:**
1. **Right-click** the file
2. Select **"Run as administrator"**
3. Follow the detailed progress messages
4. **Restart your command prompt/IDE** after completion

**Use this if the regular download-php.bat fails**

### 2. `check-php.bat` - Verify PHP Installation
**What it does:**
- Checks if PHP is properly installed and accessible
- Shows PHP version if working
- Offers to start development servers immediately
- Provides troubleshooting steps if PHP isn't found

**How to use:**
- Double-click to run (no admin rights needed)
- Follow the prompts

### 3. `start-dev.bat` - Smart Development Starter
**What it does:**
- Automatically detects if PHP is available
- Starts appropriate development servers
- Provides helpful instructions

**How to use:**
- Double-click to run
- It will guide you through the process

## 🎯 Recommended Workflow

### First Time Setup:
1. **Run `download-php.bat`** as administrator
2. **Restart your command prompt/IDE**
3. **Run `check-php.bat`** to verify and start development

### Daily Development:
- Just run `start-dev.bat` or `check-php.bat`
- Or use npm commands: `npm run dev:full`

## 🔧 What Gets Installed

- **PHP 8.3** (Thread Safe, Windows x64)
- **Location**: `C:\php`
- **Configuration**: Basic php.ini setup
- **PATH**: Automatically added to system PATH

## 🆘 Troubleshooting

### If PHP installation fails:
1. Check your internet connection
2. Try running as administrator again
3. Manually download from: https://windows.php.net/downloads/

### If PHP isn't found after installation:
1. **Restart your command prompt completely**
2. **Restart your IDE/editor**
3. Run `check-php.bat` to verify
4. Check if `C:\php\php.exe` exists

### Alternative: Use XAMPP
If automated installation doesn't work:
1. Download XAMPP: https://www.apachefriends.org/
2. Install and start Apache
3. Copy your `app/` folder to `C:\xampp\htdocs\`
4. Run `npm run dev` for asset compilation
5. Access site at `http://localhost/app/`

## 🎉 After Setup

Once PHP is working, you can:
- Run `npm run dev:full` - Start both PHP and Vite servers
- Run `npm run php` - Start only PHP server
- Run `npm run dev` - Start only Vite for asset compilation

Your site will be available at: **http://localhost:8000**
