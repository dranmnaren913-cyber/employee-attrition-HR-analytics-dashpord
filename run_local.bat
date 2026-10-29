@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_URL=http://127.0.0.1:8000/api/"
set "FRONTEND_URL=http://127.0.0.1:5173/"
set "BACKEND_READY=0"
set "FRONTEND_READY=0"
set "ATTEMPTS=0"

if not exist "%ROOT%venv\Scripts\python.exe" (
    echo Python virtual environment not found at "%ROOT%venv".
    echo Create it and install requirements from the project README.
    pause
    exit /b 1
)

if not exist "%ROOT%frontend\node_modules\vite\bin\vite.js" (
    echo Frontend dependencies are missing. Run npm ci in the frontend folder first.
    pause
    exit /b 1
)

where curl.exe >nul 2>nul
if errorlevel 1 (
    echo curl.exe is required to check whether the local services are ready.
    pause
    exit /b 1
)

curl.exe --silent --output NUL --max-time 1 "%BACKEND_URL%" >nul 2>nul
if not errorlevel 1 set "BACKEND_READY=1"
curl.exe --silent --output NUL --max-time 1 "%FRONTEND_URL%" >nul 2>nul
if not errorlevel 1 set "FRONTEND_READY=1"

if "%BACKEND_READY%"=="0" (
    netstat -ano -p tcp | findstr /C:"127.0.0.1:8000 " | findstr /C:"LISTENING" >nul
    if errorlevel 1 (
        echo Starting Django backend...
        start "HR Analytics Backend" /D "%ROOT%backend" "%ROOT%venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000
    ) else (
        echo Django is already starting on port 8000...
    )
) else (
    echo Django backend is already responding on port 8000.
)

if "%FRONTEND_READY%"=="0" (
    netstat -ano -p tcp | findstr /C:"127.0.0.1:5173 " | findstr /C:"LISTENING" >nul
    if errorlevel 1 (
        echo Starting Vite frontend...
        start "HR Analytics Frontend" /D "%ROOT%frontend" cmd.exe /k "npm run dev -- --host 127.0.0.1"
    ) else (
        echo Vite is already starting on port 5173...
    )
) else (
    echo Vite frontend is already responding on port 5173.
)

:wait_for_services
if "%BACKEND_READY%"=="0" call :check_backend
if "%FRONTEND_READY%"=="0" call :check_frontend
if "%BACKEND_READY%"=="1" if "%FRONTEND_READY%"=="1" goto services_ready
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 45 goto startup_timeout
timeout /t 1 /nobreak >nul
goto wait_for_services

:services_ready
echo Both services are ready. Opening %FRONTEND_URL%
start "" "%FRONTEND_URL%"
endlocal
exit /b 0

:check_backend
curl.exe --silent --output NUL --max-time 1 "%BACKEND_URL%" >nul 2>nul
if not errorlevel 1 (
    set "BACKEND_READY=1"
    echo Django backend is ready.
)
exit /b 0

:check_frontend
curl.exe --silent --output NUL --max-time 1 "%FRONTEND_URL%" >nul 2>nul
if not errorlevel 1 (
    set "FRONTEND_READY=1"
    echo Vite frontend is ready.
)
exit /b 0

:startup_timeout
echo ERROR: Startup timed out after 45 seconds.
if "%BACKEND_READY%"=="0" echo Django did not respond at %BACKEND_URL%. Check its terminal window.
if "%FRONTEND_READY%"=="0" echo Vite did not respond at %FRONTEND_URL%. Check its terminal window.
pause
endlocal
exit /b 1