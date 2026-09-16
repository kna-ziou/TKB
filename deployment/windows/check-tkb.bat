@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: TKB Online Designer - Windows Server Health Check Script
:: Purpose: Check whether the production server is actively running
:: ============================================================================

title TKB Online Designer - Health Check

if "%PORT%"=="" (
    set "PORT=3000"
)

echo Dang kiem tra may chu TKB Online Designer tai cong %PORT%...
echo.

:: Query /api/health endpoint using PowerShell
set "HEALTH_URL=http://127.0.0.1:%PORT%/api/health"
set "PS_CMD=try { $res = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 3 -ErrorAction Stop; if ($res.ok -eq $true) { exit 0 } else { exit 2 } } catch { exit 1 }"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "%PS_CMD%" >nul 2>&1
set "PS_EXIT=%ERRORLEVEL%"

if %PS_EXIT% equ 0 (
    echo ===================================================
    echo  TKB SERVER: ONLINE
    echo ===================================================
    echo May chu dang hoat dong binh thuong tai:
    echo    http://localhost:%PORT%
    echo Endpoint /api/health phan hoi HTTP 200 {"ok":true}
    echo ===================================================
    exit /b 0
) else (
    echo ===================================================
    echo  TKB SERVER: OFFLINE
    echo ===================================================
    echo Khong the ket noi toi may chu tai cong %PORT%.
    echo.
    echo Cac nguyen nhan pho bien:
    echo  1. Cua so start-tkb.bat chua duoc chay hoac da bi tat.
    echo  2. May chu dang chay o mot cong khac voi PORT=%PORT%.
    echo  3. Ban build dist/server.cjs chua duoc tao (chay setup-tkb.bat).
    echo.
    echo De khoi dong may chu, vui long chay:
    echo    deployment\windows\start-tkb.bat
    echo ===================================================
    exit /b 1
)

endlocal
