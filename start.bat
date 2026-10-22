@echo off
cd /d "%~dp0"
set PORT=8080

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo No se encontro "python" en el PATH. Instala Python o ajusta este script para usar otro servidor local.
  pause
  exit /b 1
)

start "" http://localhost:%PORT%
python -m http.server %PORT%
