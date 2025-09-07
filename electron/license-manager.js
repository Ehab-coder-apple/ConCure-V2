const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { machineId } = require('node-machine-id');
const https = require('https');
const http = require('http');

class LicenseManager {
    // Ed25519 public key (raw 32-byte base64). Replace with your real key string when updating.
    static PUBLIC_KEY_BASE64 = 'zJW3exA7hRLjlSNSu1xsIHvpGXz9GClVnBvgv1pY3+E=';

    // Build a standard SPKI PEM from the raw 32-byte Ed25519 key so Node's crypto can verify signatures
    static getEd25519SpkiPem() {
        try {
            const raw = Buffer.from(LicenseManager.PUBLIC_KEY_BASE64, 'base64');
            // DER prefix for Ed25519 SPKI: 302a300506032b6570032100
            const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
            const b64 = der.toString('base64');
            const lines = b64.match(/.{1,64}/g).join('\n');
            return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
        } catch (e) {
            console.error('Failed to construct Ed25519 SPKI PEM:', e);
            return null;
        }
    }
    constructor() {
        this.licenseFile = path.join(app.getPath('userData'), 'license.json');
        this.configFile = path.join(__dirname, 'license-config.json');
        this.config = null;
        this.licenseServerUrl = 'http://127.0.0.1:8000/api/license'; // Default fallback
        this.license = null;
        this.hardwareFingerprint = null;
        this.validationInterval = null;
        this.isValidating = false;
    }

    /**
     * Make HTTP POST request using Node.js built-in modules
     */
    async makeHttpRequest(url, data, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const postData = JSON.stringify(data);

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: options.timeout || 10000
            };

