const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class LicenseDialog {
    constructor(parentWindow) {
        this.parentWindow = parentWindow;
        this.window = null;
    }

    /**
     * Show license activation dialog
     */
    async showActivationDialog() {
        console.log('🪟 Creating license activation dialog window...');

        return new Promise((resolve) => {
            try {
                this.window = new BrowserWindow({
                width: 500,
                height: 400,
                parent: this.parentWindow,
                modal: true,
                show: false,
                resizable: false,
                alwaysOnTop: true,
                center: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'license-preload.js')
                },
                title: 'ConCure License Activation'
            });

                // Add error handlers
                this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                    console.error('❌ License dialog failed to load:', errorCode, errorDescription);
                });

                this.window.webContents.on('crashed', () => {
                    console.error('❌ License dialog crashed');
                    this.window = null;
                    resolve(null);
                });

                // Load the license activation HTML
                console.log('📄 Loading license activation HTML...');
                this.window.loadFile(path.join(__dirname, 'license-activation.html')).catch(error => {
                    console.error('❌ Error loading license activation HTML:', error);
                    resolve(null);
                });

                this.window.once('ready-to-show', () => {
                    console.log('✅ License dialog ready to show');
                    if (this.window && !this.window.isDestroyed()) {
                        this.window.show();
                    } else {
                        console.error('❌ Window is null or destroyed when trying to show');
                    }
                });

                this.window.on('closed', () => {
                    console.log('🚪 License dialog closed');
                    this.window = null;
                    resolve(null);
                });
            } catch (error) {
                console.error('❌ Error creating license dialog:', error);
                resolve(null);
            }

            // Handle license activation
            ipcMain.once('license-activate', (event, licenseKey) => {
                resolve(licenseKey);
                if (this.window) {
                    this.window.close();
                }
            });

            // Handle import license file
            ipcMain.once('license-import', async () => {
                const { dialog } = require('electron');
                const result = await dialog.showOpenDialog(this.window, {
                    title: 'Import License File',
                    filters: [{ name: 'ConCure License', extensions: ['concurelic', 'json'] }],
                    properties: ['openFile']
                });
                if (!result.canceled && result.filePaths && result.filePaths[0]) {
                    resolve({ importFile: result.filePaths[0] });
                    if (this.window) {
                        this.window.close();
                    }
                }
            });

            // Handle dialog cancel
            ipcMain.once('license-cancel', () => {
                resolve(null);
                if (this.window) {
                    this.window.close();
                }
            });
        });
    }

    /**
     * Show license information dialog
     */
    async showLicenseInfo(licenseInfo) {
        return new Promise((resolve) => {
            this.window = new BrowserWindow({
                width: 600,
                height: 500,
                parent: this.parentWindow,
                modal: true,
                show: false,
                resizable: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'license-preload.js')
                },
                title: 'ConCure License Information'
            });

            // Load the license info HTML
            this.window.loadFile(path.join(__dirname, 'license-info.html'));

            this.window.once('ready-to-show', () => {
                this.window.show();
                // Send license info to the renderer
                this.window.webContents.send('license-info-data', licenseInfo);
            });

            this.window.on('closed', () => {
                this.window = null;
                resolve();
            });

            // Handle deactivation request
            ipcMain.once('license-deactivate', () => {
                resolve('deactivate');
                if (this.window) {
                    this.window.close();
                }
            });

            // Handle dialog close
            ipcMain.once('license-info-close', () => {
                resolve('close');
                if (this.window) {
                    this.window.close();
                }
            });
        });
    }

    /**
     * Show trial expired dialog
     */
    async showTrialExpiredDialog(daysRemaining = 0) {
        return new Promise((resolve) => {
            this.window = new BrowserWindow({
                width: 450,
                height: 300,
                parent: this.parentWindow,
                modal: true,
                show: false,
                resizable: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'license-preload.js')
                },
                title: 'ConCure Trial Status'
            });

            // Load the trial expired HTML
            this.window.loadFile(path.join(__dirname, 'trial-expired.html'));

            this.window.once('ready-to-show', () => {
                this.window.show();
                // Send trial info to the renderer
                this.window.webContents.send('trial-info', { daysRemaining });
            });

            this.window.on('closed', () => {
                this.window = null;
                resolve('close');
            });

            // Handle purchase license
            ipcMain.once('license-purchase', () => {
                resolve('purchase');
                if (this.window) {
                    this.window.close();
                }
            });

            // Handle enter license key
            ipcMain.once('license-enter-key', () => {
                resolve('enter-key');
                if (this.window) {
                    this.window.close();
                }
            });

            // Handle continue trial (if days remaining)
            ipcMain.once('trial-continue', () => {
                resolve('continue');
                if (this.window) {
                    this.window.close();
                }
            });
        });
    }

    /**
     * Show error dialog
     */
    async showErrorDialog(title, message, details = null) {
        return new Promise((resolve) => {
            this.window = new BrowserWindow({
                width: 400,
                height: 250,
                parent: this.parentWindow,
                modal: true,
                show: false,
                resizable: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'license-preload.js')
                },
                title: title
            });

            // Load the error dialog HTML
            this.window.loadFile(path.join(__dirname, 'license-error.html'));

            this.window.once('ready-to-show', () => {
                this.window.show();
                // Send error info to the renderer
                this.window.webContents.send('error-info', { title, message, details });
            });

            this.window.on('closed', () => {
                this.window = null;
                resolve();
            });

            // Handle dialog close
            ipcMain.once('error-close', () => {
                resolve();
                if (this.window) {
                    this.window.close();
                }
            });
        });
    }

    /**
     * Close the dialog if open
     */
    close() {
        if (this.window) {
            this.window.close();
        }
    }

    /**
     * Check if dialog is open
     */
    isOpen() {
        return this.window !== null;
    }
}

module.exports = LicenseDialog;
