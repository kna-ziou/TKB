@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: TKB Online Designer - Windows Safe Update Script
:: Purpose: Safely update local Git deployment from GitHub repository
:: ============================================================================

title TKB Online Designer - Safe Update

:: Resolve repository root relative to this script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%..\.."
set "REPO_ROOT=%CD%"

echo ===================================================
echo  TKB Online Designer - Safe Update from GitHub
echo ===================================================
echo Thu muc ung dung: "%REPO_ROOT%"
echo.

:: 1. Verify Git exists
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Git trong he thong!
    echo Vui long cai dat Git for Windows tu: https://git-scm.com/
    echo.
    pause
    exit /b 1
)

:: 2. Verify current folder is a Git repository
call git rev-parse --is-inside-work-tree >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Thu muc hien tai khong phai la mot Git repository hop le!
    echo Script nay chi hoat dong khi ung dung duoc clone qua Git.
    echo.
    pause
    exit /b 1
)

:: 3. Check for uncommitted local changes (Safety Guard)
set "HAS_LOCAL_CHANGES="
for /f "tokens=*" %%c in ('git status --porcelain 2^>nul') do (
    set "HAS_LOCAL_CHANGES=1"
)

if defined HAS_LOCAL_CHANGES (
    echo ===================================================
    echo [CANH BAO AN TOAN DU LIEU CODE]
    echo Phat hien thay doi cuc bo. Khong the cap nhat tu dong.
    echo ===================================================
    echo Ban co nhung tap tin da sua doi hoac chua commit cuc bo:
    echo.
    git status -s
    echo.
    echo Script update an toan KHONG tu dong xoa hoac ghi de code cua ban.
    echo Vui long commit, stash hoac giai quyet cac thay doi cuc bo truoc khi cap nhat.
    echo.
    pause
    exit /b 1
)

:: 4. Prompt operator to verify server status
echo Luu y: Neu may chu TKB dang chay trong cua so khac,
echo ban nen tat may chu [Ctrl+C] truoc khi tiep tuc cap nhat.
echo.

:: 5. Pull updates safely via fast-forward only
echo [1/3] Dang keo ma nguon moi nhat tu GitHub [git pull --ff-only]...
call git pull --ff-only
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Khong the pull code tu GitHub!
    echo Co the do conflict, thay doi nhanh hoac mat ket noi Internet.
    echo Git pull --ff-only bi huy de bao ve an toan repository.
    echo.
    pause
    exit /b 1
)
echo [OK] Da keo ma nguon moi nhat.
echo.

:: 6. Update dependencies
echo [2/3] Dang cap nhat thu vien phu thuoc [npm install]...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Cap nhat thu vien [npm install] that bai!
    echo.
    pause
    exit /b 1
)
echo [OK] Thu vien da duoc cap nhat.
echo.

:: 7. Rebuild production bundle
echo [3/3] Dang bien dich lai ban production [npm run build]...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Bien dich lai ban production [npm run build] that bai!
    echo.
    pause
    exit /b 1
)
echo [OK] Bien dich production thanh cong.
echo.

:: 8. Verify production artifacts
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
echo  UPDATE SUCCESS - CAP NHAT THANH CONG!
echo ===================================================
echo Ban build moi nhat da san sang trong dist/.
echo.
echo Neu may chu cu dang chay, hay dung [Ctrl+C] va khoi dong lai bang:
echo    deployment\windows\start-tkb.bat
echo.
echo [Thong bao: May chu khong tu dong khoi dong de ban chu dong kiem soat]
echo ===================================================
echo.
pause
endlocal
