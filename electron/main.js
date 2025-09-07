const { app, BrowserWindow, Menu, shell, dialog, clipboard } = require('electron');
const path = require('path');
const PhpServerManager = require('./php-server');
const IpcHandlers = require('./ipc-handlers');
const LicenseManager = require('./license-manager');
const LicenseDialog = require('./license-dialog');

// Keep a global reference of the window object
let mainWindow;
let phpServerManager;
let ipcHandlers;
let licenseManager;
let licenseDialog;
let justActivatedLicense = false;

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
    });
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on window
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, initially load a local splash screen.
        // We will only load the PHP server AFTER license validation succeeds.
        mainWindow.loadFile(path.join(__dirname, 'splash.html'));
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle window controls for Windows/Linux
    if (process.platform !== 'darwin') {
        mainWindow.on('minimize', () => {
            mainWindow.hide();
        });
    }
}

// PHP server functions are now handled by PhpServerManager class

function createMenu() {
    const template = [
        {
            label: 'ConCure',
            submenu: [
                {
                    label: 'About ConCure',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About ConCure',
                            message: 'ConCure Clinic Management System',
                            detail: 'Version 1.0.0\nDeveloped by Connect Pure\n\nA comprehensive clinic management solution for healthcare providers.'
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Preferences',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        // Open preferences in the app
                        mainWindow.webContents.executeJavaScript(`
                            if (window.location.pathname !== '/settings') {
                                window.location.href = '/settings';
                            }
                        `);
                    }
                },
                { type: 'separator' },
                {
                    label: 'License',
                    submenu: [
                        {
                            label: 'Show Information',
                            click: async () => {
                                if (!licenseManager) return;
                                const licenseInfo = licenseManager.getLicenseInfo();
                                if (licenseInfo) {
                                    licenseDialog = new LicenseDialog(mainWindow);
                                    const action = await licenseDialog.showLicenseInfo(licenseInfo);
                                    if (action === 'deactivate') {
                                        const result = await licenseManager.deactivateLicense();
                                        if (result.success) {
                                            dialog.showMessageBox(mainWindow, {
                                                type: 'info',
                                                title: 'License Deactivated',
                                                message: 'Your license has been deactivated. The application will now close.',
                                            });
                                            app.quit();
                                        }
                                    }
                                } else {
                                    dialog.showMessageBox(mainWindow, {
                                        type: 'warning',
                                        title: 'No License',
                                        message: 'No license information found.',
                                    });
                                }
                            }
                        },
                        {
                            label: 'Import License File (.concurelic)',
                            click: async () => {
                                const { dialog: edialog } = require('electron');
                                const result = await edialog.showOpenDialog(mainWindow, {
                                    title: 'Import License File',
                                    filters: [{ name: 'ConCure License', extensions: ['concurelic', 'json'] }],
                                    properties: ['openFile']
                                });
                                if (!result.canceled && result.filePaths[0]) {
                                    const res = await licenseManager.importLicenseFile(result.filePaths[0]);
                                    if (res.success) {
                                        dialog.showMessageBox(mainWindow, { type: 'info', title: 'License Imported', message: 'License imported successfully.' });
                                    } else {
                                        dialog.showErrorBox('Import Failed', res.error || 'Invalid license file');
                                    }
                                }
                            }
                        },
                        {
                            label: 'Copy Machine ID',
                            click: async () => {
                                // Expose the current hardware fingerprint so vendor can bind licenses
                                const info = licenseManager.getLicenseInfo() || {};
                                const id = (licenseManager.hardwareFingerprint) || 'Unavailable';
                                clipboard.writeText(String(id));
                                dialog.showMessageBox(mainWindow, { type: 'info', title: 'Machine ID', message: 'Machine ID copied to clipboard.', detail: String(id) });
                            }
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/concure-clinic#readme');
                    }
                },
                {
                    label: 'Support',
                    click: () => {
                        shell.openExternal('mailto:support@connectpure.com');
                    }
                }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        template[0].submenu.unshift({
            label: 'Services',
            submenu: []
        });
        
        // Window menu
        template[3].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
    try {
        // Initialize license manager first
        licenseManager = new LicenseManager();
        await licenseManager.initialize();

        // Initialize PHP server manager
        phpServerManager = new PhpServerManager();

        // Initialize IPC handlers
        ipcHandlers = new IpcHandlers(phpServerManager);

        // Create window first (loads splash in production)
        createWindow();

        // Create menu
        createMenu();

        // Validate license first. Only then start PHP server and load the app URL.
        const licenseValid = await validateLicenseOnStartup();
        if (!licenseValid) {
            app.quit();
            return;
        }

        // Start PHP server after license is valid
        await phpServerManager.start();

        // Load the PHP server URL
        if (process.env.NODE_ENV !== 'development') {
            const serverStatus = phpServerManager.getStatus();
            mainWindow.loadURL(serverStatus.url);
        }

        // Record application startup
        licenseManager.recordUsage('startup');

    } catch (error) {
        console.error('Failed to start application:', error);
        dialog.showErrorBox('Startup Error',
            'Failed to start ConCure. Please ensure PHP is installed and try again.\n\n' + error.message);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (phpServerManager) {
        phpServerManager.stop();
    }
    if (licenseManager) {
        licenseManager.cleanup();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (phpServerManager) {
        phpServerManager.stop();
    }
    if (licenseManager) {
        licenseManager.cleanup();
    }
});

// Handle .concurelic file opening (macOS) and second-instance (Windows)
app.on('open-file', async (event, filePath) => {
    event.preventDefault();
    try {
        if (!licenseManager) return;
        const res = await licenseManager.importLicenseFile(filePath);
        if (res.success && mainWindow) {
            // Optional: notify user of success
            dialog.showMessageBox(mainWindow, { type: 'info', title: 'License Imported', message: 'License imported successfully.' });
        } else if (mainWindow) {
            dialog.showErrorBox('Import Failed', res.error || 'Invalid license file');
        }
    } catch (e) {
        console.error('Failed to import license from open-file:', e);
    }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', async (event, argv) => {
        // Windows: the license file path will be in argv
        const file = argv.find(a => a.endsWith('.concurelic'));
        if (file) {
            try {
                const res = await licenseManager.importLicenseFile(file);
                if (res.success && mainWindow) {
                    dialog.showMessageBox(mainWindow, { type: 'info', title: 'License Imported', message: 'License imported successfully.' });
                } else if (mainWindow) {
                    dialog.showErrorBox('Import Failed', res.error || 'Invalid license file');
                }
            } catch (e) {
                console.error('Failed to import license from second-instance:', e);
            }
        }
        // Focus main window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

/**
 * Validate license on application startup
 */
async function validateLicenseOnStartup() {
    try {
        console.log('🔍 Starting license validation...');

        // Skip validation if we just activated a license
        if (justActivatedLicense) {
            console.log('✅ Skipping validation - license was just activated');
            justActivatedLicense = false;
            return true;
        }

        // Check if license exists
        const licenseInfo = licenseManager.getLicenseInfo();
        console.log('📄 License info:', licenseInfo ? 'Found' : 'Not found');

        if (!licenseInfo || !licenseInfo.licenseKey) {
            console.log('❌ No license found. Creating silent 30-day trial and proceeding...');
            await licenseManager.createTrialLicense(30);
            // Proceed into the app without showing activation
            return true;
        }

        // Validate existing license
        const validation = await licenseManager.validateLicense('startup');

        if (validation.valid) {
            console.log('License validation successful');

            // Check if trial is expiring soon
            if (licenseInfo.licenseInfo && licenseInfo.licenseInfo.is_trial) {
                const daysRemaining = licenseManager.getTrialDaysRemaining();
                if (daysRemaining <= 7 && daysRemaining > 0) {
                    // Show trial expiring warning (non-blocking)
                    setTimeout(() => showTrialExpiringWarning(daysRemaining), 2000);
                }
            }

            return true;
        } else {
            // License validation failed
            console.error('License validation failed:', validation.error);

            if (validation.error && validation.error.includes('expired')) {
                return await showTrialExpiredFlow();
            } else {
                return await showLicenseActivationFlow(validation.error);
            }
        }
    } catch (error) {
        console.error('License validation error:', error);
        return await showLicenseActivationFlow('License validation failed');
    }
}

/**
 * Show license activation flow
 */
async function showLicenseActivationFlow(errorMessage = null) {
    // SIMPLE MODE: If user cancels or activation fails, offer to start a 30‑day offline trial
    const SIMPLE_MODE_TRIAL_FALLBACK = true;
    console.log('🔑 Showing license activation flow...');

    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            console.error('❌ Main window is not available for license dialog');
            return false;
        }

        licenseDialog = new LicenseDialog(mainWindow);
        console.log('✅ License dialog created');

        if (errorMessage) {
            console.log('⚠️ Showing error message:', errorMessage);
            await licenseDialog.showErrorDialog('License Error', errorMessage);
        }

        console.log('📋 Showing activation dialog...');
        const activationResult = await licenseDialog.showActivationDialog();
        console.log('🔑 Activation result:', activationResult ? 'Received' : 'None');

        // If user chose to import a license file
        if (activationResult && activationResult.importFile) {
            const importRes = await licenseManager.importLicenseFile(activationResult.importFile);
            if (importRes.success) {
                justActivatedLicense = true;
                return true;
            } else {
                await licenseDialog.showErrorDialog('Import Failed', importRes.error || 'Invalid license file');
                return await showLicenseActivationFlow();
            }
        }

        // Otherwise, treat result as a typed key
        const licenseKey = activationResult;
        console.log('🔑 License key received:', licenseKey ? 'Yes' : 'No');

        if (!licenseKey) {
            console.log('❌ User cancelled activation');
            if (SIMPLE_MODE_TRIAL_FALLBACK) {
                // Create a simple offline trial and proceed
                await licenseManager.createTrialLicense(30);
                justActivatedLicense = true;
                return true;
            }
            return false;
        }
    } catch (error) {
        console.error('❌ Error in license activation flow:', error);
        return false;
    }

    // Attempt to activate the license
    console.log('🔄 Attempting to activate license...');
    const result = await licenseManager.activateLicense(licenseKey);

    if (result.success) {
        console.log('✅ License activated successfully');

        // Add a small delay to ensure license file is written
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify the license was saved correctly
        const savedLicense = licenseManager.getLicenseInfo();
        if (savedLicense && savedLicense.licenseKey) {
            console.log('✅ License verification successful');
            justActivatedLicense = true;
            return true;
        } else {
            console.log('❌ License was not saved properly');
            await licenseDialog.showErrorDialog('Activation Failed', 'License was not saved properly');
            return await showLicenseActivationFlow();
        }
    } else {
        // Activation failed
        console.log('❌ License activation failed:', result.error);
        if (SIMPLE_MODE_TRIAL_FALLBACK) {
            await licenseDialog.showErrorDialog('Activation Failed', result.error || 'Invalid key');
            // Start trial automatically to reduce friction
            await licenseManager.createTrialLicense(30);
            justActivatedLicense = true;
            return true;
        }
        await licenseDialog.showErrorDialog('Activation Failed', result.error);
        return await showLicenseActivationFlow();
    }
}

/**
 * Show trial expired flow
 */
async function showTrialExpiredFlow() {
    licenseDialog = new LicenseDialog(mainWindow);

    const daysRemaining = licenseManager.getTrialDaysRemaining();
    const action = await licenseDialog.showTrialExpiredDialog(daysRemaining);

    switch (action) {
        case 'enter-key':
            return await showLicenseActivationFlow();
        case 'purchase':
            shell.openExternal('https://your-website.com/purchase'); // Configure this URL
            return false;
        case 'continue':
            if (daysRemaining > 0) {
                return true;
            }
            return false;
        default:
            return false;
    }
}

/**
 * Show trial expiring warning (non-blocking)
 */
async function showTrialExpiringWarning(daysRemaining) {
    if (licenseDialog && licenseDialog.isOpen()) {
        return; // Don't show if another dialog is open
    }

    licenseDialog = new LicenseDialog(mainWindow);
    await licenseDialog.showTrialExpiredDialog(daysRemaining);
}
