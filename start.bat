@echo off
cd /d "%~dp0"

echo ===================================
echo    Iniciando Torneos App...
echo ===================================

echo.
echo [1/3] Iniciando servidor (puerto 3001)...
start /B "Torneos-Server" cmd /c "set PORT=3001 && cd server && node index.js > nul 2>&1"

timeout /t 3 /nobreak > nul

echo [2/3] Iniciando cliente Vite (puerto 5173)...
start /B "Torneos-Client" cmd /c "cd client && npx vite --host > nul 2>&1"

timeout /t 4 /nobreak > nul

echo [3/3] Abriendo navegador...
start "" "http://localhost:5173"

echo.
echo ===================================
echo    App iniciada correctamente!
echo ===================================
