@echo off
echo ========================================
echo   Alternative PHP Download Script
echo   Studio Isphording Development Setup
echo ========================================
echo.

REM Check if we're running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script needs to run as Administrator to modify PATH.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo This script will try multiple PHP download sources...
echo.

REM Create PHP directory
if not exist "C:\php" mkdir "C:\php"

REM Try downloading from multiple sources
set "DOWNLOAD_SUCCESS=0"

echo Attempting download from windows.php.net...
powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://windows.php.net/downloads/releases/php-8.4.8-Win32-vs17-x64.zip' -OutFile 'C:\php\php.zip' -ErrorAction Stop; Write-Host 'Download successful' } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }"

if exist "C:\php\php.zip" (
    set "DOWNLOAD_SUCCESS=1"
    echo ✅ Download successful from windows.php.net
) else (
    echo ❌ Failed to download from windows.php.net
    echo Trying alternative source...
    
    powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/php/php-src/releases/download/php-8.3.14/php-8.3.14-Win32-vs16-x64.zip' -OutFile 'C:\php\php.zip' -ErrorAction Stop; Write-Host 'Download successful' } catch { Write-Host 'Download failed:' $_.Exception.Message }"
    
    if exist "C:\php\php.zip" (
        set "DOWNLOAD_SUCCESS=1"
        echo ✅ Download successful from GitHub
    )
)

if "%DOWNLOAD_SUCCESS%"=="0" (
    echo ❌ All download attempts failed.
    echo.
    echo Manual installation steps:
    echo 1. Go to https://windows.php.net/downloads/releases/
    echo 2. Download "PHP 8.3 Thread Safe (x64)"
    echo 3. Extract the zip file to C:\php
    echo 4. Run check-php.bat to verify installation
    echo.
    pause
    exit /b 1
)

echo.
echo Extracting PHP...
powershell -Command "try { Expand-Archive -Path 'C:\php\php.zip' -DestinationPath 'C:\php\temp' -Force; Write-Host 'Extraction successful' } catch { Write-Host 'Extraction failed:' $_.Exception.Message; exit 1 }"

REM Check if extraction created a subdirectory
if exist "C:\php\temp\php.exe" (
    echo Moving files from temp directory...
    xcopy "C:\php\temp\*" "C:\php\" /E /Y
    rmdir "C:\php\temp" /S /Q
) else (
    REM Check if there's a subdirectory with PHP files
    for /d %%i in ("C:\php\temp\*") do (
        if exist "%%i\php.exe" (
            echo Moving files from %%i...
            xcopy "%%i\*" "C:\php\" /E /Y
            rmdir "C:\php\temp" /S /Q
            goto :found_php
        )
    )
    
    echo ERROR: Could not find php.exe in extracted files
    echo Please check C:\php\temp directory manually
    pause
    exit /b 1
)

:found_php
REM Clean up zip file
del "C:\php\php.zip"

REM Verify PHP executable exists
if not exist "C:\php\php.exe" (
    echo ERROR: php.exe still not found after extraction!
    echo Please check C:\php directory contents:
    dir "C:\php"
    echo.
    pause
    exit /b 1
)

REM Copy php.ini-development to php.ini
if exist "C:\php\php.ini-development" (
    copy "C:\php\php.ini-development" "C:\php\php.ini" >nul
    echo ✅ Created php.ini from php.ini-development
) else (
    echo ⚠️  Warning: php.ini-development not found, PHP will use default settings
)

echo.
echo ✅ PHP has been successfully installed to C:\php
echo ✅ PHP executable confirmed: C:\php\php.exe

REM Test PHP installation
echo.
echo Testing PHP installation...
"C:\php\php.exe" --version
if %errorlevel% equ 0 (
    echo ✅ PHP is working correctly!
) else (
    echo ❌ PHP test failed
    pause
    exit /b 1
)

echo.
REM Add PHP to PATH
echo Adding PHP to system PATH...
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%B"

REM Check if PHP is already in PATH
echo %CURRENT_PATH% | findstr /i "C:\php" >nul
if %errorlevel% equ 0 (
    echo ✅ PHP is already in PATH.
) else (
    echo Adding C:\php to PATH...
    setx PATH "%CURRENT_PATH%;C:\php" /M
    echo ✅ PHP has been added to system PATH.
)

echo.
echo ========================================
echo   🎉 PHP Installation Complete!
echo ========================================
echo.
echo ✅ PHP 8.3 installed successfully
echo ✅ Location: C:\php\php.exe
echo ✅ Added to system PATH
echo ✅ Configuration file created
echo.
echo NEXT STEPS:
echo 1. RESTART your command prompt or IDE completely
echo 2. Run 'check-php.bat' to verify everything works
echo 3. Start development with 'npm run dev:full'
echo.
echo Your site will be available at: http://localhost:8000
echo.
pause