            const req = httpModule.request(requestOptions, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve({
                            data: parsedData,
                            status: res.statusCode,
                            statusText: res.statusMessage
                        });
                    } catch (error) {
                        resolve({
                            data: responseData,
                            status: res.statusCode,
                            statusText: res.statusMessage
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Initialize the license manager
     */
    async initialize() {
        try {
            // Load configuration
            await this.loadConfig();

            // Generate hardware fingerprint
            this.hardwareFingerprint = await this.generateHardwareFingerprint();

            // Load existing license
            await this.loadLicense();

            // Start periodic validation if license exists
            if (this.license && this.license.licenseKey) {
                this.startPeriodicValidation();
            }

            console.log('License Manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize License Manager:', error);
            return false;
        }
    }

    /**
     * Generate hardware fingerprint for this machine
     */
    async generateHardwareFingerprint() {
        try {
            const machineIdValue = await machineId();
            const cpuInfo = os.cpus()[0];
            const networkInterfaces = os.networkInterfaces();
            
            // Get MAC address
            let macAddress = '';
            for (const interfaceName in networkInterfaces) {
                const interfaces = networkInterfaces[interfaceName];
                for (const iface of interfaces) {
                    if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                        macAddress = iface.mac;
                        break;
                    }
                }
                if (macAddress) break;
            }
            
            const components = [
                machineIdValue,
                cpuInfo.model,
                os.platform(),
                os.arch(),
                macAddress,
                os.totalmem().toString()
            ];
            
            const fingerprint = crypto
                .createHash('sha256')
                .update(components.join('|'))
                .digest('hex')
                .toUpperCase()
                .substring(0, 32);
            
            console.log('Hardware fingerprint generated:', fingerprint);
            return fingerprint;
        } catch (error) {
            console.error('Failed to generate hardware fingerprint:', error);
            // Fallback fingerprint
            return crypto.randomBytes(16).toString('hex').toUpperCase();
        }
    }

    /**
     * Get system information for license validation
     */
    getSystemInfo() {
        return {
            machine_name: os.hostname(),
            os_type: os.platform(),
            os_version: os.release(),
            app_version: app.getVersion(),
            cpu_model: os.cpus()[0]?.model || 'Unknown',
            total_memory: os.totalmem(),
            arch: os.arch(),
        };
    }

    /**
     * Load configuration from file
     */
    async loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const configData = fs.readFileSync(this.configFile, 'utf8');
                this.config = JSON.parse(configData);
                this.licenseServerUrl = this.config.licenseServerUrl || this.licenseServerUrl;
                console.log('Configuration loaded');
                return true;
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
        return false;
    }

    /**
     * Load license from file
     */
    async loadLicense() {
        try {
            console.log('📂 Loading license from:', this.licenseFile);
            if (fs.existsSync(this.licenseFile)) {
                const licenseData = fs.readFileSync(this.licenseFile, 'utf8');
                this.license = JSON.parse(licenseData);
                console.log('✅ License loaded from file');
                console.log('📄 License data:', {
                    licenseKey: this.license.licenseKey ? 'Present' : 'Missing',
                    activatedAt: this.license.activatedAt,
                    lastValidated: this.license.lastValidated
                });
                return true;
            } else {
                console.log('📂 License file does not exist');
            }
        } catch (error) {
            console.error('❌ Failed to load license:', error);
        }
        return false;
    }

    /**
     * Save license to file
     */
    async saveLicense(licenseData) {
        try {
            console.log('💾 Saving license to:', this.licenseFile);
            console.log('📄 License data to save:', {
                licenseKey: licenseData.licenseKey ? 'Present' : 'Missing',
                activatedAt: licenseData.activatedAt,
                lastValidated: licenseData.lastValidated
            });

            fs.writeFileSync(this.licenseFile, JSON.stringify(licenseData, null, 2));
            this.license = licenseData;
            console.log('✅ License saved to file successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to save license:', error);
            return false;
        }
    }

    /**
     * Validate license key offline
     */
    validateLicenseKeyOffline(cleanKey) {
        // Validate format: 18 characters, alphanumeric
        if (!cleanKey || cleanKey.length !== 18) {
            return { valid: false, error: 'Invalid license key format' };
        }

        // Extract license type from first 2 characters
        const typeCode = cleanKey.substring(0, 2);
        let licenseType, features, trialDays;

        switch (typeCode) {
            case 'TR':
                licenseType = 'trial';
                trialDays = 30;
                features = ['basic_features', 'patient_management', 'appointments'];
                break;
            case 'ST':
                licenseType = 'standard';
                features = ['basic_features', 'patient_management', 'appointments', 'billing', 'reports'];
                break;
            case 'PR':
                licenseType = 'premium';
                features = ['all_features', 'patient_management', 'appointments', 'billing', 'reports', 'analytics', 'multi_user'];
                break;
            default:
                return { valid: false, error: 'Invalid license type' };
        }

        // Generate customer info based on license key
        const customerId = cleanKey.substring(2, 6);

        return {
            valid: true,
            license: {
                type: licenseType,
                features: features,
                trialDays: trialDays,
                maxUsers: licenseType === 'premium' ? 10 : (licenseType === 'standard' ? 3 : 1),
                expiresAt: licenseType === 'trial' ? null : '2025-12-31T23:59:59Z'
            },
            customer: {
                id: customerId,
                name: 'ConCure User',
                email: 'user@concure.com',
                company: 'Medical Practice'
            }
        };
    }

    /**
     * Generate installation ID
     */
    generateInstallationId() {
        return 'inst_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Generate a formatted trial key like TR-XXXX-XXXX-XXXX-XXXX (total 18 alphanumerics)
     */
    generateTrialKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let core = '';
        for (let i = 0; i < 16; i++) {
            core += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Format 2-4-4-4-4 with dashes for readability
        return `TR-${core.substring(0,4)}-${core.substring(4,8)}-${core.substring(8,12)}-${core.substring(12,16)}`;
    }

    /**
     * Create and persist an offline trial license (no UI)
     */
    async createTrialLicense(days = 30) {
        const trialKey = this.generateTrialKey();
        // Reuse offline validation to construct info
        const info = this.validateLicenseKeyOffline(trialKey.replace(/[^A-Z0-9]/g, ''));
        const now = new Date();
        const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        const licenseData = {
            licenseKey: trialKey,
            activatedAt: now.toISOString(),
            lastValidated: now.toISOString(),
            licenseInfo: {
                ...(info.license || {}),
                trialDays: days,
                expiresAt
            },
            customerInfo: info.customer || { name: 'Trial User' },
            installationId: this.generateInstallationId(),
            hardwareFingerprint: this.hardwareFingerprint,
            licenseSource: 'trial'
        };
        await this.saveLicense(licenseData);
        this.startPeriodicValidation();
        return licenseData;
    }

    /**
     * Activate license offline
     */
    async activateLicense(licenseKey) {
        try {
            this.isValidating = true;

            // Clean the license key
            const cleanKey = licenseKey.replace(/[^A-Z0-9]/g, '');

            // Validate license key format and generate license info
            const licenseInfo = this.validateLicenseKeyOffline(cleanKey);

            if (licenseInfo.valid) {
                console.log('✅ License key is valid, creating license data...');

                const licenseData = {
                    licenseKey: licenseKey,
                    activatedAt: new Date().toISOString(),
                    lastValidated: new Date().toISOString(),
                    licenseInfo: licenseInfo.license,
                    customerInfo: licenseInfo.customer,
                    installationId: this.generateInstallationId(),
                    hardwareFingerprint: this.hardwareFingerprint,
                    licenseSource: 'key'
                };

                console.log('💾 Saving license data after activation...');
                const saveResult = await this.saveLicense(licenseData);

                if (saveResult) {
                    console.log('✅ License saved successfully, starting periodic validation...');
                    this.startPeriodicValidation();
                    return { success: true, data: licenseInfo };
                } else {
                    console.log('❌ Failed to save license');
                    return { success: false, error: 'Failed to save license' };
                }
            } else {
                console.log('❌ License key validation failed:', licenseInfo.error);
                return { success: false, error: licenseInfo.error || 'Invalid license key format' };
            }
        } catch (error) {
            console.error('License activation error:', error);
            return {
                success: false,
                error: error.message || 'License activation failed'
            };
        } finally {
            this.isValidating = false;
        }
    }

    /**
     * Validate license offline
     */
    async validateLicense(validationType = 'startup') {
        console.log('🔍 validateLicense called with type:', validationType);
        console.log('📄 Current license object:', this.license ? 'exists' : 'null');

        if (!this.license || !this.license.licenseKey) {
            console.log('❌ No license found in validateLicense');
            return { valid: false, error: 'No license found' };
        }

        try {
            this.isValidating = true;
            console.log('🔑 License key to validate:', this.license.licenseKey);

            // Clean the license key
            const cleanKey = this.license.licenseKey.replace(/[^A-Z0-9]/g, '');
            console.log('🧹 Cleaned license key:', cleanKey);

            // Validate license key offline
            const licenseInfo = this.validateLicenseKeyOffline(cleanKey);
            console.log('✅ License validation result:', licenseInfo);

            if (licenseInfo.valid) {
                console.log('✅ License key is valid, checking expiration...');

                // Check if license is expired
                if (licenseInfo.license.type === 'trial') {
                    const activatedDate = new Date(this.license.activatedAt);
                    const trialDays = licenseInfo.license.trialDays || 30;
                    const expiryDate = new Date(activatedDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));

                    console.log('📅 Trial activated:', activatedDate);
                    console.log('📅 Trial expires:', expiryDate);
                    console.log('📅 Current date:', new Date());

                    if (new Date() > expiryDate) {
                        console.log('❌ Trial license has expired');
                        return { valid: false, error: 'Trial license has expired' };
                    }
                }

                // Update last validated timestamp
                this.license.lastValidated = new Date().toISOString();
                await this.saveLicense(this.license);
                console.log('✅ License validation successful');
                return { valid: true, data: licenseInfo };
            } else {
                console.log('❌ License key validation failed:', licenseInfo.error);
                return { valid: false, error: licenseInfo.error || 'Invalid license key' };
            }
        } catch (error) {
            console.error('❌ License validation error:', error);
            return {
                valid: false,
                error: error.message || 'License validation failed'
            };
        } finally {
            this.isValidating = false;
        }
    }

    /**
     * Import and verify a signed license file (.concurelic)
     */
    async importLicenseFile(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            // File structure: { payload: base64(json), signature: base64 }
            const parsed = JSON.parse(content.toString());
            const payloadBytes = Buffer.from(parsed.payload, 'base64');
            const signature = Buffer.from(parsed.signature, 'base64');

            // Verify Ed25519 signature
            const verify = crypto.verify || crypto.sign; // Node >= 12 supports crypto.verify
            const pem = LicenseManager.getEd25519SpkiPem();
            const isValid = pem ? crypto.verify(null, payloadBytes, pem, signature) : false;
            if (!isValid) {
                return { success: false, error: 'Invalid license file signature' };
            }

            const payload = JSON.parse(payloadBytes.toString('utf8'));
            // Optional machine binding
            if (payload.hardwareFingerprint && payload.hardwareFingerprint !== this.hardwareFingerprint) {
                return { success: false, error: 'License file is bound to a different machine' };
            }

            // Check time-limited expiry (15 days or provided date)
            if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
                return { success: false, error: 'License file has expired' };
            }

            const licenseData = {
                licenseKey: payload.key || payload.licenseKey || 'FILE',
                activatedAt: new Date().toISOString(),
                lastValidated: new Date().toISOString(),
                licenseInfo: payload.license || payload.licenseInfo || { type: payload.edition || 'standard', features: payload.features || [], expiresAt: payload.expiresAt },
                customerInfo: payload.customer || {},
                installationId: this.generateInstallationId(),
                hardwareFingerprint: this.hardwareFingerprint,
                licenseSource: 'file'
            };

            await this.saveLicense(licenseData);
            this.startPeriodicValidation();
            return { success: true };
        } catch (e) {
            console.error('Failed to import license file:', e);
            return { success: false, error: 'Failed to read license file' };
        }
    }

    /**
     * Start periodic license validation
     */
    startPeriodicValidation() {
        // Clear existing interval
        if (this.validationInterval) {
            clearInterval(this.validationInterval);
        }

        // Validate every 4 hours
        this.validationInterval = setInterval(async () => {
            if (!this.isValidating) {
                console.log('Performing periodic license validation...');
                await this.validateLicense('periodic');
            }
        }, 4 * 60 * 60 * 1000); // 4 hours
    }

    /**
     * Stop periodic validation
     */
    stopPeriodicValidation() {
        if (this.validationInterval) {
            clearInterval(this.validationInterval);
            this.validationInterval = null;
        }
    }

    /**
     * Check if license is valid and not expired
     */
    isLicenseValid() {
        if (!this.license || !this.license.licenseInfo) {
            return false;
        }

        const licenseInfo = this.license.licenseInfo;
        
        // Check expiration
        if (licenseInfo.expires_at) {
            const expiryDate = new Date(licenseInfo.expires_at);
            if (expiryDate < new Date()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get license information
     */
    getLicenseInfo() {
        console.log('🔍 Getting license info:', this.license ? 'License exists' : 'No license');
        return this.license;
    }

    /**
     * Check if feature is enabled
     */
    hasFeature(featureName) {
        if (!this.license || !this.license.licenseInfo) {
            return false;
        }

        const features = this.license.licenseInfo.features || [];
        return features.includes(featureName);
    }

    /**
     * Get trial days remaining
     */
    getTrialDaysRemaining() {
        if (!this.license || !this.license.licenseInfo) {
            return 0;
        }

        return this.license.licenseInfo.trial_days_remaining || 0;
    }

    /**
     * Deactivate license
     */
    async deactivateLicense() {
        if (!this.license || !this.license.licenseKey) {
            return { success: true };
        }

        // For offline mode, just remove local license file
        console.log('Deactivating license offline...');

        // Remove local license file
        try {
            if (fs.existsSync(this.licenseFile)) {
                fs.unlinkSync(this.licenseFile);
            }
            this.license = null;
            this.stopPeriodicValidation();
            return { success: true };
        } catch (error) {
            console.error('Failed to remove license file:', error);
            return { success: false, error: 'Failed to remove license file' };
        }
    }

    /**
     * Record usage event (offline mode)
     */
    async recordUsage(eventType, eventData = {}) {
        if (!this.license || !this.license.licenseKey) {
            return;
        }

        // For offline mode, just log usage locally
        console.log('Usage recorded offline:', eventType, eventData);
        // In a full implementation, you might store usage data locally
        // and sync when online, but for this offline app, we just log it
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopPeriodicValidation();
    }
}

module.exports = LicenseManager;
