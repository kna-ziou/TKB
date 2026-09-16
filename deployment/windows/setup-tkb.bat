@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: TKB Online Designer - Windows Setup Script
:: Purpose: First-time installation and production build after cloning
:: ============================================================================

title TKB Online Designer - Setup & Build

:: Resolve repository root relative to this script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%..\.."
set "REPO_ROOT=%CD%"

echo ===================================================
echo  TKB Online Designer - Setup & Production Build
echo ===================================================
echo Thu muc ung dung: "%REPO_ROOT%"
echo.

:: 1. Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Node.js trong he thong!
    echo Vui long cai dat Node.js LTS (>=20) tu: https://nodejs.org/
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

:: Print detected versions
for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VERSION=%%v"
echo Phat hien Node.js: %NODE_VERSION%
echo Phat hien npm:     %NPM_VERSION%
echo.

:: 3. Verify package.json
if not exist "%REPO_ROOT%\package.json" (
    echo [LOI] Khong tim thay file package.json tai:
    echo "%REPO_ROOT%\package.json"
    echo Vui long dam bao ban dang o dung thu muc source ung dung.
    echo.
    pause
    exit /b 1
)

:: 4. Run npm install
echo [1/2] Dang cai dat cac thu vien phu thuoc (npm install)...
echo Tien trinh co the mat 1-3 phut tuy thuoc vao toc do mang...
echo.
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Qua trinh cai dat thu vien (npm install) that bai!
    echo Vui long kiem tra lai ket noi Internet hoac log loi o tren.
    echo.
    pause
    exit /b 1
)
echo [OK] Cai dat thu vien thanh cong.
echo.

:: 5. Run npm run build
echo [2/2] Dang bien dich ban production (npm run build)...
echo.
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Qua trinh bien dich production (npm run build) that bai!
    echo Vui long kiem tra log loi o tren.
    echo.
    pause
    exit /b 1
)
echo [OK] Bien dich production thanh cong.
echo.

:: 6. Verify production artifacts
if not exist "%REPO_ROOT%\dist\index.html" (
    echo [LOI] Khong tim thay artifact dist\index.html sau khi build!
    pause
    exit /b 1
)
if not exist "%REPO_ROOT%\dist\server.cjs" (
    echo [LOI] Khong tim thay artifact dist\server.cjs sau khi build!
    pause
    exit /b 1
)

echo ===================================================
echo  CAI DAT VA BIEN DICH THANH CONG!
echo ===================================================
echo Cac file production da san sang tai thu muc dist/:
echo   - dist\index.html
echo   - dist\server.cjs
echo   - dist\assets\
echo.
echo De khoi dong may chu production, vui long chay:
echo    deployment\windows\start-tkb.bat
echo.
echo (Ung dung khong tu dong khoi dong de ban chu dong kiem soat)
echo ===================================================
echo.
pause
endlocal
