@echo off
chcp 65001 >nul
echo === EduSpark 本地開發 ===
echo.
echo 正在開啟兩個視窗：API (port 8787)、Web (port 5173)
echo 關閉視窗即可停止該服務。
echo.

start "EduSpark API" cmd /k "cd /d "%~dp0api" && npm run dev"
timeout /t 2 /nobreak >nul

start "EduSpark Web" cmd /k "cd /d "%~dp0web" && npm run dev"

echo.
echo 已啟動。請在瀏覽器打開 http://localhost:5173
echo.
pause
