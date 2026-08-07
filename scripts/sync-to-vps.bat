@echo off
chcp 65001 > nul
echo =================================================================
echo 🔄 SCRIPT ĐỒNG BỘ CODE TỪ MÁY TÍNH CÁ NHÂN LÊN VPS LINUX
echo =================================================================
echo.

set /p msg="Nhập ghi chú cập nhật (commit message): "
if "%msg%"=="" set msg="Auto update from local PC %date% %time%"

echo.
echo 1️⃣  Đang lưu (Commit) các thay đổi mới nhất ở Local...
git add .
git commit -m "%msg%"

echo.
echo 2️⃣  Đang đẩy (Push) code lên Git Repository...
git push origin main || git push

echo.
echo 3️⃣  Đang gửi tín hiệu kích hoạt VPS tự động kéo code & reload PM2...
echo.
set /p vpsurl="Nhập địa chỉ VPS (ví dụ: http://123.45.67.89:3000 hoặc nhấn Enter dùng mặc định localhost:3000): "
if "%vpsurl%"=="" set vpsurl=http://localhost:3000

curl -X POST "%vpsurl%/api/system/git-pull" -H "Content-Type: application/json"

echo.
echo.
echo =================================================================
echo 🎉 HOÀN TẤT ĐỒNG BỘ CODE LÊN VPS LINUX!
echo =================================================================
pause
