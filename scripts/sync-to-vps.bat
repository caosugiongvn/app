@echo off
chcp 65001 > nul
echo =================================================================
echo  [DONG BO CODE TU MAY TINH LOCAL LEN VPS LINUX]
echo =================================================================
echo.

set /p msg="Nhap ghi chu cap nhat (commit message, nhan Enter dung mac dinh): "
if "%msg%"=="" set msg=Auto update from local PC

echo.
echo [1/2] Dang luu (Commit) cac thay doi tai Local...
git add .
git commit -m "%msg%"

echo.
echo [2/2] Dang day (Push) code len GitHub Repository...
git push origin main

echo.
echo =================================================================
echo  [CODE DA DUOC PUSH LEN GITHUB THANH CONG!]
echo =================================================================
echo.
echo [TUY CHON] Tinh nang tu dong kich hoat VPS keo code:
set /p vpsurl="Nhap IP hoac Domain VPS cua ban (Vi du: http://123.45.67.89:3000 hoac nhan Enter de bo qua): "

if not "%vpsurl%"=="" (
    echo.
    echo Dang gui lenh cap nhat den VPS (%vpsurl%)...
    curl.exe -s -X POST "%vpsurl%/api/system/git-pull" -H "Content-Type: application/json"
    echo.
    echo Da gui xong tin hieu cap nhat den VPS!
) else (
    echo.
    echo [THONG BAO] Ban da bo qua buoc kich hoat tu dong.
    echo De cap nhat tren VPS, ban chi cần vao trang Web ban hang tren VPS va bam nut "Dong bo VPS" o goc tren phai!
)

echo.
echo =================================================================
echo  [HOAN TAT QUY TRINH!]
echo =================================================================
pause
