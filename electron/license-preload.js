const { contextBridge, ipcRenderer } = require('electron');

// Expose license-related APIs to the renderer process
contextBridge.exposeInMainWorld('licenseAPI', {
    // License activation
    activateLicense: (licenseKey) => {
        ipcRenderer.send('license-activate', licenseKey);
    },

    // Import signed license file (.concurelic)
    importLicenseFile: () => {
        ipcRenderer.send('license-import');
    },

    cancelActivation: () => {
        ipcRenderer.send('license-cancel');
    },
    
    // License information
    deactivateLicense: () => {
        ipcRenderer.send('license-deactivate');
    },
    
    closeLicenseInfo: () => {
        ipcRenderer.send('license-info-close');
    },
    
    // Trial management
    purchaseLicense: () => {
        ipcRenderer.send('license-purchase');
    },
    
    enterLicenseKey: () => {
        ipcRenderer.send('license-enter-key');
    },
    
    continueTrial: () => {
        ipcRenderer.send('trial-continue');
    },
    
    // Error dialog
    closeError: () => {
        ipcRenderer.send('error-close');
    },
    
    // Event listeners
    onLicenseInfoData: (callback) => {
        ipcRenderer.on('license-info-data', (event, data) => callback(data));
    },
    
    onTrialInfo: (callback) => {
        ipcRenderer.on('trial-info', (event, data) => callback(data));
    },
    
    onErrorInfo: (callback) => {
        ipcRenderer.on('error-info', (event, data) => callback(data));
    },
    
    // Utility functions
    openExternal: (url) => {
        ipcRenderer.send('open-external', url);
    }
});

// Handle external link opening
ipcRenderer.on('open-external', (event, url) => {
    require('electron').shell.openExternal(url);
});
