@echo off
echo Starting EKVAAR OS...
echo.
echo Killing existing processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend (Port 8000)...
cd /d C:\Users\zomat\OneDrive\Desktop\EKVAAR\apps\backend-py
start "EKVAAR Backend" /min python main.py

timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend (Port 3000)...
cd /d C:\Users\zomat\OneDrive\Desktop\EKVAAR\apps\frontend
start "EKVAAR Frontend" /min npm run dev

echo.
echo ========================================
echo  EKVAAR OS is starting...
echo ========================================
echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo.
echo  Wait 10-15 seconds for full startup.
echo ========================================
echo.
pause
