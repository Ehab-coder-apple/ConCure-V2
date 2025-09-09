const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

class PhpServerManager {
    constructor() {
        this.server = null;
        this.port = 8003;
        this.host = '127.0.0.1';
        this.isRunning = false;
        this.startupTimeout = 15000; // 15 seconds
    }

    /**
     * Find available PHP executable
     */
    findPhpExecutable() {
        const isWin = process.platform === 'win32';
        const { execSync } = require('child_process');

        // On Windows, prefer a bundled PHP at resources/php/win/php.exe or electron/php/win/php.exe
        if (isWin) {
            const candidates = [];
            try {
                const resourcesPath = process.resourcesPath || path.join(__dirname, '..');
                // When packaged with asar, unpacked files go under app.asar.unpacked
                candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'php', 'win', 'php.exe'));
                // Non-asar or extra copy
                candidates.push(path.join(resourcesPath, 'php', 'win', 'php.exe'));
            } catch (_) {}
            // Dev fallback when running from source
            candidates.push(path.join(__dirname, 'php', 'win', 'php.exe'));

            for (const p of candidates) {
                try {
                    if (fs.existsSync(p)) {
                        console.log(`Found bundled PHP: ${p}`);
                        return p;
                    }
                } catch (_) {}
            }
        }

        // Fallback to system PHP
        const phpCommands = isWin ? ['php.exe', 'php'] : ['php'];
        for (const cmd of phpCommands) {
            try {
                const result = execSync(`${cmd} --version`, {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore'],
                    timeout: 5000
                });
                if (result.includes('PHP')) {
                    console.log(`Found system PHP: ${cmd}`);
                    return cmd;
                }
            } catch (error) {
                console.log(`PHP command '${cmd}' not found`);
            }
        }

        return null;
    }

    /**
     * Check if port is available
     */
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(port, (err) => {
                if (err) {
                    resolve(false);
                } else {
                    server.once('close', () => resolve(true));
                    server.close();
                }
            });
            
            server.on('error', () => resolve(false));
        });
    }

    /**
     * Find an available port starting from the default
     */
    async findAvailablePort() {
        let port = this.port;
        while (port < this.port + 100) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
            port++;
        }
        throw new Error('No available ports found');
    }

    /**
     * Get the application path
     */
    getAppPath() {
        // In development, use the project root
        if (process.env.NODE_ENV === 'development') {
            return path.join(__dirname, '..');
        }

        // In production, use the asar archive directly
        // Node.js can read from asar archives
        return path.join(process.resourcesPath, 'app.asar');
    }

    /**
     * Get writable directory for runtime files
     */
    getWritableDir() {
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        const writableDir = path.join(userDataPath, 'runtime');

        // Ensure the writable directory exists
        if (!fs.existsSync(writableDir)) {
            fs.mkdirSync(writableDir, { recursive: true });
        }

        return writableDir;
    }



    /**
     * Setup Laravel environment
     */
    async setupLaravelEnvironment() {
        const appPath = this.getAppPath();
        const writableDir = this.getWritableDir();

        // Create .env file in writable directory
        const envPath = path.join(writableDir, '.env');
        const envExamplePath = path.join(appPath, '.env.example');

        if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
            const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
            fs.writeFileSync(envPath, envExampleContent);
            console.log('Created .env file from .env.example');
        }

        // Extract essential Laravel directories to writable location
        const essentialDirs = ['vendor', 'bootstrap', 'app', 'config', 'database', 'resources', 'routes', 'public'];

        for (const dir of essentialDirs) {
            const sourcePath = path.join(appPath, dir);
            const destPath = path.join(writableDir, dir);

            if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
                console.log(`Extracting ${dir} directory...`);
                await this.copyDirectoryRecursive(sourcePath, destPath);
                console.log(`${dir} directory extracted successfully`);
            }
        }

        // Copy essential files
        const essentialFiles = ['artisan', 'composer.json', 'composer.lock'];
        for (const file of essentialFiles) {
            const sourcePath = path.join(appPath, file);
            const destPath = path.join(writableDir, file);

            if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
                const content = fs.readFileSync(sourcePath);
                fs.writeFileSync(destPath, content);
                console.log(`Copied ${file}`);
            }
        }

        // Now we can use the extracted artisan file directly
        console.log('Laravel files extracted and ready');

        // Update database path in .env
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            const dbPath = path.join(writableDir, 'concure.sqlite');

            // Update database path (with quotes to handle spaces)
            envContent = envContent.replace(
                /DB_DATABASE=.*/,
                `DB_DATABASE="${dbPath.replace(/\\/g, '/')}"`
            );

            // Update app URL
            envContent = envContent.replace(
                /APP_URL=.*/,
                `APP_URL=http://${this.host}:${this.port}`
            );

            // Ensure APP_KEY is set (if not, it will be generated later)
            if (!envContent.includes('APP_KEY=') || envContent.includes('APP_KEY=')) {
                if (!envContent.includes('APP_KEY=base64:')) {
                    // Add placeholder APP_KEY if missing
                    if (!envContent.includes('APP_KEY=')) {
                        envContent += '\nAPP_KEY=\n';
                    }
                }
            }

            fs.writeFileSync(envPath, envContent);
            console.log('Updated .env configuration');
        }

        // Ensure database file exists in writable directory
        const dbPath = path.join(writableDir, 'concure.sqlite');

        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, '');
            console.log('Created SQLite database file');
        }

        // Ensure storage directories exist in writable directory
        const storageDirs = [
            'storage/app',
            'storage/framework/cache',
            'storage/framework/sessions',
            'storage/framework/views',
            'storage/logs'
        ];

        storageDirs.forEach(dir => {
            const fullPath = path.join(writableDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });

        console.log('Laravel environment setup complete');

        // Run essential Laravel setup commands
        await this.runLaravelSetupCommands();
    }

    /**
     * Run essential Laravel setup commands
     */
    async runLaravelSetupCommands() {
        const phpPath = this.findPhpExecutable();
        const writableDir = this.getWritableDir();
        const artisanPath = path.join(writableDir, 'artisan');

        if (!fs.existsSync(artisanPath)) {
            console.log('Artisan not found, skipping Laravel setup commands');
            return;
        }

        console.log('Running Laravel setup commands...');

        try {
            // Generate application key
            console.log('Generating application key...');
            await this.runArtisanCommand(phpPath, writableDir, ['key:generate', '--force']);

            // Run migrations and seeders
            console.log('Running database migrations...');
            await this.runArtisanCommand(phpPath, writableDir, ['migrate', '--force', '--seed']);

            // Create storage link
            console.log('Creating storage link...');
            await this.runArtisanCommand(phpPath, writableDir, ['storage:link']);

            console.log('Laravel setup commands completed successfully');
        } catch (error) {
            console.error('Error running Laravel setup commands:', error);
            // Don't throw error, continue with server startup
        }
    }

    /**
     * Run an artisan command
     */
    async runArtisanCommand(phpPath, workingDir, args) {
        return new Promise((resolve, reject) => {
            const artisanPath = path.join(workingDir, 'artisan');
            const command = [artisanPath, ...args];

            console.log(`Running: ${phpPath} ${command.join(' ')}`);

            const process = require('child_process').spawn(phpPath, command, {
                cwd: workingDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    APP_ENV: 'production'
                }
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(`Artisan: ${text.trim()}`);
            });

            process.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                console.error(`Artisan Error: ${text.trim()}`);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Artisan command failed with code ${code}: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Recursively copy directory from asar to writable location
     */
    async copyDirectoryRecursive(source, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const items = fs.readdirSync(source);

        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(dest, item);

            const stat = fs.statSync(sourcePath);

            if (stat.isDirectory()) {
                await this.copyDirectoryRecursive(sourcePath, destPath);
            } else {
                const content = fs.readFileSync(sourcePath);
                fs.writeFileSync(destPath, content);
            }
        }
    }

    /**
     * Start the PHP development server
     */
    async start() {
        if (this.isRunning) {
            console.log('PHP server is already running');
            return;
        }

        const phpPath = this.findPhpExecutable();
        if (!phpPath) {
            throw new Error('PHP not found. Please install PHP 8.1 or higher to run ConCure.');
        }

        // Find available port
        this.port = await this.findAvailablePort();
        console.log(`Using port: ${this.port}`);

        // Setup Laravel environment
        await this.setupLaravelEnvironment();

        const appPath = this.getAppPath();
        const writableDir = this.getWritableDir();
        console.log(`App path: ${appPath}`);
        console.log(`Writable directory: ${writableDir}`);
        console.log(`Current working directory: ${process.cwd()}`);

        return new Promise((resolve, reject) => {
            const writableDir = this.getWritableDir();
            const artisanPath = path.join(writableDir, 'artisan');

            // If using bundled PHP, pass php.ini explicitly if present
            let serverCommand = [
                artisanPath, 'serve',
                `--host=${this.host}`,
                `--port=${this.port}`,
                '--no-reload'
            ];

            const bundledPhpDirWin = path.join('php', 'win');
            const isBundledPhp = phpPath.toLowerCase().includes(`\\${bundledPhpDirWin}\\php.exe`) || phpPath.includes(`/${bundledPhpDirWin}/php.exe`);
            if (isBundledPhp) {
                const phpDir = path.dirname(phpPath);
                const phpIniPath = path.join(phpDir, 'php.ini');
                if (fs.existsSync(phpIniPath)) {
                    serverCommand = ['-c', phpIniPath, ...serverCommand];
                } else {
                    // No php.ini: force-enable required extensions via -d flags
                    const extDir = path.join(phpDir, 'ext');
                    serverCommand = [
                        '-d', `extension_dir=${extDir}`,
                        '-d', 'extension=sqlite3',
                        '-d', 'extension=pdo_sqlite',
                        '-d', 'extension=openssl',
                        ...serverCommand
                    ];
                }
            }

            console.log(`Starting PHP server: ${phpPath} ${serverCommand.join(' ')}`);

            this.server = spawn(phpPath, serverCommand, {
                cwd: writableDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    APP_ENV: 'production'
                }
            });

            let resolved = false;

            this.server.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`PHP Server: ${output}`);
                
                if (output.includes('Server running') && !resolved) {
                    this.isRunning = true;
                    resolved = true;
                    resolve({
                        url: `http://${this.host}:${this.port}`,
                        port: this.port
                    });
                }
            });

            this.server.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`PHP Server Error: ${error}`);

                // Check for critical Laravel errors
                const criticalErrors = [
                    'failed to open stream',
                    'Permission denied',
                    'No application encryption key has been specified',
                    'could not find driver',
                    'Class \'',
                    'Fatal error',
                    'Parse error'
                ];

                const isCritical = criticalErrors.some(criticalError =>
                    error.toLowerCase().includes(criticalError.toLowerCase())
                );

                if (isCritical && !resolved) {
                    resolved = true;
                    reject(new Error(`Laravel Error: ${error.trim()}`));
                }
            });

            this.server.on('error', (error) => {
                console.error('Failed to start PHP server:', error);
                this.isRunning = false;
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            });

            this.server.on('close', (code) => {
                console.log(`PHP server exited with code ${code}`);
                this.isRunning = false;
            });

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.isRunning = true;
                    resolve({
                        url: `http://${this.host}:${this.port}`,
                        port: this.port
                    });
                }
            }, this.startupTimeout);
        });
    }

    /**
     * Stop the PHP server
     */
    stop() {
        if (this.server) {
            console.log('Stopping PHP server...');
            this.server.kill('SIGTERM');
            
            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.server && !this.server.killed) {
                    console.log('Force killing PHP server...');
                    this.server.kill('SIGKILL');
                }
            }, 5000);
            
            this.server = null;
            this.isRunning = false;
        }
    }

    /**
     * Restart the PHP server
     */
    async restart() {
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return this.start();
    }

    /**
     * Get server status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            host: this.host,
            url: `http://${this.host}:${this.port}`
        };
    }
}

module.exports = PhpServerManager;
