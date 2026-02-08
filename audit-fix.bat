@echo off
chcp 65001 >nul
echo 嘗試修復 api 依賴的已知漏洞（不強制升級）...
cd /d "%~dp0api"
call npm audit fix
echo.
pause
