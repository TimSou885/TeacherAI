@echo off
chcp 65001 >nul
cd /d "%~dp0"
set REMOTE=https://github.com/TimSou885/TeacherAI.git

echo 正在設定 GitHub 倉庫...
echo.

if not exist .git (
    echo 初始化 git...
    git init
    echo.
)

echo 加入檔案...
git add .
echo.

git diff --cached --quiet 2>nul
if errorlevel 1 (
    git commit -m "Phase 0: 對話、歷史、AI 標題、刪除對話、GitHub 設定"
    echo.
) else (
    echo 沒有需要提交的變更，略過 commit.
    echo.
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo 設定遠端 origin...
    git remote add origin %REMOTE%
) else (
    echo 遠端已存在，更新為 %REMOTE%
    git remote set-url origin %REMOTE%
)
echo.

git branch -M main
echo 推送到 GitHub...
git push -u origin main
echo.
echo 完成！倉庫：https://github.com/TimSou885/TeacherAI
echo.
pause
