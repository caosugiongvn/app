# 📐 KIẾN TRÚC ỨNG DỤNG (MVC ARCHITECTURE) & HƯỚNG DẪN DÀNH CHO AI ASSISTANT

Tài liệu này được thiết kế chi tiết nhằm mục đích giúp các **Trợ lý AI (AI Coding Assistants như Gemini, Claude, GPT...)** và lập trình viên dễ dàng đọc hiểu, bảo trì, sửa lỗi và phát triển nâng cấp hệ thống sau này.

---

## 🚀 1. TỔNG QUAN KIẾN TRÚC (MVC PATTERN)

Hệ thống được tổ chức theo kiến trúc **MVC (Model - View - Controller)** kết hợp với mô hình **Hybrid Database (MySQL làm chính, JSON Database làm dự phòng)**:

```
                  ┌──────────────────────────────────────────┐
                  │              CLIENT / VIEW               │
                  │   HTML5 SPA / Vanilla JS / CSS Grid      │
                  └────────────────────┬─────────────────────┘
                                       │ HTTP Requests (JSON API)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │               SERVER.JS                  │
                  │ (Express App Bootstrap & Static Files)  │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │            src/routes/index.js           │
                  │        (API Router Entry Point)          │
                  └────────────────────┬─────────────────────┘
                                       │ Routing
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │            src/controllers/              │
                  │   (Business Logic & Response Format)     │
                  └────────────────────┬─────────────────────┘
                                       │ Data Operations
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │              src/models/                 │
                  │ (Data Access & Queries & Validations)   │
                  └──────────┬────────────────────┬──────────┘
                             │                    │
                             ▼ Fallback           ▼ Primary
                  ┌────────────────────┐ ┌────────────────────┐
                  │   data/db.json     │ │   MySQL Database   │
                  │ (JSON File Engine) │ │  (XAMPP / VPS DB)  │
                  └────────────────────┘ └────────────────────┘
```

---

## 📁 2. SƠ ĐỒ CẤU TRÚC THƯ MỤC CHI TIẾT

