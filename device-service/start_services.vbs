Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory of the currently running script
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Run the device service from this folder with the installed PythonCore runtime.
' Resolving the interpreter and script paths explicitly prevents the Windows
' Python Manager alias from launching in another working directory.
pythonExe = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Python\pythoncore-3.14-64\python.exe"
serviceScript = scriptDir & "\device_service.py"
If fso.FileExists(pythonExe) Then
  command = Chr(34) & pythonExe & Chr(34) & " " & Chr(34) & serviceScript & Chr(34)
Else
  command = "python " & Chr(34) & serviceScript & Chr(34)
End If
WshShell.Run command, 0, False
