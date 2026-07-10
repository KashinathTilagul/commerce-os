@echo off
cd /d C:\Users\zomat\OneDrive\Desktop\EKVAAR\apps\backend-py
start "EKVAAR Backend" python main.py
timeout /t 3 /nobreak >nul
cd /d C:\Users\zomat\OneDrive\Desktop\EKVAAR\apps\frontend
start "EKVAAR Frontend" npm run dev
echo Servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
pause
