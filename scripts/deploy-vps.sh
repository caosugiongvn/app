#!/bin/bash

# =================================================================
# KỊCH BẢN TỰ ĐỘNG TRIỂN KHAI ỨNG DỤNG LÊN VPS LINUX (UBUNTU/DEBIAN)
# Chạy câu lệnh: bash scripts/deploy-vps.sh
# =================================================================

echo "🚀 BẮT ĐẦU CÀI ĐẶT & TRIỂN KHAI HỆ THỐNG TRÊN VPS LINUX..."

# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Node.js 20.x và Git nếu chưa có
if ! command -v node &> /dev/null; then
    echo "📦 Đang cài đặt Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs git
fi

# 3. Cài đặt PM2 toàn cục
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài đặt PM2 Process Manager..."
    sudo npm install -g pm2
fi

# 4. Cài đặt các gói phụ thuộc npm
echo "📦 Đang cài đặt NPM Packages..."
npm install --production

# 5. Khởi chạy ứng dụng với PM2
echo "⚙️ Khởi chạy ứng dụng với PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "================================================================="
echo "✅ TRIỂN KHAI HOÀN TẤT THÀNH CÔNG TRÊN VPS LINUX!"
echo "👉 Kiểm tra ứng dụng: pm2 status"
echo "👉 Xem log thời gian thực: pm2 logs sales-app"
echo "================================================================="
