#!/usr/bin/env python3
"""
Create a Windows installation package for ConCure
This creates a ZIP file with all necessary files and installation scripts
"""

import zipfile
import os
import shutil
from pathlib import Path
import json

def create_windows_package():
    """Create a Windows installation package"""
    
    print("📦 Creating Windows Installation Package...")
    
    # Create temporary directory for Windows package
    windows_dir = Path("windows-package")
    if windows_dir.exists():
        shutil.rmtree(windows_dir)
    windows_dir.mkdir()
    
    # Copy essential files
    files_to_copy = [
        "package.json",
        "electron/",
        "public/",
        "resources/",
        "app/",
        "bootstrap/",
        "config/",
        "database/",
        "routes/",
        "storage/",
        "vendor/",
        "artisan",
        "composer.json",
        "composer.lock",
        ".env.example",
        "vite.config.js",
        "create_test_license.php",
        "windows-installation-guide.md"
    ]
    
    print("📁 Copying application files...")
    for file_path in files_to_copy:
        src = Path(file_path)
        if src.exists():
            if src.is_file():
                dest = windows_dir / src.name
                shutil.copy2(src, dest)
                print(f"  ✓ {src.name}")
            else:
                dest = windows_dir / src.name
                shutil.copytree(src, dest, ignore=shutil.ignore_patterns('node_modules', '.git', 'dist-electron'))
                print(f"  ✓ {src.name}/")
    
    # Create Windows-specific installation scripts
    create_install_script(windows_dir)
    create_run_script(windows_dir)
    create_readme(windows_dir)
    
    # Create ZIP package
    zip_path = Path("downloads/ConCure-Windows-Setup.zip")
    zip_path.parent.mkdir(exist_ok=True)
    
    print("🗜️ Creating ZIP package...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(windows_dir):
            for file in files:
                file_path = Path(root) / file
                arc_path = file_path.relative_to(windows_dir)
                zipf.write(file_path, arc_path)
                
    # Clean up temporary directory
    shutil.rmtree(windows_dir)
    
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"✅ Windows package created: {zip_path} ({size_mb:.1f} MB)")
    
    return zip_path

def create_install_script(windows_dir):
    """Create Windows installation batch script"""
    
    install_script = """@echo off
echo ========================================
echo ConCure Clinic Management System
echo Windows Installation Script
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found!
    echo Please install Node.js from https://nodejs.org
    echo Then run this script again.
    pause
    exit /b 1
)

echo Checking PHP installation...
php --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PHP not found!
    echo Please install PHP from https://windows.php.net
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Prerequisites found!
echo.

echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo Installing PHP dependencies...
call composer install --no-dev --optimize-autoloader
if errorlevel 1 (
    echo ❌ Failed to install PHP dependencies
    pause
    exit /b 1
)

echo Setting up environment...
if not exist .env (
    copy .env.example .env
)

echo Setting up database...
call php artisan migrate --force
call php create_test_license.php

echo Building application...
call npm run build
if errorlevel 1 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)

echo.
echo ✅ Installation completed successfully!
echo.
echo To run ConCure:
echo   1. Double-click "Run-ConCure.bat"
echo   2. Or run: npm run electron
echo.
echo License keys for testing:
echo   Trial: TR-EC1D-98CB-B84F-E2C3-CC
echo   Standard: ST-EC1D-426A-3F14-4A2C-0F
echo   Premium: PR-EC1D-970B-B61F-3CC9-7C
echo.
pause
"""
    
    with open(windows_dir / "Install-ConCure.bat", "w") as f:
        f.write(install_script)
    
    print("  ✓ Install-ConCure.bat")

def create_run_script(windows_dir):
    """Create Windows run batch script"""
    
    run_script = """@echo off
echo Starting ConCure Clinic Management System...
echo.

REM Start PHP server in background
echo Starting PHP server...
start /B php artisan serve --host=127.0.0.1 --port=8003

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start Electron application
echo Starting ConCure application...
call npm run electron

echo.
echo ConCure has been closed.
echo.

REM Kill PHP server
taskkill /F /IM php.exe >nul 2>&1

pause
"""
    
    with open(windows_dir / "Run-ConCure.bat", "w") as f:
        f.write(run_script)
    
    print("  ✓ Run-ConCure.bat")

def create_readme(windows_dir):
    """Create Windows README file"""
    
    readme = """# ConCure for Windows

## Quick Start

1. **Install Prerequisites**:
   - Node.js: https://nodejs.org (Download LTS version)
   - PHP: https://windows.php.net (Download latest version)
   - Composer: https://getcomposer.org (PHP package manager)

2. **Install ConCure**:
   - Double-click "Install-ConCure.bat"
   - Wait for installation to complete

3. **Run ConCure**:
   - Double-click "Run-ConCure.bat"
   - Enter license key when prompted

## Test License Keys

- **Trial**: TR-EC1D-98CB-B84F-E2C3-CC (30 days)
- **Standard**: ST-EC1D-426A-3F14-4A2C-0F (Full version)
- **Premium**: PR-EC1D-970B-B61F-3CC9-7C (All features)

## Troubleshooting

- **"Node.js not found"**: Install Node.js from nodejs.org
- **"PHP not found"**: Install PHP and add to Windows PATH
- **Permission errors**: Run as Administrator
- **Port conflicts**: Close other applications using port 8003

## Manual Installation

If batch scripts don't work:

```cmd
npm install
composer install
php artisan migrate
php create_test_license.php
npm run build
npm run electron
```

## Support

For help: Read "windows-installation-guide.md"
"""
    
    with open(windows_dir / "README-Windows.txt", "w") as f:
        f.write(readme)
    
    print("  ✓ README-Windows.txt")

if __name__ == "__main__":
    try:
        package_path = create_windows_package()
        print(f"\n🎉 Windows package ready for distribution!")
        print(f"📦 File: {package_path}")
        print(f"🔗 Add this to your download server")
        
    except Exception as e:
        print(f"❌ Error creating Windows package: {e}")