```
app/
├── src/
│   ├── config/
│   │   └── config.js            # Nạp môi trường (.env), cấu hình MySQL, IP local/VPS, Secret Key
│   ├── models/                  # [TẦNG MODEL - M] Quản lý dữ liệu & Truy vấn Database
│   │   ├── UserModel.js          # Thao tác User, Auth, Phân quyền Role, Khu vực, Xin làm CTV
│   │   ├── ProductModel.js       # Thao tác Sản phẩm, Tính tồn kho khả dụng, Nhập/Xuất kho
│   │   ├── OrderModel.js         # Thao tác Đơn hàng, Trạng thái, Phân công tài xế, Duyệt đơn, Thu tiền
│   │   ├── CtvModel.js           # Thao tác CTV, Tài xế, Bảng xếp hạng doanh thu & Tỷ lệ hoa hồng
│   │   ├── ReportModel.js        # Báo cáo tổng quan doanh thu, tồn kho, lợi nhuận & theo khu vực
│   │   └── QuickPurchaseModel.js # Liên kết mua hàng nhanh qua QR/Link cho CTV & Khách hàng
│   ├── controllers/             # [TẦNG CONTROLLER - C] Logic nghiệp vụ & Trả về JSON Response
│   │   ├── authController.js     # Đăng ký, Đăng nhập, Xin làm CTV, Cập nhật vai trò
│   │   ├── productController.js  # Lấy danh sách SP, Thêm/Sửa SP, Nhập/Xuất kho
│   │   ├── orderController.js    # Tạo đơn, Lấy danh sách, Cập nhật trạng thái, Duyệt đơn, Thanh toán
│   │   ├── ctvController.js      # Bảng xếp hạng CTV, Lấy danh sách CTV/Driver, Cấu hình hoa hồng
│   │   ├── reportController.js   # API lấy báo cáo tổng quan & báo cáo theo khu vực
│   │   ├── networkController.js  # API lấy cây mạng lưới CTV
│   │   ├── quickPurchaseController.js # API tạo & xử lý mua hàng nhanh
│   │   └── systemController.js   # API Trạng thái hệ thống & Kích hoạt Đồng bộ Code 1-Click
│   └── routes/                  # [TẦNG ROUTER - R] Khai báo URL Endpoint
│       ├── authRoutes.js        # Định tuyến /api/auth/*
│       ├── productRoutes.js     # Định tuyến /api/products, /api/inventory/*
│       ├── orderRoutes.js       # Định tuyến /api/orders/*
│       ├── ctvRoutes.js         # Định tuyến /api/ctvs/*, /api/drivers, /api/regions
│       ├── reportRoutes.js      # Định tuyến /api/reports/*
│       ├── networkRoutes.js     # Định tuyến /api/network/*
│       ├── quickPurchaseRoutes.js # Định tuyến /api/quick-purchase/*
│       ├── systemRoutes.js      # Định tuyến /api/system/*
│       └── index.js             # Gom tất cả routes vào router trung tâm
├── public/                      # [TẦNG VIEW - V] Frontend Single-Page App (SPA)
│   ├── index.html               # Giao diện chính ứng dụng
│   ├── css/styles.css           # Cấu trúc CSS & Design System
│   └── js/                      # JavaScript Frontend Logic
│       ├── app.js               # Main Controller khởi tạo SPA
│       ├── api.js               # Client HTTP API Service
│       ├── store.js             # Quản lý State toàn cục Client
│       └── components/          # Giao diện thành phần (Dashboard, Đơn hàng, Kho, CTV, Admin)
├── scripts/                     # KỊCH BẢN TỰ ĐỘNG & ĐỒNG BỘ
│   ├── deploy-vps.sh            # Script cài đặt 1-click trên VPS Linux (Ubuntu/Debian)
│   ├── sync-to-vps.bat          # Script 1-click đồng bộ code từ Windows Local lên VPS Linux
│   └── test-db.js               # Script kiểm tra kết nối Database
├── .env.example                 # Mẫu cấu hình môi trường cho VPS Linux & Local
├── ecosystem.config.js          # File cấu hình PM2 Process Manager cho VPS Linux
├── nginx.conf.example           # File mẫu Nginx Reverse Proxy & SSL Certificate
├── schema.sql                   # Khởi tạo cấu trúc bảng MySQL Database
├── database-mysql.js            # Engine MySQL Connection Pool & Query Executor
├── database.js                  # Engine JSON File Storage Fallback
└── server.js                    # Tệp khởi chạy chính của ứng dụng Node.js (Bootstrap)
```

---

## 🤖 3. HƯỚNG DẪN CHO AI KHI CHỈNH SỬA / THÊM TÍNH NĂNG MỚI (FOR AI)

Nếu bạn là một **AI Agent** nhận được yêu cầu nâng cấp hoặc thêm tính năng mới cho ứng dụng này, hãy tuân theo đúng quy trình 4 bước chuẩn MVC dưới đây:

### 🔹 Bước 1: Thêm phương thức truy vấn dữ liệu vào Tầng Model (`src/models/`)
- Mở tệp Model phù hợp (ví dụ: `ProductModel.js`, `OrderModel.js`, `UserModel.js`...).
- Viết `static async` method để xử lý truy vấn MySQL (thông qua `dbMySQL`) và thêm xử lý `try/catch` fallback sang JSON DB (`dbJSON`) nếu MySQL gặp sự cố.

### 🔹 Bước 2: Thêm hàm xử lý nghiệp vụ vào Tầng Controller (`src/controllers/`)
- Mở tệp Controller tương ứng (ví dụ: `productController.js`, `orderController.js`...).
- Đọc tham số từ `req.body`, `req.params`, hoặc `req.query`.
- Kiểm tra tính hợp lệ của dữ liệu đầu vào (Validation).
- Gọi phương thức ở Tầng Model.
- Trả về JSON Response chuẩn format: `{ success: true, message: '...', data: ... }`.

