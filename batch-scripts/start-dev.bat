@echo off
echo Starting Studio Isphording Development Environment
echo.

REM Check if PHP is available
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo PHP found! Starting both PHP server and Vite dev server...
    echo.
    echo PHP Server will run on: http://localhost:8000
    echo Vite Dev Server will run on: http://localhost:9000
    echo.
    echo Your site will be available at: http://localhost:8000
    echo Asset compilation happens automatically via Vite
    echo.
    start /B php -S localhost:8000 -t app
    timeout /t 2 /nobreak >nul
    npm run dev
) else (
    echo PHP not found in system PATH.
    echo.
    echo Options:
    echo 1. Install PHP and add to PATH, then run this script again
    echo 2. Install XAMPP/WAMP and copy app/ folder to htdocs
    echo 3. Just run asset compilation with: npm run dev
    echo.
    echo For now, starting Vite dev server for asset compilation...
    echo Vite Dev Server will run on: http://localhost:9000
    echo.
    npm run dev
)
