Set WshShell = CreateObject("WScript.Shell")
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-concure.cmd"
WshShell.Run "cmd /c """ & scriptPath & """", 0, False

