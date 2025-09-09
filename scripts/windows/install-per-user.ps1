<#
Concure per-user installer script (no admin needed)
- Copies launcher files to %APPDATA%\Concure
- Creates a Desktop shortcut "Start Concure.lnk"
- Does not change system settings or require elevation
#>

param(
  [string]$AppDataDir = "$env:APPDATA\Concure",
  [string]$SourceDir = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$ErrorActionPreference = 'Stop'

Write-Host "Installing Concure per-user launcher..."

# Ensure destination directory exists
if (!(Test-Path $AppDataDir)) {
  New-Item -ItemType Directory -Path $AppDataDir | Out-Null
}

# Files to copy
$files = @('start-concure.cmd', 'start-concure.vbs')
foreach ($f in $files) {
  Copy-Item -Force -Path (Join-Path $SourceDir $f) -Destination (Join-Path $AppDataDir $f)
}

# Create Desktop shortcut
$LauncherCmd = Join-Path $AppDataDir 'start-concure.cmd'
$desktop = [IO.Path]::Combine($env:USERPROFILE, 'Desktop')
$shortcutPath = Join-Path $desktop 'Start Concure.lnk'

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$sc.Arguments  = "/c `"$LauncherCmd`""
$sc.WorkingDirectory = $AppDataDir
$sc.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$sc.Save()

Write-Host "✅ Installed. Use the Desktop shortcut 'Start Concure' to launch."

