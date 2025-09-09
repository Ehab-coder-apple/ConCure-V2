!macro customInstall
  ; Create per-user launcher directory
  Var /GLOBAL AppDataDir
  StrCpy $AppDataDir "$APPDATA\Concure"
  CreateDirectory "$AppDataDir"

  ; Copy launcher files from app resources to %APPDATA%\Concure
  ; They are packaged under resources\launcher\
  CopyFiles /SILENT "$INSTDIR\resources\launcher\start-concure.cmd" "$AppDataDir\start-concure.cmd"
  CopyFiles /SILENT "$INSTDIR\resources\launcher\start-concure.vbs" "$AppDataDir\start-concure.vbs"

  ; Create Desktop shortcut pointing to the VBS (silent)
  CreateShortCut "$DESKTOP\Start Concure.lnk" "wscript.exe" '"$AppDataDir\start-concure.vbs"' "$WINDIR\system32\shell32.dll" 220
!macroend

