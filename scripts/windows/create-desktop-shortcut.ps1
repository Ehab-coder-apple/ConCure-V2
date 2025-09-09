param(
  [string]$LauncherCmd = "$env:APPDATA\Concure\start-concure.cmd",
  [string]$ShortcutName = "Start Concure.lnk"
)

$desktop = [IO.Path]::Combine($env:USERPROFILE, 'Desktop')
$shortcutPath = Join-Path $desktop $ShortcutName

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$sc.Arguments  = "/c `"$LauncherCmd`""
$sc.WorkingDirectory = [IO.Path]::GetDirectoryName($LauncherCmd)
$sc.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$sc.Save()

Write-Host "Created shortcut:" $shortcutPath

