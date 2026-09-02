@echo off
chcp 65001 >nul
title 小红花银行 · 本地预览
cd /d "%~dp0"

echo ============================================
echo   宝贝小红花银行 · 本地预览服务器
echo ============================================
echo.
echo   本脚本只用于【电脑本机】预览调试。
echo   iPhone 要装成 App，必须部署到 HTTPS，
echo   请看同目录的《使用说明.md》
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    echo [√] 检测到 Python，正在启动 http://localhost:8080
    echo     停止服务请按 Ctrl + C
    echo.
    start "" http://localhost:8080/index.html
    python -m http.server 8080 --bind 0.0.0.0
    goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
    echo [√] 检测到 Node.js，正在启动 http://localhost:8080
    echo     首次运行会下载 http-server，请稍候...
    echo     停止服务请按 Ctrl + C
    echo.
    start "" http://localhost:8080/index.html
    npx --yes http-server -p 8080 -c-1
    goto :eof
)

echo [×] 没有检测到 Python 或 Node.js
echo.
echo   请用浏览器直接双击打开 index.html 也能用，
echo   只是没有离线缓存（Service Worker 在 file:// 下不可用）。
echo.
pause
