// Auto-fetch portable PHP for Windows before packaging
// - Downloads a specific PHP 8.2 x64 NTS build
// - Extracts into electron/php/win
// - Ensures required extensions (sqlite3, pdo_sqlite, openssl) are enabled via php.ini or -d flags

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_DIR = path.join(PROJECT_ROOT, 'electron', 'php', 'win');
const PHP_EXE = path.join(DEST_DIR, 'php.exe');

// Pinned PHP zip (adjust when you want to upgrade)
const PHP_URL = 'https://windows.php.net/downloads/releases/archives/php-8.2.12-nts-Win32-vs16-x64.zip';

function log(msg) { console.log(`[prepare-php-win] ${msg}`); }
function warn(msg) { console.warn(`[prepare-php-win] ${msg}`); }
function fail(msg) { console.error(`[prepare-php-win] ${msg}`); process.exitCode = 0; }

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }

function runPSInline(script) {
  const res = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8', stdio: 'pipe'
  });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(res.stderr || `PowerShell exited with ${res.status}`);
  return res.stdout;
}

function moveContentsUpIfInSubfolder(destDir) {
  const items = fs.readdirSync(destDir, { withFileTypes: true });
  if (items.find(d => d.isFile() && d.name.toLowerCase() === 'php.exe')) return;
  const folders = items.filter(d => d.isDirectory());
  if (folders.length === 1) {
    const sub = path.join(destDir, folders[0].name);
    const subItems = fs.readdirSync(sub);
    for (const name of subItems) {
      fs.renameSync(path.join(sub, name), path.join(destDir, name));
    }
    // Try to remove now-empty folder (ignore errors)
    try { fs.rmdirSync(sub); } catch {}
  }
}

function ensurePhpIni(destDir) {
  const iniPath = path.join(destDir, 'php.ini');
  if (fileExists(iniPath)) return;
  const ini = [
    'extension_dir = "ext"',
    'extension = sqlite3',
    'extension = pdo_sqlite',
    'extension = openssl',
    'date.timezone = UTC',
    ''
  ].join('\n');
  fs.writeFileSync(iniPath, ini, 'utf8');
}

(async function main() {
  if (os.platform() !== 'win32') {
    log('Not Windows; skipping PHP prepare step.');
    return;
  }

  if (fileExists(PHP_EXE)) {
    log('Bundled PHP already present. Skipping download.');
    return;
  }

  log('Bundled PHP not found. Downloading portable PHP...');
  ensureDir(DEST_DIR);

  const tmpZip = path.join(os.tmpdir(), `php-win.zip`);
  try {
    // Download
    const dl = `Invoke-WebRequest -Uri '${PHP_URL}' -OutFile '${tmpZip}' -UseBasicParsing`;
    log('Downloading PHP zip...');
    runPSInline(dl);

    // Extract
    const expand = `Expand-Archive -Force -Path '${tmpZip}' -DestinationPath '${DEST_DIR}'`;
    log('Expanding PHP zip...');
    runPSInline(expand);

    // If files ended in a versioned subfolder, move them up
    moveContentsUpIfInSubfolder(DEST_DIR);

    // Ensure php.exe now exists
    if (!fileExists(PHP_EXE)) {
      throw new Error('php.exe not found after extraction.');
    }

    // Write minimal php.ini enabling required extensions
    ensurePhpIni(DEST_DIR);

    log('PHP runtime prepared successfully.');
  } catch (err) {
    warn(`Failed to fetch/extract PHP automatically: ${err.message}`);
    warn('Build will continue, falling back to system PHP at runtime (if available).');
  } finally {
    try { if (fileExists(tmpZip)) fs.unlinkSync(tmpZip); } catch {}
  }
})();

