-- Khởi tạo Database cho XAMPP MySQL / phpMyAdmin
CREATE DATABASE IF NOT EXISTS `smart_inventory` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_inventory`;

-- 1. Bảng Sản phẩm (Products)
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'Chung',
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `original_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `promo_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `stock` INT NOT NULL DEFAULT 0,
  `reserved` INT NOT NULL DEFAULT 0,
  `points` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(20) DEFAULT 'Cái',
  `image_url` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Khu vực (Regions)
CREATE TABLE IF NOT EXISTS `regions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Người Dùng (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('CUSTOMER', 'CTV', 'DRIVER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `region` VARCHAR(100) DEFAULT 'Hà Nội',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Cộng Tác Viên (CTVs)
CREATE TABLE IF NOT EXISTS `ctvs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `region` VARCHAR(100) NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `total_sales` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `completed_orders_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Tài Xế (Drivers)
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `vehicle` VARCHAR(100) DEFAULT 'Xe máy',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Đơn Hàng (Orders)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `ctv_id` VARCHAR(50) NOT NULL,
  `ctv_name` VARCHAR(100) NOT NULL,
  `ctv_region` VARCHAR(100) NOT NULL,
  `driver_id` VARCHAR(50),
  `driver_name` VARCHAR(100),
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `address` TEXT NOT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `total_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `profit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `earned_points` INT NOT NULL DEFAULT 0,
  `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `estimated_delivery_time` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('PENDING_DELIVERY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_DELIVERY',
  `cash_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `transfer_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `debt_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `payment_note` TEXT,
  `cancel_reason` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `approved_at` DATETIME,
  `delivered_at` DATETIME,
  `cancelled_at` DATETIME,
  FOREIGN KEY (`ctv_id`) REFERENCES `ctvs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Chi Tiết Đơn Hàng (Order Items)
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `points_per_unit` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Nhật Ký Giao Dịch Kho (Stock Transactions)
CREATE TABLE IF NOT EXISTS `stock_transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `type` ENUM('IMPORT', 'EXPORT', 'RESERVE', 'UNRESERVE', 'DEDUCT') NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `qty` INT NOT NULL,
  `note` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
INSERT IGNORE INTO `regions` (`id`, `name`) VALUES
(1, 'Hà Nội'),
(2, 'TP. Hồ Chí Minh'),
(3, 'Đà Nẵng'),
(4, 'Hải Phòng'),
(5, 'Cần Thơ');

INSERT IGNORE INTO `products` (`id`, `code`, `name`, `category`, `cost_price`, `selling_price`, `stock`, `reserved`, `points`, `unit`) VALUES
('prod-1', 'SP001', 'Tai nghe không dây Premium Pro', 'Điện tử', 280000.00, 550000.00, 50, 0, 50, 'Cái'),
('prod-2', 'SP002', 'Đồng hồ thông minh FitTrack', 'Phụ kiện', 450000.00, 890000.00, 30, 0, 80, 'Cái'),
('prod-3', 'SP003', 'Sạc dự phòng Ultra Power 20.000mAh', 'Điện tử', 180000.00, 380000.00, 100, 0, 35, 'Cái'),
('prod-4', 'SP004', 'Bàn phím cơ không dây SlimRGB', 'Máy tính', 600000.00, 1250000.00, 20, 0, 120, 'Cái');

INSERT IGNORE INTO `users` (`id`, `phone`, `password`, `name`, `role`, `region`) VALUES
('usr-1', '0901234567', '123456', 'Nguyễn Văn An', 'CTV', 'Hà Nội'),
('usr-2', '0912345678', '123456', 'Lê Thị Bích', 'CTV', 'TP. Hồ Chí Minh'),
('usr-3', '0923456789', '123456', 'Trần Minh Cường', 'CTV', 'Hà Nội'),
('usr-4', '0934567890', '123456', 'Phạm Thu Hà', 'CTV', 'Đà Nẵng'),
('usr-drv1', '0988111222', '123456', 'Hoàng Văn Tuấn', 'DRIVER', 'Hà Nội'),
('usr-drv2', '0988333444', '123456', 'Nguyễn Tiến Đạt', 'DRIVER', 'TP. Hồ Chí Minh'),
('usr-admin-hoa', '0979366316', 'TH2532621991', 'Nguyễn Thanh Hoà', 'ADMIN', 'Hà Nội');

INSERT IGNORE INTO `ctvs` (`id`, `name`, `phone`, `region`, `points`, `total_sales`, `completed_orders_count`) VALUES
('ctv-1', 'Nguyễn Văn An', '0901234567', 'Hà Nội', 250, 2750000.00, 5),
('ctv-2', 'Lê Thị Bích', '0912345678', 'TP. Hồ Chí Minh', 420, 4800000.00, 8),
('ctv-3', 'Trần Minh Cường', '0923456789', 'Hà Nội', 180, 1980000.00, 3),
('ctv-4', 'Phạm Thu Hà', '0934567890', 'Đà Nẵng', 310, 3400000.00, 6);

INSERT IGNORE INTO `drivers` (`id`, `name`, `phone`, `vehicle`) VALUES
('drv-1', 'Hoàng Văn Tuấn', '0988111222', 'Xe máy (29F1-123.45)'),
('drv-2', 'Nguyễn Tiến Đạt', '0988333444', 'Xe bán tải (51D-987.65)');

-- 8. Bảng Mua Hàng Nhanh (Quick Purchases / Callbacks)
CREATE TABLE IF NOT EXISTS `quick_purchases` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customer_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `product_name` VARCHAR(255) DEFAULT '',
  `note` TEXT,
  `status` ENUM('PENDING', 'CONTACTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
