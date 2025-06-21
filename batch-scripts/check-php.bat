@echo off
echo ========================================
echo   PHP Installation Checker
echo   Studio Isphording Development Setup
echo ========================================
echo.

echo Checking if PHP is installed and accessible...
echo.

REM Check if PHP is in PATH
php --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ SUCCESS: PHP is installed and working!
    echo.
    php --version
    echo.
    echo ========================================
    echo   Ready to Start Development!
    echo ========================================
    echo.
    echo You can now run:
    echo   npm run dev:full    - Start both PHP server and Vite
    echo   npm run php         - Start only PHP server
    echo   npm run dev         - Start only Vite dev server
    echo.
    echo Your site will be available at: http://localhost:8000
    echo Asset compilation at: http://localhost:9000
    echo.
    
    REM Ask if user wants to start development now
    set /p choice="Start development now? (y/n): "
    if /i "%choice%"=="y" (
        echo.
        echo Starting development servers...
        npm run dev:full
    ) else (
        echo.
        echo You can start development anytime with: npm run dev:full
    )
    
) else (
    echo ❌ PHP is not found in PATH or not installed.
    echo.
    echo Troubleshooting steps:
    echo.
    echo 1. If you haven't installed PHP yet:
    echo    - Right-click 'download-php.bat' and select 'Run as administrator'
    echo.
    echo 2. If you just installed PHP:
    echo    - Close this command prompt completely
    echo    - Open a new command prompt
    echo    - Run this script again
    echo.
    echo 3. Manual check:
    echo    - Check if C:\php\php.exe exists
    echo    - Check Windows Environment Variables (PATH)
    echo.
    echo 4. Alternative: Use XAMPP instead
    echo    - Download from: https://www.apachefriends.org/
    echo    - Copy your 'app' folder to htdocs
    echo    - Run: npm run dev
    echo.
)

echo.
pause
