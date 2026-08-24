const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class MySQLDatabaseEngine {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  /**
   * Khởi tạo kết nối Pool & Tự tạo Database + Tables nếu chưa có trên XAMPP
   */
  async initDatabase() {
    if (this.initialized && this.pool) return true;

    try {
      // 1. Kết nối với MySQL Server (không chỉ định database trước) để tạo DB nếu chưa có
      const tempConnection = await mysql.createConnection({
        host: config.MYSQL_CONFIG.host,
        port: config.MYSQL_CONFIG.port,
        user: config.MYSQL_CONFIG.user,
        password: config.MYSQL_CONFIG.password
      });

      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.MYSQL_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await tempConnection.end();

      // 2. Tạo Pool kết nối chính thức vào database `smart_inventory`
      this.pool = mysql.createPool(config.MYSQL_CONFIG);

      // 3. Đọc và thực thi schema.sql để tạo bảng & dữ liệu mẫu nếu bảng chưa tồn tại
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sqlScript = fs.readFileSync(schemaPath, 'utf8');
        const sqlStatements = sqlScript
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));

        try { await this.pool.query('SET FOREIGN_KEY_CHECKS = 0;'); } catch (e) {}

        for (const stmt of sqlStatements) {
          try {
            await this.pool.query(stmt);
          } catch (err) {
            // Bỏ qua lỗi duplicate table/insert khi đã tồn tại
          }
        }

        try { await this.pool.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch (e) {}

        // Tự động đảm bảo tạo bảng users nếu chưa có trong MySQL
        try {
          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS \`users\` (
              \`id\` VARCHAR(50) PRIMARY KEY,
              \`phone\` VARCHAR(20) NOT NULL UNIQUE,
              \`password\` VARCHAR(255) NOT NULL,
              \`name\` VARCHAR(100) NOT NULL,
              \`role\` ENUM('CUSTOMER', 'CTV', 'DRIVER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
              \`region\` VARCHAR(100) DEFAULT 'Hà Nội',
              \`ctv_request\` VARCHAR(50) NOT NULL DEFAULT 'NONE',
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `);
        } catch (e) {}

        // Tự động đảm bảo tạo bảng commission_settings nếu chưa có trong MySQL
        try {
          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS \`commission_settings\` (
              \`id\` INT PRIMARY KEY DEFAULT 1,
              \`top_point_value\` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
              \`standard_point_value\` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
              \`top_rate\` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
              \`standard_rate\` DECIMAL(5,2) NOT NULL DEFAULT 8.00,
              \`top_bonus_multiplier\` DECIMAL(5,2) NOT NULL DEFAULT 1.50,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `);
          await this.pool.query(`
            INSERT IGNORE INTO commission_settings (id, top_point_value, standard_point_value, top_rate, standard_rate, top_bonus_multiplier)
            VALUES (1, 1000.00, 500.00, 15.00, 8.00, 1.50);
          `);
        } catch (e) {}

        // Migration: Tự động bổ sung các cột mới nếu chưa có trong DB MySQL sẵn
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN estimated_delivery_time VARCHAR(255) DEFAULT NULL;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN approved_at DATETIME DEFAULT NULL;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE users ADD COLUMN ctv_request VARCHAR(50) NOT NULL DEFAULT 'NONE';`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN cash_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN transfer_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN debt_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE orders ADD COLUMN payment_note TEXT;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE products ADD COLUMN original_price DECIMAL(15, 2) NOT NULL DEFAULT 0;`);
        } catch (e) {}
        try {
          await this.pool.query(`ALTER TABLE products ADD COLUMN promo_price DECIMAL(15, 2) NOT NULL DEFAULT 0;`);
        } catch (e) {}

        // Auto-seed & ensure Super Admin (Nguyễn Thanh Hoà - 0979366316) is ADMIN
        try {
          await this.pool.query('DELETE FROM users WHERE phone = "0999999999" OR id = "usr-admin";');
          await this.pool.query(`
            INSERT IGNORE INTO users (id, phone, password, name, role, region, ctv_request) VALUES
            ('usr-1', '0901234567', '123456', 'Nguyễn Văn An', 'CTV', 'Hà Nội', 'APPROVED'),
            ('usr-2', '0912345678', '123456', 'Lê Thị Bích', 'CTV', 'TP. Hồ Chí Minh', 'APPROVED'),
            ('usr-3', '0923456789', '123456', 'Trần Minh Cường', 'CTV', 'Hà Nội', 'APPROVED'),
            ('usr-4', '0934567890', '123456', 'Phạm Thu Hà', 'CTV', 'Đà Nẵng', 'APPROVED'),
            ('usr-drv1', '0988111222', '123456', 'Hoàng Văn Tuấn', 'DRIVER', 'Hà Nội', 'NONE'),
            ('usr-drv2', '0988333444', '123456', 'Nguyễn Tiến Đạt', 'DRIVER', 'TP. Hồ Chí Minh', 'NONE'),
            ('usr-admin-hoa', '0979366316', 'TH2532621991', 'Nguyễn Thanh Hoà', 'ADMIN', 'Hà Nội', 'NONE');
          `);
          await this.pool.query('UPDATE users SET role = "ADMIN", ctv_request = "NONE" WHERE phone = "0979366316";');

          // Seed complete agricultural products catalog from danchigialai.com
          await this.pool.query(`
            INSERT IGNORE INTO products (id, code, name, category, cost_price, original_price, promo_price, selling_price, stock, reserved, points, unit) VALUES
            ('prod-cs209', 'CS001', 'Cây giống Cao Su 209 (Bầu 1 Tầng Lá)', 'Cây Giống', 15000, 35000, 0, 35000, 1000, 0, 5, 'Cây'),
            ('prod-trs1', 'CP001', 'Cà Phê Giống Thực Sinh TRS1 (Bầu)', 'Cây Giống', 2000, 4500, 0, 4500, 10000, 0, 2, 'Cây'),
            ('prod-ts5', 'CP002', 'Cà Phê Giống Ghép Xanh Lún TS5 (Gốc Mít)', 'Cây Giống', 8000, 18000, 16000, 16000, 3000, 0, 8, 'Cây'),
            ('prod-sr001', 'SR001', 'Cây Giống Sầu Riêng Ri6 (Gốc Ghép 2 Năm)', 'Cây Giống', 60000, 120000, 105000, 105000, 500, 0, 15, 'Cây'),
            ('prod-pb001', 'PB001', 'Phân Bón NPK 16-16-8 Cao Cấp (Bao 50kg)', 'Phân Bón', 450000, 680000, 650000, 650000, 250, 0, 30, 'Bao'),
            ('prod-pb002', 'PB002', 'Phân Bón Hữu Cơ Sinh Học K-Humate (Can 5L)', 'Phân Bón', 220000, 380000, 0, 380000, 350, 0, 20, 'Can'),
            ('prod-bv001', 'BV001', 'Thuốc Trừ Bệnh Nấm Phấn Trắng Ridomil (Gói 100g)', 'Thuốc BVTV', 42000, 68000, 65000, 65000, 800, 0, 5, 'Gói'),
            ('prod-bv002', 'BV002', 'Thuốc Trừ Sâu Sinh Học Chống Rệp Sáp (Chai 500ml)', 'Thuốc BVTV', 75000, 135000, 120000, 120000, 600, 0, 10, 'Chai'),
            ('prod-vt001', 'VT001', 'Túi Bầu Đất Ươm Cây Giống Nông Nghiệp (Ký 1kg)', 'Vật Tư Nông Nghiệp', 14000, 25000, 0, 25000, 5000, 0, 2, 'Kg'),
            ('prod-vt002', 'VT002', 'Hệ Thống Dây Tưới Nhỏ Giọt Nông Nghiệp (Cuộn 100m)', 'Vật Tư Nông Nghiệp', 280000, 480000, 450000, 450000, 150, 0, 25, 'Cuộn')
          ;`);
        } catch (e) {}
      }

      this.initialized = true;
      console.log('✅ Đã kết nối & đồng bộ thành công XAMPP MySQL Database:', config.MYSQL_CONFIG.database);
      return true;
    } catch (error) {
      console.error('❌ Lỗi kết nối XAMPP MySQL Server:', error.message);
      console.error('👉 Vui lòng đảm bảo bạn đã mở XAMPP Control Panel và bấm START module MySQL!');
      return false;
    }
  }

  // --- NGƯỜI DÙNG (USERS) & AUTHENTICATION ---
  async findUserByPhone(phone) {
    await this.initDatabase();
    if (!this.pool) return null;
    const [rows] = await this.pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) return null;
    const u = rows[0];
    return {
      id: u.id,
      phone: u.phone,
      password: u.password,
      name: u.name,
      role: u.role,
      region: u.region,
      ctvRequest: u.ctv_request || 'NONE',
      createdAt: u.created_at
    };
  }

  async getAllUsers() {
    await this.initDatabase();
    if (!this.pool) return [];
    const [rows] = await this.pool.query('SELECT id, phone, name, role, region, ctv_request, created_at FROM users ORDER BY created_at DESC');
    return rows.map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      region: u.region,
      ctvRequest: u.ctv_request || 'NONE',
      createdAt: u.created_at
    }));
  }

  async createUser({ phone, password, name, role = 'CUSTOMER', region = 'Chưa phân công' }) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    
    // Kiểm tra trùng SĐT
    const existing = await this.findUserByPhone(phone);
    if (existing) {
      throw new Error('Số điện thoại này đã được đăng ký tài khoản!');
    }

    const userId = role === 'CTV' ? `ctv-${Date.now()}` : `usr-${Date.now()}`;
    const ctvReq = role === 'CTV' ? 'APPROVED' : 'NONE';
    await this.pool.query(
      'INSERT INTO users (id, phone, password, name, role, region, ctv_request) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, phone, password, name, role, region, ctvReq]
    );

    // Nếu người dùng chọn vai trò là CTV, tự động tạo luôn hồ sơ CTV tương ứng
    if (role === 'CTV') {
      const [ctvCheck] = await this.pool.query('SELECT * FROM ctvs WHERE phone = ?', [phone]);
      if (ctvCheck.length === 0) {
        await this.pool.query(
          'INSERT INTO ctvs (id, name, phone, region, points, total_sales, completed_orders_count) VALUES (?, ?, ?, ?, 0, 0, 0)',
          [userId, name, phone, region]
        );
      }
    }

    return {
      id: userId,
      phone,
      name,
      role,
      region,
      ctvRequest: ctvReq
    };
  }

  async applyCTV(userId) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');

    await this.pool.query(
      'UPDATE users SET ctv_request = ? WHERE id = ?',
      ['PENDING', userId]
    );
    return true;
  }

  async updateUserPassword(phone, newPassword) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [result] = await this.pool.query(
      'UPDATE users SET password = ? WHERE phone = ?',
      [newPassword, phone]
    );
    return result.affectedRows > 0;
  }

  async updateUserRoleAndRegion(userId, role, region) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');

    const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('Không tìm thấy người dùng');
    const user = rows[0];

    const ctvReqStatus = role === 'CTV' ? 'APPROVED' : user.ctv_request;
    await this.pool.query(
      'UPDATE users SET role = ?, region = ?, ctv_request = ? WHERE id = ?',
      [role, region, ctvReqStatus, userId]
    );

    // Nếu vai trò chuyển thành CTV, cập nhật hoặc tạo mới bản ghi CTV
    if (role === 'CTV') {
      const [ctvRows] = await this.pool.query('SELECT * FROM ctvs WHERE phone = ? OR id = ?', [user.phone, userId]);
      if (ctvRows.length === 0) {
        await this.pool.query(
          'INSERT INTO ctvs (id, name, phone, region, points, total_sales, completed_orders_count) VALUES (?, ?, ?, ?, 0, 0, 0)',
          [userId, user.name, user.phone, region]
        );
      } else {
        await this.pool.query(
          'UPDATE ctvs SET region = ?, name = ? WHERE phone = ? OR id = ?',
          [region, user.name, user.phone, userId]
        );
      }
    }

    return {
      id: userId,
      name: user.name,
      phone: user.phone,
      role,
      region,
      ctvRequest: ctvReqStatus
    };
  }

  // --- SẢN PHẨM & TỒN KHO ---
  async getProducts() {
    await this.initDatabase();
    const [rows] = await this.pool.query('SELECT *, (stock - reserved) AS available FROM products ORDER BY created_at DESC');
    return rows.map(r => {
      const orig = parseFloat(r.original_price || 0) || parseFloat(r.selling_price || 0);
      const promo = parseFloat(r.promo_price || 0);
      const effSelling = promo > 0 ? promo : (parseFloat(r.selling_price || 0) || orig);
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        costPrice: parseFloat(r.cost_price || 0),
        originalPrice: orig,
        promoPrice: promo,
        sellingPrice: effSelling,
        stock: parseInt(r.stock || 0),
        reserved: parseInt(r.reserved || 0),
        available: parseInt(r.available || 0),
        points: parseInt(r.points || 0),
        unit: r.unit || 'Cái'
      };
    });
  }

  async addProduct(data) {
    await this.initDatabase();
    const id = `prod-${Date.now()}`;
    const code = data.code || `SP${Math.floor(100 + Math.random() * 900)}`;
    const name = data.name;
    const category = data.category || 'Chung';
    const costPrice = parseFloat(data.costPrice || 0);
    const originalPrice = parseFloat(data.originalPrice || data.sellingPrice || 0);
    const promoPrice = parseFloat(data.promoPrice || 0);
    const sellingPrice = promoPrice > 0 ? promoPrice : (parseFloat(data.sellingPrice || 0) || originalPrice);
    const stock = parseInt(data.stock || 0);
    const points = parseInt(data.points || 0);
    const unit = data.unit || 'Cái';

    await this.pool.query(
      `INSERT INTO products (id, code, name, category, cost_price, original_price, promo_price, selling_price, stock, reserved, points, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, code, name, category, costPrice, originalPrice, promoPrice, sellingPrice, stock, points, unit]
    );

    if (stock > 0) {
      await this.pool.query(
        `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
         VALUES (?, 'IMPORT', ?, ?, ?, 'Khởi tạo sản phẩm mới')`,
        [`tx-${Date.now()}`, id, name, stock]
      );
    }

    return { id, code, name, category, costPrice, originalPrice, promoPrice, sellingPrice, stock, reserved: 0, available: stock, points, unit };
  }

  async importStock(productId, qty, note) {
    await this.initDatabase();
    const importQty = parseInt(qty);
    await this.pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [importQty, productId]);

    const [prods] = await this.pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    const product = prods[0];

    await this.pool.query(
      `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
       VALUES (?, 'IMPORT', ?, ?, ?, ?)`,
      [`tx-${Date.now()}`, productId, product.name, importQty, note || 'Nhập kho bổ sung']
    );

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      stock: parseInt(product.stock),
      reserved: parseInt(product.reserved),
      available: parseInt(product.stock - product.reserved),
      unit: product.unit
    };
  }

  async updateProduct(id, updateData) {
    await this.initDatabase();
    if (!this.pool) return null;
    const { code, name, category, costPrice, originalPrice, promoPrice, sellingPrice, stock, points, unit } = updateData;

    const [existing] = await this.pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) return null;
    const current = existing[0];

    const newCode = code !== undefined && String(code).trim() !== '' ? String(code).trim() : current.code;
    const newName = name !== undefined && String(name).trim() !== '' ? String(name).trim() : current.name;
    const newCategory = category !== undefined ? category : current.category;
    const newCostPrice = costPrice !== undefined ? parseFloat(costPrice) : parseFloat(current.cost_price || 0);
    const newOriginalPrice = originalPrice !== undefined ? parseFloat(originalPrice) : parseFloat(current.original_price || current.selling_price || 0);
    const newPromoPrice = promoPrice !== undefined ? parseFloat(promoPrice) : parseFloat(current.promo_price || 0);
    
    let newSellingPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : parseFloat(current.selling_price || 0);
    if (promoPrice !== undefined || originalPrice !== undefined) {
      newSellingPrice = newPromoPrice > 0 ? newPromoPrice : (newOriginalPrice > 0 ? newOriginalPrice : newSellingPrice);
    }

    const newStock = stock !== undefined ? parseInt(stock) : parseInt(current.stock || 0);
    const newPoints = points !== undefined ? parseInt(points) : parseInt(current.points || 0);
    const newUnit = unit !== undefined ? unit : (current.unit || 'Cái');

    await this.pool.query(
      `UPDATE products SET code = ?, name = ?, category = ?, cost_price = ?, original_price = ?, promo_price = ?, selling_price = ?, stock = ?, points = ?, unit = ? WHERE id = ?`,
      [newCode, newName, newCategory, newCostPrice, newOriginalPrice, newPromoPrice, newSellingPrice, newStock, newPoints, newUnit, id]
    );

    if (stock !== undefined && parseInt(stock) !== parseInt(current.stock)) {
      const diff = parseInt(stock) - parseInt(current.stock);
      await this.pool.query(
        `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
         VALUES (?, ?, ?, ?, ?, 'Admin điều chỉnh số lượng trực tiếp trong tồn kho')`,
        [`tx-${Date.now()}`, diff > 0 ? 'IMPORT' : 'EXPORT', id, newName, Math.abs(diff)]
      );
    }

    return {
      id,
      code: newCode,
      name: newName,
      category: newCategory,
      costPrice: newCostPrice,
      originalPrice: newOriginalPrice,
      promoPrice: newPromoPrice,
      sellingPrice: newSellingPrice,
      stock: newStock,
      reserved: parseInt(current.reserved || 0),
      available: newStock - parseInt(current.reserved || 0),
      points: newPoints,
      unit: newUnit
    };
  }


  // --- CỘNG TÁC VIÊN & KHU VỰC ---
  async getCtvs() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [rows] = await this.pool.query('SELECT * FROM ctvs ORDER BY points DESC');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      region: r.region,
      points: parseInt(r.points),
      totalSales: parseFloat(r.total_sales),
      completedOrdersCount: parseInt(r.completed_orders_count)
    }));
  }

  async getDrivers() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [rows] = await this.pool.query('SELECT * FROM drivers ORDER BY id ASC');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      vehicle: r.vehicle
    }));
  }

  async getRegions() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [rows] = await this.pool.query('SELECT name FROM regions ORDER BY id ASC');
    return rows.map(r => r.name);
  }

  async getLeaderboard(region = 'ALL') {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    let query = 'SELECT * FROM ctvs ';
    const params = [];

    if (region && region !== 'ALL') {
      query += 'WHERE region = ? ';
      params.push(region);
    }

    query += 'ORDER BY points DESC, total_sales DESC';
    const [rows] = await this.pool.query(query, params);

    return rows.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      name: r.name,
      phone: r.phone,
      region: r.region,
      points: parseInt(r.points),
      totalSales: parseFloat(r.total_sales),
      completedOrdersCount: parseInt(r.completed_orders_count)
    }));
  }

  // --- ĐƠN HÀNG & TẠM TRỪ KHO / GIAO HÀNG / HỦY ĐƠN ---
  async getOrders(filters = {}) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    let query = 'SELECT * FROM orders ';
    const conditions = [];
    const params = [];

    if (filters.ctvId) { conditions.push('ctv_id = ?'); params.push(filters.ctvId); }
    if (filters.driverId) { conditions.push('driver_id = ?'); params.push(filters.driverId); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    if (filters.region) { conditions.push('ctv_region = ?'); params.push(filters.region); }

    if (conditions.length > 0) {
      query += 'WHERE ' + conditions.join(' AND ') + ' ';
    }
    query += 'ORDER BY created_at DESC';

    const [orders] = await this.pool.query(query, params);

    const result = [];
    for (const o of orders) {
      const [items] = await this.pool.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      result.push({
        id: o.id,
        ctvId: o.ctv_id,
        ctvName: o.ctv_name,
        ctvRegion: o.ctv_region,
        driverId: o.driver_id,
        driverName: o.driver_name,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        address: o.address,
        totalAmount: parseFloat(o.total_amount),
        totalCost: parseFloat(o.total_cost),
        profit: parseFloat(o.profit),
        earnedPoints: parseInt(o.earned_points),
        approvalStatus: o.approval_status || 'PENDING',
        estimatedDeliveryTime: o.estimated_delivery_time || '',
        status: o.status,
        cashAmount: parseFloat(o.cash_amount || 0),
        transferAmount: parseFloat(o.transfer_amount || 0),
        debtAmount: parseFloat(o.debt_amount || 0),
        paymentNote: o.payment_note || '',
        cancelReason: o.cancel_reason,
        createdAt: o.created_at,
        approvedAt: o.approved_at,
        deliveredAt: o.delivered_at,
        cancelledAt: o.cancelled_at,
        items: items.map(i => ({
          productId: i.product_id,
          productName: i.product_name,
          qty: parseInt(i.qty),
          costPrice: parseFloat(i.cost_price),
          sellingPrice: parseFloat(i.selling_price),
          pointsPerUnit: parseInt(i.points_per_unit)
        }))
      });
    }

    return result;
  }

  async createOrder(data) {
    await this.initDatabase();
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [ctvRows] = await conn.query('SELECT * FROM ctvs WHERE id = ?', [data.ctvId]);
      if (ctvRows.length === 0) throw new Error('Không tìm thấy CTV');
      const ctv = ctvRows[0];

      let driverName = 'Chưa phân công';
      if (data.driverId) {
        const [drvRows] = await conn.query('SELECT name FROM drivers WHERE id = ?', [data.driverId]);
        if (drvRows.length > 0) driverName = drvRows[0].name;
      }

      const orderItems = [];
      let totalAmount = 0;
      let totalCost = 0;
      let totalPoints = 0;

      for (const item of data.items) {
        const [prodRows] = await conn.query('SELECT *, (stock - reserved) AS available FROM products WHERE id = ?', [item.productId]);
        if (prodRows.length === 0) throw new Error(`Sản phẩm ${item.productId} không tồn tại`);
        const product = prodRows[0];
        const qty = parseInt(item.qty);

        if (qty > parseInt(product.available)) {
          throw new Error(`Sản phẩm "${product.name}" không đủ tồn kho khả dụng (${product.available} < ${qty})`);
        }

        const itemTotalSelling = parseFloat(product.selling_price) * qty;
        const itemTotalCost = parseFloat(product.cost_price) * qty;
        const itemPoints = parseInt(product.points) * qty;

        totalAmount += itemTotalSelling;
        totalCost += itemTotalCost;
        totalPoints += itemPoints;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          qty,
          costPrice: parseFloat(product.cost_price),
          sellingPrice: parseFloat(product.selling_price),
          pointsPerUnit: parseInt(product.points)
        });
      }

      for (const item of orderItems) {
        await conn.query('UPDATE products SET reserved = reserved + ? WHERE id = ?', [item.qty, item.productId]);
        await conn.query(
          `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
           VALUES (?, 'RESERVE', ?, ?, ?, ?)`,
          [`tx-${Date.now()}-${Math.random().toString(36).substring(2,5)}`, item.productId, item.productName, item.qty, `Tạm giữ kho cho đơn CTV ${ctv.name}`]
        );
      }

      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const profit = totalAmount - totalCost;

      await conn.query(
        `INSERT INTO orders (id, ctv_id, ctv_name, ctv_region, driver_id, driver_name, customer_name, customer_phone, address, total_amount, total_cost, profit, earned_points, approval_status, estimated_delivery_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, 'PENDING_DELIVERY')`,
        [orderId, ctv.id, ctv.name, ctv.region, data.driverId || null, driverName, data.customerName, data.customerPhone, data.address, totalAmount, totalCost, profit, totalPoints]
      );

      for (const item of orderItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, product_name, qty, cost_price, selling_price, points_per_unit)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.productName, item.qty, item.costPrice, item.sellingPrice, item.pointsPerUnit]
        );
      }

      await conn.commit();

      return {
        id: orderId,
        ctvId: ctv.id,
        ctvName: ctv.name,
        customerName: data.customerName,
        totalAmount,
        profit,
        earnedPoints: totalPoints,
        approvalStatus: 'PENDING',
        estimatedDeliveryTime: '',
        status: 'PENDING_DELIVERY',
        items: orderItems
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async approveOrder(orderId, { driverId, estimatedDeliveryTime }) {
    await this.initDatabase();
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) throw new Error('Không tìm thấy đơn hàng');
      const order = orderRows[0];

      let driverName = order.driver_name || 'Chưa phân công';
      if (driverId) {
        const [drvRows] = await conn.query('SELECT name FROM drivers WHERE id = ?', [driverId]);
        if (drvRows.length > 0) driverName = drvRows[0].name;
      }

      await conn.query(
        `UPDATE orders 
         SET approval_status = 'APPROVED', driver_id = ?, driver_name = ?, estimated_delivery_time = ?, approved_at = NOW()
         WHERE id = ?`,
        [driverId || order.driver_id, driverName, estimatedDeliveryTime || order.estimated_delivery_time, orderId]
      );

      await conn.commit();
      return {
        id: orderId,
        approvalStatus: 'APPROVED',
        driverId: driverId || order.driver_id,
        driverName,
        estimatedDeliveryTime: estimatedDeliveryTime || order.estimated_delivery_time
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deliverOrder(orderId, paymentData = {}) {
    const cashAmount = parseFloat(paymentData.cashAmount || 0);
    const transferAmount = parseFloat(paymentData.transferAmount || 0);
    const debtAmount = parseFloat(paymentData.debtAmount || 0);
    const paymentNote = paymentData.paymentNote || '';

    await this.initDatabase();
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) throw new Error('Không tìm thấy đơn hàng');
      const order = orderRows[0];

      if (order.status !== 'PENDING_DELIVERY') {
        throw new Error(`Đơn hàng đã ở trạng thái: ${order.status}`);
      }

      const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

      for (const item of items) {
        await conn.query(
          'UPDATE products SET stock = stock - ?, reserved = GREATEST(0, reserved - ?) WHERE id = ?',
          [item.qty, item.qty, item.product_id]
        );

        await conn.query(
          `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
           VALUES (?, 'DEDUCT', ?, ?, ?, ?)`,
          [`tx-${Date.now()}-${Math.random().toString(36).substring(2,5)}`, item.product_id, item.product_name, item.qty, `Chính thức trừ kho giao thành công đơn ${orderId}`]
        );
      }

      await conn.query(
        'UPDATE ctvs SET points = points + ?, total_sales = total_sales + ?, completed_orders_count = completed_orders_count + 1 WHERE id = ?',
        [order.earned_points, order.total_amount, order.ctv_id]
      );

      await conn.query(
        'UPDATE orders SET status = "DELIVERED", delivered_at = NOW(), cash_amount = ?, transfer_amount = ?, debt_amount = ?, payment_note = ? WHERE id = ?',
        [cashAmount, transferAmount, debtAmount, paymentNote, orderId]
      );

      await conn.commit();

      return {
        id: orderId,
        status: 'DELIVERED',
        cashAmount,
        transferAmount,
        debtAmount,
        paymentNote,
        earnedPoints: order.earned_points,
        ctvName: order.ctv_name
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async cancelOrder(orderId, reason = '') {
    await this.initDatabase();
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) throw new Error('Không tìm thấy đơn hàng');
      const order = orderRows[0];

      if (order.status !== 'PENDING_DELIVERY') {
        throw new Error('Chỉ có thể hủy đơn hàng đang chờ giao');
      }

      const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

      for (const item of items) {
        await conn.query('UPDATE products SET reserved = GREATEST(0, reserved - ?) WHERE id = ?', [item.qty, item.product_id]);
        await conn.query(
          `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
           VALUES (?, 'UNRESERVE', ?, ?, ?, ?)`,
          [`tx-${Date.now()}-${Math.random().toString(36).substring(2,5)}`, item.product_id, item.product_name, item.qty, `Giải phóng giữ kho đơn hủy ${orderId}`]
        );
      }

      await conn.query(
        'UPDATE orders SET status = "CANCELLED", cancel_reason = ?, cancelled_at = NOW() WHERE id = ?',
        [reason || 'Hủy đơn giao thất bại', orderId]
      );

      await conn.commit();
      return { id: orderId, status: 'CANCELLED' };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // --- DASHBOARD FINANCIAL REPORT ---
  async getDashboardReport() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [[financial]] = await this.pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS totalRevenue,
        COALESCE(SUM(total_cost), 0) AS totalCost,
        COALESCE(SUM(profit), 0) AS totalProfit,
        COALESCE(SUM(earned_points), 0) AS totalPointsDistributed
      FROM orders WHERE status = 'DELIVERED'
    `);

    const [[orderStats]] = await this.pool.query(`
      SELECT 
        COUNT(*) AS totalCount,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS deliveredCount,
        SUM(CASE WHEN status = 'PENDING_DELIVERY' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledCount
      FROM orders
    `);

    const [[invStats]] = await this.pool.query(`
      SELECT 
        COALESCE(SUM(stock), 0) AS totalStockCount,
        COALESCE(SUM(reserved), 0) AS totalReservedCount,
        COALESCE(SUM(stock - reserved), 0) AS totalAvailableCount,
        COUNT(*) AS productTypesCount
      FROM products
    `);

    const [regions] = await this.pool.query('SELECT name FROM regions ORDER BY id ASC');
    const regionStats = [];

    for (const r of regions) {
      const [[rStat]] = await this.pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS revenue,
          COALESCE(SUM(profit), 0) AS profit,
          COUNT(*) AS deliveredOrdersCount
        FROM orders WHERE ctv_region = ? AND status = 'DELIVERED'
      `, [r.name]);

      regionStats.push({
        region: r.name,
        revenue: parseFloat(rStat.revenue),
        profit: parseFloat(rStat.profit),
        deliveredOrdersCount: parseInt(rStat.deliveredOrdersCount)
      });
    }

    const rev = parseFloat(financial.totalRevenue);
    const prof = parseFloat(financial.totalProfit);

    return {
      financial: {
        totalRevenue: rev,
        totalCost: parseFloat(financial.totalCost),
        totalProfit: prof,
        totalPointsDistributed: parseInt(financial.totalPointsDistributed),
        profitMargin: rev > 0 ? ((prof / rev) * 100).toFixed(1) + '%' : '0%'
      },
      orders: {
        totalCount: parseInt(orderStats.totalCount || 0),
        deliveredCount: parseInt(orderStats.deliveredCount || 0),
        pendingCount: parseInt(orderStats.pendingCount || 0),
        cancelledCount: parseInt(orderStats.cancelledCount || 0)
      },
      inventory: {
        totalStockCount: parseInt(invStats.totalStockCount),
        totalReservedCount: parseInt(invStats.totalReservedCount),
        totalAvailableCount: parseInt(invStats.totalAvailableCount),
        productTypesCount: parseInt(invStats.productTypesCount)
      },
      regions: regionStats
    };
  }

  // --- QUICK PURCHASES (MUA HÀNG NHANH & SĐT KHÁCH) ---
  async createQuickPurchase({ customerName, phone, productName = '', note = '' }) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const id = `qp-${Date.now()}`;
    await this.pool.query(
      `INSERT INTO quick_purchases (id, customer_name, phone, product_name, note, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [id, customerName, phone, productName, note]
    );
    const [rows] = await this.pool.query(`SELECT * FROM quick_purchases WHERE id = ?`, [id]);
    const r = rows[0];
    return {
      id: r.id,
      customerName: r.customer_name,
      phone: r.phone,
      productName: r.product_name,
      note: r.note,
      status: r.status,
      createdAt: r.created_at
    };
  }

  async getQuickPurchases() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [rows] = await this.pool.query(`SELECT * FROM quick_purchases ORDER BY created_at DESC`);
    return rows.map(r => ({
      id: r.id,
      customerName: r.customer_name,
      phone: r.phone,
      productName: r.product_name,
      note: r.note,
      status: r.status,
      createdAt: r.created_at
    }));
  }

  async updateQuickPurchaseStatus(id, status) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    await this.pool.query(`UPDATE quick_purchases SET status = ? WHERE id = ?`, [status, id]);
    return { id, status };
  }

  async deleteQuickPurchase(id) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    await this.pool.query(`DELETE FROM quick_purchases WHERE id = ?`, [id]);
    return { id };
  }

  // --- CẤU HÌNH CHIẾT KHẤU & HOA HỒNG CTV ---
  async getCommissionSettings() {
    if (!this.pool) await this.initDatabase();
    try {
      const [rows] = await this.pool.query('SELECT * FROM commission_settings WHERE id = 1');
      if (rows.length > 0) {
        return {
          topPointValue: parseFloat(rows[0].top_point_value || 1000),
          standardPointValue: parseFloat(rows[0].standard_point_value || 500),
          topRate: parseFloat(rows[0].top_rate || 15),
          standardRate: parseFloat(rows[0].standard_rate || 8),
          topBonusPointsMultiplier: parseFloat(rows[0].top_bonus_multiplier || 1.5)
        };
      }
    } catch (e) {}
    return { topPointValue: 1000, standardPointValue: 500, topRate: 15, standardRate: 8, topBonusPointsMultiplier: 1.5 };
  }

  async updateCommissionSettings({ topPointValue, standardPointValue, topRate, standardRate, topBonusPointsMultiplier }) {
    if (!this.pool) await this.initDatabase();
    const tpv = parseFloat(topPointValue || 1000);
    const spv = parseFloat(standardPointValue || 500);
    const tr = parseFloat(topRate || 15);
    const sr = parseFloat(standardRate || 8);
    const mult = parseFloat(topBonusPointsMultiplier || 1.5);

    await this.pool.query(
      `INSERT INTO commission_settings (id, top_point_value, standard_point_value, top_rate, standard_rate, top_bonus_multiplier)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE top_point_value = ?, standard_point_value = ?, top_rate = ?, standard_rate = ?, top_bonus_multiplier = ?`,
      [tpv, spv, tr, sr, mult, tpv, spv, tr, sr, mult]
    );
    return { topPointValue: tpv, standardPointValue: spv, topRate: tr, standardRate: sr, topBonusPointsMultiplier: mult };
  }
}

module.exports = new MySQLDatabaseEngine();
