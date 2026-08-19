@echo off
chcp 65001 > nul
echo =================================================================
echo  [DONG BO CODE TU MAY TINH LOCAL LEN VPS LINUX]
echo =================================================================
echo.

set /p msg="Nhap ghi chu cap nhat (commit message, nhan Enter dung mac dinh): "
if "%msg%"=="" set msg=Auto update from local PC

echo.
echo [1/3] Dang luu (Commit) cac thay doi moi nhat tai Local...
git add .
git commit -m "%msg%"

echo.
echo [2/3] Dang day (Push) code len Git Repository...
git push origin main

echo.
echo [3/3] Dang gui tin hieu kich hoat VPS tu dong keo code va reload PM2...
echo.
set /p vpsurl="Nhap IP/Domain VPS (Vi du: http://123.45.67.89:3000 hoac nhan Enter dung localhost:3000): "
if "%vpsurl%"=="" set vpsurl=http://localhost:3000

curl.exe -X POST "%vpsurl%/api/system/git-pull" -H "Content-Type: application/json"

echo.
echo =================================================================
echo  [HOAN TAT DONG BO CODE LEN VPS!]
echo =================================================================
pause
