!macro customInstall
  ; Create per-user launcher directory (%APPDATA%\Concure)
  CreateDirectory "$APPDATA\Concure"

  ; Copy launcher files from app resources to %APPDATA%\Concure
  ; They are packaged under resources\launcher\
  CopyFiles /SILENT "$INSTDIR\resources\launcher\start-concure.cmd" "$APPDATA\Concure\start-concure.cmd"
  CopyFiles /SILENT "$INSTDIR\resources\launcher\start-concure.vbs" "$APPDATA\Concure\start-concure.vbs"

  ; Create Desktop shortcut pointing to the VBS (silent)
  CreateShortCut "$DESKTOP\Start Concure.lnk" "wscript.exe" '"$APPDATA\Concure\start-concure.vbs"' "$WINDIR\system32\shell32.dll" 220
!macroend

