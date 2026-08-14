@echo off
title SmartInventory Pro Server
echo ================================================================
echo   🚀 KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO HÀNG (XAMPP MYSQL)
echo ================================================================
echo.
cd /d "%~dp0"

:: Tự động giải phóng cổng 3000 nếu đang có ứng dụng chạy ngầm trước đó
FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') DO (
    echo 🔄 Đang giải phóng cổng 3000 bị chiếm dụng (PID: %%P)...
    taskkill /F /PID %%P >nul 2>&1
)

node server.js
pause
