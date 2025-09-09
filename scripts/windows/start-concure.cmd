@echo off
setlocal ENABLEDELAYEDEXPANSION

rem ==============================================
rem  Concure per-user launcher (no admin required)
rem  - Starts Laravel PHP server if not running
rem  - Opens default browser to http://127.0.0.1:8003
rem  Paths are per-user: %APPDATA%, %LOCALAPPDATA%
rem ==============================================

set "APP_DIR=%APPDATA%\concure-clinic-management\runtime"
rem Try common install locations for the bundled PHP
set "PHP_DIR1=%LOCALAPPDATA%\Programs\ConCure Clinic Management\resources\php\win"
set "PHP_DIR2=%LOCALAPPDATA%\Programs\concure-clinic-management\resources\php\win"
set "PHP_DIR3=%~dp0..\..\resources\php\win"

if exist "%PHP_DIR1%\php.exe" set "PHP_DIR=%PHP_DIR1%"
if not defined PHP_DIR if exist "%PHP_DIR2%\php.exe" set "PHP_DIR=%PHP_DIR2%"
if not defined PHP_DIR if exist "%PHP_DIR3%\php.exe" set "PHP_DIR=%PHP_DIR3%"

set "PHP_EXE=%PHP_DIR%\php.exe"
set "PHP_INI=%PHP_DIR%\php.ini"
set "PORT=8003"

if not exist "%APP_DIR%\artisan" (
  echo [Error] Could not find "artisan" in "%APP_DIR%".
  echo Please ensure Concure is installed for this user.
  pause
  exit /b 1
)
if not exist "%PHP_EXE%" (
  echo [Error] Could not find PHP at "%PHP_EXE%".
  echo Please ensure Concure's bundled PHP exists for this user.
  pause
  exit /b 1
)

rem If the port is already listening, just open browser
set "PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do set "PID=%%P"
if defined PID goto open

rem Start Laravel server minimized in the background
pushd "%APP_DIR%"
start "Concure PHP Server" /min cmd /c ""%PHP_EXE%" -c "%PHP_INI%" artisan serve --host=127.0.0.1 --port=%PORT% --no-reload"
popd

rem Wait up to ~10s for the server to start, then open browser
for /l %%i in (1,1,10) do (
  >nul 2>&1 (netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING") && goto open
  timeout /t 1 >nul
)

:open
start "" http://127.0.0.1:%PORT%
endlocal

