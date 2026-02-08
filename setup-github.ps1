# 在專案根目錄執行此腳本，會初始化 git 並推送到 GitHub
# 使用方式：在 PowerShell 中 cd 到本資料夾後執行 .\setup-github.ps1

$ErrorActionPreference = "Stop"
$remote = "https://github.com/TimSou885/TeacherAI.git"

if (-not (Test-Path .git)) {
    Write-Host "初始化 git..."
    git init
}

Write-Host "加入檔案..."
git add .
$status = git status --short
if (-not $status) {
    Write-Host "沒有需要提交的變更，略過 commit。"
} else {
    git commit -m "Phase 0: 對話、歷史、AI 標題、刪除對話、GitHub 設定"
}

if (-not (git remote get-url origin 2>$null)) {
    Write-Host "設定遠端 origin..."
    git remote add origin $remote
} else {
    Write-Host "遠端已存在，更新為 $remote"
    git remote set-url origin $remote
}

git branch -M main
Write-Host "推送到 GitHub..."
git push -u origin main
Write-Host "完成！"
Write-Host "倉庫：https://github.com/TimSou885/TeacherAI"
