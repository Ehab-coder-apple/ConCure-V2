# 🔑 ConCure Desktop Licensing System - Setup Guide

## 🚀 Quick Installation

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **PHP** (v8.1 or higher) - [Download here](https://www.php.net/downloads)
- **Composer** - [Download here](https://getcomposer.org/download/)

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies (including licensing modules)
npm install

# Install PHP dependencies (if not already done)
composer install
```

### Step 2: Set Up Licensing Database

```bash
# Run database migrations to create licensing tables
php artisan migrate
```

### Step 3: Generate Test Licenses

```bash
# Create sample licenses for testing
php create_test_license.php
```

**Generated Test License Keys:**
- **Trial License** (30 days): `TR-EC1D-98CB-B84F-E2C3-CC`
- **Standard License**: `ST-EC1D-426A-3F14-4A2C-0F`
- **Premium License**: `PR-EC1D-970B-B61F-3CC9-7C`

### Step 4: Build Frontend Assets

```bash
# Build the frontend assets
npm run build
```

### Step 5: Start the Desktop Application

```bash
# Launch the desktop application with licensing
npm run electron
```

## 🔑 License Activation Process

When you first run the application, you'll see a license activation dialog:

1. **Enter License Key**: Use one of the generated test keys above
2. **Click Activate**: The application will validate the license with the server
3. **Success**: The application will start normally with features enabled based on license type

### Test License Features

| License Type | Key | Duration | Users | Patients | Features |
|-------------|-----|----------|-------|----------|----------|
| **Trial** | `TR-EC1D-98CB-B84F-E2C3-CC` | 30 days | 2 | 50 | Basic features only |
| **Standard** | `ST-EC1D-426A-3F14-4A2C-0F` | Lifetime | 10 | 1000 | Core clinic features |
| **Premium** | `PR-EC1D-970B-B61F-3CC9-7C` | Lifetime | 25 | 5000 | All features + integrations |

## 🛠️ Development & Testing

### Running in Development Mode

```bash
# Start Laravel development server (for license API)
php artisan serve

# In another terminal, start Electron in development mode
npm run electron-dev
```

### Testing License API

Test the license validation API directly:

```bash
curl -X POST http://127.0.0.1:8000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "TR-EC1D-98CB-B84F-E2C3-CC",
    "hardware_fingerprint": "TEST-HARDWARE-FINGERPRINT",
    "system_info": {
      "machine_name": "Test-Machine",
      "os_type": "darwin",
      "os_version": "14.0",
      "app_version": "1.0.0"
    }
  }'
```

## 🔧 Configuration

### License Server Configuration

Edit `electron/license-config.json`:

```json
{
  "licenseServerUrl": "http://127.0.0.1:8000/api/license",
  "purchaseUrl": "https://your-website.com/purchase",
  "supportEmail": "support@your-company.com",
  "offlineGracePeriodHours": 24,
  "validationIntervalHours": 4
}
```

## 🧪 Testing Scenarios

### 1. License Activation
- ✅ Valid license key activation
- ❌ Invalid license key rejection
- ⚠️ Trial license expiration warnings

### 2. Offline Operation
- Disconnect internet after activation
- Application should work for 24 hours offline
- Reconnect to validate license again

### 3. Hardware Binding
- License is bound to specific hardware
- Moving to different machine requires reactivation
- Limited hardware changes allowed (3 by default)

### 4. Feature Control
- Trial: Limited features only
- Standard: Core clinic features
- Premium: All features including integrations

## 📁 Key Files Created

```
ConCure OffLine/
├── electron/
│   ├── license-manager.js           # Core licensing logic
│   ├── license-dialog.js            # License UI dialogs
│   ├── license-preload.js           # Dialog preload script
│   ├── license-config.json          # License configuration
│   ├── license-activation.html      # Activation dialog
│   ├── license-info.html            # License info dialog
│   ├── trial-expired.html           # Trial expiration dialog
│   └── license-error.html           # Error dialog
├── app/
│   ├── Models/                      # License database models
│   │   ├── LicenseCustomer.php
│   │   ├── LicenseKey.php
│   │   ├── LicenseInstallation.php
│   │   └── LicenseValidationLog.php
│   ├── Services/                    # License services
│   │   ├── LicenseValidationService.php
│   │   └── LicenseKeyGeneratorService.php
│   └── Http/Controllers/Api/
│       └── LicenseController.php    # License API endpoints
├── database/migrations/             # License database schema
│   ├── 2025_09_04_000001_create_license_customers_table.php
│   ├── 2025_09_04_000002_create_license_keys_table.php
│   ├── 2025_09_04_000003_create_license_installations_table.php
│   └── 2025_09_04_000004_create_license_validation_logs_table.php
└── create_test_license.php          # Test license generator
```

## 🔒 Security Features

### Hardware Binding
- Each license bound to specific hardware characteristics
- Prevents license sharing across multiple machines
- Allows limited hardware changes (configurable)

### Offline Operation
- 24-hour grace period for network issues
- Local license caching for performance
- Periodic validation every 4 hours when online

### License Validation
- Secure API communication
- Hardware fingerprinting
- Comprehensive audit logging
- Anti-tampering measures

## 🚨 Troubleshooting

### License Activation Issues
1. **"License key not found"**
   - Verify license key format (XX-XXXX-XXXX-XXXX-XXXX-XX)
   - Check if license server is running
   - Ensure database migrations are complete

2. **"Network error during activation"**
   - Check internet connection
   - Verify license server URL in config
   - Check firewall settings

3. **"Hardware fingerprint mismatch"**
   - License may be activated on different machine
   - Contact support to reset hardware binding
   - Check hardware changes allowance

### Application Issues
1. **Application won't start**
   - Check license file: `~/Library/Application Support/ConCure/license.json`
   - Verify PHP and Node.js installations
   - Check application logs

2. **Features not working**
   - Verify license type and features
   - Check license expiration
   - Validate license through menu

## 📞 Support & Next Steps

### Getting Help
- **Email**: support@your-company.com
- **Logs**: Check `~/Library/Application Support/ConCure/`
- **Debug**: Set `DEBUG=license:*` environment variable

### Production Deployment
1. Set up production license server with SSL
2. Configure proper domain and certificates
3. Set up customer management dashboard
4. Implement payment processing
5. Create installer packages with code signing

### Building Installers
```bash
# Build distributable packages
npm run dist-mac    # macOS DMG
npm run dist-win    # Windows NSIS installer
npm run dist-linux  # Linux AppImage
```

---

**🎉 Success!** You now have a fully functional desktop application with comprehensive licensing system including trial management, feature control, offline operation, and robust security measures.

The licensing system provides:
- ✅ Secure license validation
- ✅ Hardware binding and anti-piracy
- ✅ Trial period management
- ✅ Feature-based access control
- ✅ Offline operation with grace periods
- ✅ Comprehensive audit logging
- ✅ Professional user interface
