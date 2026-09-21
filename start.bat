@echo off
title Ziya Baran Akademi Sunucusu
set NODE_TLS_REJECT_UNAUTHORIZED=0
cd /d "C:\Users\fatih\.gemini\antigravity\scratch\ziya-baran-akademi"
echo ========================================================
echo   ZIYA BARAN AKADEMI SUNUCUSU BASLATILIYOR...
echo   Adres: http://localhost:3000
echo   Yonetim: http://localhost:3000/admin
echo ========================================================
"C:\Program Files\nodejs\node.exe" server.js
pause
