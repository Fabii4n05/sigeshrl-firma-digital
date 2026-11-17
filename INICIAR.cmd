@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Se necesita Node.js 22.16 o una version posterior.
  echo Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=16)?0:1)"
if errorlevel 1 (
  echo Actualiza Node.js a la version 24 LTS o posterior.
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
node scripts/launch.mjs
goto end
:error
echo No se pudo preparar la aplicacion. Revisa el mensaje anterior.
pause
:end
endlocal
