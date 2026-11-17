@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Se necesita Node.js 22.13 o una version posterior.
  echo Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto error
)
call npm run build
if errorlevel 1 goto error
echo.
echo SIGESHRL se abre en http://localhost:5173
echo Deja esta ventana abierta mientras uses la aplicacion.
start "" "http://localhost:5173"
call npm start
goto end
:error
echo No se pudo preparar la aplicacion. Revisa el mensaje anterior.
pause
:end
endlocal
