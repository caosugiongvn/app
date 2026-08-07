# QUY TẮC PHÁT TRIỂN ỨNG DỤNG (CLAUDE.MD)

Tài liệu này định nghĩa các quy chuẩn, nguyên tắc thiết kế và quy trình phát triển dành cho ứng dụng **Quản Lý Bán Hàng & Tồn Kho (Smart Inventory)** và các dự án phát triển ứng dụng web tương tự.

---

## 1. Kiến Trúc & Công Nghệ Chuẩn (Tech Stack)

- **Backend**: Node.js, Express.js.
- **Database**: XAMPP MySQL Server (`smart_inventory`). Sử dụng thư viện `mysql2/promise` với Connection Pool.
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Modular CSS / Modern CSS Variables).
- **Mạng / Truy Cập Từ Xa**: Đảm bảo hỗ trợ truy cập mạng nội bộ LAN / Wi-Fi, tự động hiển thị địa chỉ IP và mã QR code quét từ điện thoại.
- **Cấu Trúc Thư Mục**:
  - `routes/`: Chứa các API routes phân theo tài nguyên (`productRoutes.js`, `orderRoutes.js`, `ctvRoutes.js`, `reportRoutes.js`, `networkRoutes.js`).
  - `public/`: Chứa tài nguyên tĩnh Frontend (HTML, CSS, JS client, images).
  - `config.js`: Cấu hình tập trung (Port, Host, MySQL Config, IP address loader).
  - `database-mysql.js`: Engine kết nối và tương tác MySQL Pool.
  - `schema.sql`: Script định nghĩa bảng & dữ liệu khởi tạo.

---

## 2. Quy Tắc Thiết Kế Giao Diện (UI/UX Standards)

1. **Thẩm Mỹ Hiện Đại (Rich Aesthetics)**:
   - Sử dụng bảng màu hiện đại (Dark Mode / Sleek Light Mode, HSL Color System, CSS Gradients).
   - Tận dụng hiệu ứng Bo góc (Border Radius), Shadow nổi, Glassmorphism và hiệu ứng chuyển cảnh mượt mà (Transitions/Animations).
   - Sử dụng Typography hiện đại (như Inter, Roboto, Outfit...).

2. **Tối Ưu Cho Thiết Bị Di Động (Responsive & Mobile-First)**:
   - Giao diện phải hiển thị hoàn hảo trên điện thoại thông minh, máy tính bảng và màn hình máy tính desktop.
   - Thao tác cảm ứng dễ dàng (Kích thước nút bấm tối thiểu 44px x 44px).

3. **Không Dùng Placeholder Rác**:
   - Dùng icon SVG chuẩn (Lucide Icons, FontAwesome, hoặc Inline SVG).
   - Dữ liệu demo phải mang tính thực tế, không dùng chữ vô nghĩa (Lorem Ipsum) gây mất thẩm mỹ.

---

## 3. Quy Tắc Lập Trình Backend & API (Coding Standards)

1. **Chuẩn RESTful API**:
   - URL tài nguyên dạng số nhiều: `/api/products`, `/api/orders`, `/api/ctv`.
   - Phản hồi JSON luôn thống nhất cấu trúc:
     - Thành công: `{ "success": true, "data": ... }` hoặc danh sách trực tiếp.
     - Thất bại: `{ "success": false, "message": "Mô tả lỗi" }` với HTTP Status Code phù hợp (400, 404, 500).

2. **Bảo Mật Cơ Sở Dữ Liệu**:
   - Luôn sử dụng **Prepared Statements** (`pool.execute()` hoặc truyền tham số dạng `?`) để chống tấn công SQL Injection.
   - Không bao giờ nối chuỗi trực tiếp SQL với dữ liệu đầu vào từ người dùng.

3. **Xử Lý Lỗi Tập Trung (Error Handling)**:
   - Mọi hàm `async` trong Controller/Route phải được bọc trong `try...catch`.
   - Ghi log lỗi chi tiết phía Server (`console.error`), nhưng trả về thông báo an toàn, thân thiện cho Client.
   - Không nuốt lỗi ngầm (silent fail).

---

## 4. Quy Tắc Quản Lý Database (XAMPP MySQL)

1. **Đồng Bộ Schema**:
   - Khi thêm mới hoặc thay đổi bảng, luôn cập nhật file [`schema.sql`](file:///d:/Xampp/htdocs/app/schema.sql) đồng thời kiểm tra lại hàm khởi tạo `initDatabase()` trong [`database-mysql.js`](file:///d:/Xampp/htdocs/app/database-mysql.js).
2. **Kiểm Tra Kết Nối Tự Động**:
   - Khi khởi động server, luôn kiểm tra xem MySQL Server trên XAMPP đã được BẬT hay chưa và in thông báo hướng dẫn cụ thể cho người dùng nếu mất kết nối.

---

## 5. Quy Trình Kiểm Thử & Xác Nhận (Verification Workflow)

1. **Chạy Server Về Trạng Thái Sẵn Sàng**:
   - Kiểm tra khởi động bằng `npm start` hoặc `npm run dev`.
   - Đảm bảo không có lỗi crash server hay unhandled rejections.
2. **Kiểm Tra Kết Nối Mạng**:
   - Đảm bảo API route `/api/network-info` hoặc console log hiển thị chính xác IP LAN của máy để điện thoại cùng Wi-Fi truy cập được.
3. **Không Báo Hoàn Thành Khi Chưa Test**:
   - Luôn thực hiện chạy thử tính năng hoặc API trước khi kết thúc task.
