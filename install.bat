@echo off
chcp 65001 >nul
echo === EduSpark Phase 0: 安裝依賴 ===
echo.

echo [1/2] 安裝 web 依賴...
cd /d "%~dp0web"
call npm install
if errorlevel 1 (
  echo 錯誤: web 依賴安裝失敗
  pause
  exit /b 1
)
echo.

echo [2/2] 安裝 api 依賴...
cd /d "%~dp0api"
call npm install
if errorlevel 1 (
  echo 錯誤: api 依賴安裝失敗
  pause
  exit /b 1
)
echo.

cd /d "%~dp0"
echo === 安裝完成 ===
pause
