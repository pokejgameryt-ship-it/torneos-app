@echo off
echo Creando acceso directo en el escritorio...

set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop

 powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\Torneos App.lnk'); $sc.TargetPath = '%SCRIPT_DIR%Torneos App.vbs'; $sc.WorkingDirectory = '%SCRIPT_DIR%'; $sc.Description = 'Iniciar Torneos App'; $sc.Save()"

echo.
echo Acceso directo creado en: %DESKTOP%\Torneos App.lnk
echo.
pause
