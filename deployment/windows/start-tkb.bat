@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: TKB Online Designer - Windows Production Start Script
:: Mode: Interactive Standalone Production Server
:: ============================================================================

title TKB Online Designer - Production Server

:: Resolve repository root relative to this script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%..\.."
set "REPO_ROOT=%CD%"

echo ===================================================
echo  TKB Online Designer - Standalone Production Server
echo ===================================================
echo Thu muc ung dung: "%REPO_ROOT%"
echo.

:: 1. Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js LTS [>=20] tu: https://nodejs.org/
    echo Sau khi cai dat, vui long mo lai terminal hoac chay lai file nay.
    echo.
    pause
    exit /b 1
)

:: 2. Verify npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay npm trong he thong!
    echo Vui long kiem tra lai bien moi truong PATH cho Node.js / npm.
    echo.
    pause
    exit /b 1
)

:: 3. Verify package.json
if not exist "%REPO_ROOT%\package.json" (
    echo [LOI] Khong tim thay file package.json tai:
    echo "%REPO_ROOT%\package.json"
    echo Vui long kiem tra lai thu muc cai dat ung dung.
    echo.
    pause
    exit /b 1
)

:: 4. Verify production build artifact (dist\server.cjs)
if not exist "%REPO_ROOT%\dist\server.cjs" (
    echo [LOI] Chua co ban build production - thieu file dist\server.cjs!
    echo.
    echo Vui long chay script cai dat / build truoc khi khoi dong:
    echo    deployment\windows\setup-tkb.bat
    echo hoac chay:
    echo    deployment\windows\update-tkb.bat
    echo.
    pause
    exit /b 1
)

:: 5. Set environment and resolve PORT
set "NODE_ENV=production"

if "%PORT%"=="" (
    set "PORT=3000"
)

echo Dang khoi dong may chu production...
echo Cong hoat dong: %PORT%
echo.
echo ===================================================
echo  MAY CHU DANG CHAY - Nhan Ctrl+C de dung may chu
echo ===================================================
echo.
echo Truy cap ung dung tai trinh duyet:
echo    http://localhost:%PORT%
echo.
echo Kiem tra trang thai may chu bang cach chay:
echo    deployment\windows\check-tkb.bat
echo.
echo ---------------------------------------------------

:: Start production server via npm start (runs node dist/server.cjs)
call npm start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [THONG BAO] May chu da dung voi ma loi: %ERRORLEVEL%
    pause
)

endlocal