### 🔹 Bước 3: Khai báo Endpoint API ở Tầng Route (`src/routes/`)
- Mở tệp Route tương ứng (ví dụ: `productRoutes.js`, `orderRoutes.js`...).
- Khai báo đường dẫn URL và liên kết với hàm ở Controller:
  ```js
  router.post('/path', ControllerName.methodName);
  ```

### 🔹 Bước 4: Gọi API ở Frontend View (`public/js/api.js` & `public/js/components/`)
- Thêm function gọi API trong `public/js/api.js`.
- Cập nhật giao diện component trong `public/js/components/` để tương tác với người dùng.

---

## 🔄 4. HƯỚNG DẪN ĐỒNG BỘ CODE TỪ MÁY TÍNH CÁ NHÂN LÊN VPS LINUX

Có **2 cách dễ dàng** để đẩy thay đổi từ máy tính cá nhân (Local) lên VPS Linux:

### 🌟 Cách 1: Bấm nút trên Giao diện Admin Web (1-Click Update)
1. Đăng nhập với tài khoản **Quản trị viên (Admin)**.
2. Vào mục **Quản Lý Hệ Thống / Tài Khoản**.
3. Bấm nút **"🔄 Đồng bộ & Cập nhật Code VPS"**.
4. Server VPS sẽ tự động chạy `git pull` và `pm2 reload sales-app` tức thì mà không gián đoạn người dùng.

### 💻 Cách 2: Chạy câu lệnh Script từ Máy tính Cá nhân
Trực tiếp trong cửa sổ dòng lệnh tại máy local (Windows), bạn có thể chạy một trong hai câu lệnh:
```bash
npm run sync:vps
```
Hoặc:
```cmd
scripts\sync-to-vps.bat
```
Script sẽ tự động:
1. `git add .` và `git commit` các thay đổi local.
2. `git push` lên Git Repository.
3. Gửi request tới VPS để VPS tự nâng cấp bản mới nhất.

---

## 🐧 5. QUY TRÌNH TRIỂN KHAI VẬN HÀNH TRÊN VPS LINUX

### Bước 1: Upload / Git Clone code lên VPS Linux
```bash
git clone <URL_REPOSITORY_CỦA_BẠN> /var/www/sales-app
cd /var/www/sales-app
```

### Bước 2: Tạo tệp cấu hình môi trường `.env`
```bash
cp .env.example .env
nano .env
```
*(Điền thông tin MySQL DB, Port 3000, Host 0.0.0.0...)*

### Bước 3: Chạy script tự động cài đặt 1-Click
```bash
bash scripts/deploy-vps.sh
```

### Bước 4: Cấu hình Nginx làm Reverse Proxy (Tùy chọn Mở SSL Domain)
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/sales-app
sudo ln -s /etc/nginx/sites-available/sales-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Các câu lệnh quản lý PM2 thường dùng trên VPS Linux:
- Xem trạng thái ứng dụng: `pm2 status`
- Xem nhật ký hoạt động (Logs): `pm2 logs sales-app`
- Reload ứng dụng không gián đoạn: `pm2 reload sales-app`
- Khởi động lại: `pm2 restart sales-app`

---

## 🛡️ 6. NGUYÊN TẮC BẢO TRÌ BẢO MẬT & DỰ PHÒNG DỮ LIỆU
1. **Hybrid Database**: Đảm bảo tệp `data/db.json` luôn được lưu trữ dự phòng tự động. Nếu MySQL bị tắt hoặc lỗi trên VPS, hệ thống vẫn duy trì hoạt động mượt mà với JSON DB.
2. **Quản lý phiên bản**: Tất cả các cập nhật tính năng mới phải được commit qua Git trước khi tiến hành đồng bộ lên môi trường VPS Production.
