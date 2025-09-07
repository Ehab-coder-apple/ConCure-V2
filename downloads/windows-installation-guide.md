# ConCure for Windows - Installation Guide

## 🪟 **System Requirements**
- **Windows 10** or Windows 11 (64-bit)
- **4 GB RAM** minimum, 8 GB recommended
- **500 MB** free disk space
- **Internet connection** for license activation

## 📦 **Installation Methods**

### **Method 1: Direct Installation (Recommended)**

1. **Download Node.js**: Visit [nodejs.org](https://nodejs.org) and download the Windows installer
2. **Download ConCure Source**: Get the ConCure application files
3. **Install Dependencies**: Open Command Prompt as Administrator and run:
   ```cmd
   cd path\to\concure-folder
   npm install
   composer install
   ```
4. **Build Application**:
   ```cmd
   npm run build
   npm run electron
   ```

### **Method 2: Portable Version**

1. **Download Portable Package**: Get the pre-built Windows folder
2. **Extract Files**: Unzip to desired location (e.g., `C:\ConCure\`)
3. **Run Application**: Double-click `ConCure Clinic Management.exe`
4. **Create Shortcut**: Right-click exe → Send to → Desktop

### **Method 3: Developer Setup**

For developers or advanced users:

```cmd
# Clone or download the project
git clone [repository-url]
cd ConCure-OffLine

# Install dependencies
npm install
composer install

# Set up database
php artisan migrate
php create_test_license.php

# Run in development mode
npm run electron-dev

# Or build for production
npm run build
npm run electron
```

## 🔑 **License Activation**

After installation:

1. **Launch ConCure** - License dialog will appear
2. **Enter License Key** - Use one of these test keys:
   - **Trial**: `TR-EC1D-98CB-B84F-E2C3-CC` (30 days)
   - **Standard**: `ST-EC1D-426A-3F14-4A2C-0F` (Full version)
   - **Premium**: `PR-EC1D-970B-B61F-3CC9-7C` (All features)
3. **Click Activate** - Application will validate and start

## 🛠️ **Troubleshooting**

### **Common Issues:**

**"Windows protected your PC" warning:**
- Click "More info" → "Run anyway"
- This is normal for unsigned applications

**License activation fails:**
- Check internet connection
- Verify license key format
- Contact support if issues persist

**Application won't start:**
- Install Visual C++ Redistributable
- Update Windows to latest version
- Run as Administrator

**PHP errors:**
- Ensure PHP is installed and in PATH
- Check that all Composer dependencies are installed

### **Performance Tips:**

- **Close unnecessary programs** for better performance
- **Add ConCure to antivirus exceptions** to prevent scanning delays
- **Use SSD storage** for faster database operations

## 📞 **Support**

For installation help:
- **Email**: support@concure.com
- **Documentation**: Available in application Help menu
- **System Requirements**: Check compatibility before installation

## 🔄 **Updates**

To update ConCure:
1. Download latest version
2. Close current ConCure application
3. Replace files with new version
4. Restart application (license remains active)

---

**© 2024 ConCure - Professional Clinic Management System**
