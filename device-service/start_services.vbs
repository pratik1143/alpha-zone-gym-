Set WshShell = CreateObject("WScript.Shell")
' Run device_service.py silently
WshShell.Run "python """ & WScript.Arguments(0) & """\device_service.py", 0, False
' Add additional services here if needed
' WshShell.Run "python """ & WScript.Arguments(0) & """\membership_service.py", 0, False
' WshShell.Run "python """ & WScript.Arguments(0) & """\gate_service.py", 0, False
