const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Tự động đọc file wp-config.php trên VPS nếu ứng dụng nằm trong/cạnh thư mục WordPress
 */
function getWordPressConfig() {
  const possiblePaths = [
    path.join(__dirname, '../wp-config.php'),
    path.join(__dirname, '../../wp-config.php'),
    '/www/wwwroot/danchigialai.com/wp-config.php',
    '/www/wwwroot/wp-config.php'
  ];

  for (const wpPath of possiblePaths) {
    if (fs.existsSync(wpPath)) {
      try {
        const content = fs.readFileSync(wpPath, 'utf8');

        const getDefine = (key) => {
          const regex = new RegExp(`define\\s*\\(\\s*['"]${key}['"]\\s*,\\s*['"]([^'"]*)['"]\\s*\\)`, 'i');
          const m = content.match(regex);
          return m ? m[1] : null;
        };

        const dbName = getDefine('DB_NAME');
        const dbUser = getDefine('DB_USER');
        const dbPass = getDefine('DB_PASSWORD');
        const dbHostRaw = getDefine('DB_HOST') || '127.0.0.1';

        const prefixMatch = content.match(/\$table_prefix\s*=\s*['"]([^'"]+)['"]/i);
        const tablePrefix = prefixMatch ? prefixMatch[1] : 'wp_';

        if (dbName && dbUser) {
          let host = '127.0.0.1';
          let port = 3306;

          if (dbHostRaw.includes(':') && !dbHostRaw.includes('.sock')) {
            const parts = dbHostRaw.split(':');
            if (parts[0] !== 'localhost') host = parts[0];
            port = parseInt(parts[1], 10) || 3306;
          }

          console.log(`✅ [WP Config Engine] Parsed wp-config.php: DB="${dbName}", User="${dbUser}", Host="${host}:${port}", Prefix="${tablePrefix}"`);

          return {
            database: dbName,
            user: dbUser,
            password: dbPass !== null ? dbPass : '',
            host: host,
            port: port,
            prefix: tablePrefix
          };
        }
      } catch (err) {
        console.error('⚠️ Lỗi khi đọc file wp-config.php:', err.message);
      }
    }
  }
  return null;
}

class MySQLDatabaseEngine {
  constructor() {
    this.pool = null;
    this.initialized = false;
    this.wpPrefix = 'wp_';
  }

  /**
   * Khởi tạo kết nối Pool & Tự tạo Database + Tables nếu chưa có trên XAMPP
   */
  async initDatabase() {
    if (this.initialized && this.pool) return true;

    try {
      const wpCfg = getWordPressConfig();
      const dbConfig = wpCfg ? {
        host: wpCfg.host,
        port: wpCfg.port,
        user: wpCfg.user,
        password: wpCfg.password,
        database: wpCfg.database
      } : config.MYSQL_CONFIG;

      this.wpPrefix = wpCfg ? wpCfg.prefix : 'wp_';

      if (wpCfg) {
        console.log(`🔗 Đã tự động phát hiện CSDL WordPress live trên VPS: database = "${wpCfg.database}", prefix = "${this.wpPrefix}"`);
      }

      // 1. Kết nối với MySQL Server để tạo DB (bỏ qua lỗi nếu user MySQL không có quyền CREATE DATABASE)
      try {
        const tempConnection = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password
        });

        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConnection.end();
      } catch (e) {
        // Bỏ qua lỗi Access Denied khi user MySQL trên VPS không có quyền CREATE DATABASE
      }

      // 2. Tạo Pool kết nối chính thức vào database CSDL
      this.pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

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

        // Tự động đảm bảo tạo bảng regions nếu chưa có trong MySQL
        try {
          await this.pool.query(`
            CREATE TABLE IF NOT EXISTS \`regions\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY,
              \`name\` VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `);
          const [regCount] = await this.pool.query('SELECT COUNT(*) AS total FROM regions');
          if (regCount[0]?.total === 0) {
            await this.pool.query(`
              INSERT IGNORE INTO regions (name) VALUES 
              ('Hà Nội'), ('TP. Hồ Chí Minh'), ('Đà Nẵng'), ('Hải Phòng'), ('Cần Thơ'), ('Gia Lai');
            `);
          }
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

  // --- SHARED WORDPRESS DATABASE HELPERS ---
  async checkWordPressTables() {
    try {
      if (!this.pool) return false;

      // Danh sách các tiền tố cần thử (bỏ qua toàn bộ bảng plugin aioseo, yoast...)
      const candidatePrefixes = [
        this.wpPrefix,
        'wp_',
        'wpx_'
      ].filter(p => p && !p.includes('aioseo') && !p.includes('yoast'));

      // 1. Thử trực tiếp tìm bảng chứa sản phẩm WooCommerce (post_type = 'product')
      for (const pref of candidatePrefixes) {
        try {
          const [rows] = await this.pool.query(`SELECT 1 FROM ${pref}posts WHERE post_type = 'product' LIMIT 1`);
          if (rows && rows.length > 0) {
            this.wpPrefix = pref;
            console.log(`🎯 [WP Core Engine] Đã xác định chuẩn xác bảng sản phẩm WooCommerce gốc: "${this.wpPrefix}posts"`);
            return true;
          }
        } catch (e) {}
      }

      // 2. Quét tất cả các bảng kết thúc bằng 'posts' (bỏ qua plugin)
      const [allTables] = await this.pool.query("SHOW TABLES LIKE '%posts'");
      if (allTables && allTables.length > 0) {
        for (const row of allTables) {
          const tableName = Object.values(row)[0];
          if (tableName && tableName.endsWith('posts') && !tableName.includes('aioseo') && !tableName.includes('yoast')) {
            const calculatedPrefix = tableName.slice(0, -5);
            try {
              const [check] = await this.pool.query(`SELECT 1 FROM ${calculatedPrefix}posts WHERE post_type = 'product' LIMIT 1`);
              if (check && check.length > 0) {
                this.wpPrefix = calculatedPrefix;
                console.log(`🎯 [WP Core Engine] Đã xác định chuẩn xác bảng sản phẩm WooCommerce gốc: "${this.wpPrefix}posts"`);
                return true;
              }
            } catch (e) {}
          }
        }
      }
      return false;
    } catch (e) {
      console.error('⚠️ checkWordPressTables error:', e.message);
      return false;
    }
  }

  async updateWpPostMeta(postId, metaKey, metaValue) {
    try {
      const prefix = this.wpPrefix || 'wp_';
      const valStr = metaValue !== undefined && metaValue !== null ? String(metaValue) : '';
      const [rows] = await this.pool.query(`SELECT meta_id FROM ${prefix}postmeta WHERE post_id = ? AND meta_key = ?`, [postId, metaKey]);
      if (rows && rows.length > 0) {
        await this.pool.query(`UPDATE ${prefix}postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = ?`, [valStr, postId, metaKey]);
      } else {
        await this.pool.query(`INSERT INTO ${prefix}postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)`, [postId, metaKey, valStr]);
      }
    } catch (e) {
      console.error(`Lỗi cập nhật postmeta (post ${postId}, key ${metaKey}):`, e.message);
    }
  }

  // --- SẢN PHẨM & TỒN KHO ---
  async getProducts() {
    await this.initDatabase();
    const hasWP = await this.checkWordPressTables();

    let wpProdList = [];
    if (hasWP) {
      try {
        const prefix = this.wpPrefix || 'wp_';
        const [wpRows] = await this.pool.query(`
          SELECT 
            p.ID AS id,
            MAX(p.post_title) AS name,
            MAX(p.post_type) AS post_type,
            MAX(p.post_parent) AS post_parent,
            MAX(p.post_date) AS created_at,
            MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) AS code,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) AS raw_regular_price,
            MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) AS raw_sale_price,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) AS raw_price,
            MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) AS raw_stock,
            MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) AS stock_status,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) AS thumbnail_id,
            MAX(CASE WHEN pm.meta_key = '_product_image_gallery' THEN pm.meta_value END) AS gallery_ids,
            MAX(CASE WHEN pm.meta_key = '_app_points' THEN pm.meta_value END) AS raw_points
          FROM ${prefix}posts p
          LEFT JOIN ${prefix}postmeta pm ON p.ID = pm.post_id
          WHERE p.post_type IN ('product', 'product_variation') AND p.post_status IN ('publish', 'private', 'inherit', 'draft')
          GROUP BY p.ID
          ORDER BY p.ID DESC
        `);

        if (wpRows && wpRows.length > 0) {
          const [cats] = await this.pool.query(`
            SELECT tr.object_id AS product_id, t.name AS category_name
            FROM ${prefix}term_relationships tr
            JOIN ${prefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'product_cat'
            JOIN ${prefix}terms t ON tt.term_id = t.term_id
          `);
          const catMap = {};
          (cats || []).forEach(c => { catMap[c.product_id] = c.category_name; });

          // 1. Quét đường dẫn ảnh đính kèm từ wp_postmeta (_wp_attached_file)
          const imgMap = {};
          try {
            const [imgMetaRows] = await this.pool.query(`
              SELECT pm.post_id AS id, pm.meta_value AS file_path, p.guid AS guid
              FROM ${prefix}postmeta pm
              JOIN ${prefix}posts p ON pm.post_id = p.ID
              WHERE pm.meta_key = '_wp_attached_file' AND p.post_type = 'attachment'
            `);
            (imgMetaRows || []).forEach(img => {
              if (img.file_path) {
                imgMap[img.id] = `https://danchigialai.com/wp-content/uploads/${img.file_path.replace(/^\/+/, '')}`;
              } else if (img.guid) {
                imgMap[img.id] = img.guid.replace(/^http:\/\/[^\/]+/i, 'https://danchigialai.com');
              }
            });
          } catch (e) {}

          // 2. Dự phòng quét cột guid trong bảng wp_posts cho các ảnh attachment
          try {
            const [imgRows] = await this.pool.query(`
              SELECT p.ID, p.guid 
              FROM ${prefix}posts p 
              WHERE p.post_type = 'attachment'
            `);
            (imgRows || []).forEach(img => {
              if (!imgMap[img.ID] && img.guid) {
                imgMap[img.ID] = img.guid.replace(/^http:\/\/[^\/]+/i, 'https://danchigialai.com');
              }
            });
          } catch (e) {}

          function parseWpPrice(val) {
            if (val === null || val === undefined) return 0;
            let str = String(val).trim();
            if (!str) return 0;
            if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
              str = str.replace(/\./g, '');
            } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
              str = str.replace(/,/g, '');
            }
            const num = parseFloat(str.replace(/,/g, ''));
            return isNaN(num) ? 0 : num;
          }

          // Map variation prices by parent product ID
          const varPrices = {};
          wpRows.filter(r => r.post_type === 'product_variation' && r.post_parent > 0).forEach(v => {
            const vSelling = parseWpPrice(v.raw_price);
            const vReg = parseWpPrice(v.raw_regular_price);
            const vSale = parseWpPrice(v.raw_sale_price);
            const pId = v.post_parent;

            if (!varPrices[pId]) {
              varPrices[pId] = { selling: vSelling, reg: vReg, sale: vSale };
            } else {
              if (vSelling > 0 && (varPrices[pId].selling === 0 || vSelling < varPrices[pId].selling)) {
                varPrices[pId].selling = vSelling;
              }
              if (vReg > 0 && (varPrices[pId].reg === 0 || vReg < varPrices[pId].reg)) {
                varPrices[pId].reg = vReg;
              }
              if (vSale > 0 && (varPrices[pId].sale === 0 || vSale < varPrices[pId].sale)) {
                varPrices[pId].sale = vSale;
              }
            }
          });

          // All published WooCommerce products from wp-admin
          const candidateProducts = wpRows.filter(r => r.post_type === 'product');

          wpProdList = candidateProducts.map(r => {
            const rawSelling = parseWpPrice(r.raw_price);
            const rawReg = parseWpPrice(r.raw_regular_price);
            const rawSale = parseWpPrice(r.raw_sale_price);

            let effSelling = 0;
            if (rawSale > 0) {
              effSelling = rawSale;
            } else if (rawSelling > 0) {
              effSelling = rawSelling;
            } else if (rawReg > 0) {
              effSelling = rawReg;
            } else if (varPrices[r.id] && varPrices[r.id].selling > 0) {
              effSelling = varPrices[r.id].selling;
            }

            const orig = rawReg > 0 ? rawReg : (rawSelling > 0 ? rawSelling : effSelling);
            const promo = rawSale > 0 ? rawSale : effSelling;

            const isOutOfStock = r.stock_status === 'outofstock';
            const rawStock = parseInt(r.raw_stock !== null && r.raw_stock !== undefined && !isNaN(r.raw_stock) ? r.raw_stock : (isOutOfStock ? 0 : 9999));
            const stock = isOutOfStock ? 0 : Math.max(1, rawStock);
            let thumbId = r.thumbnail_id;
            if (!thumbId && r.gallery_ids) {
              const ids = String(r.gallery_ids).split(',').map(s => s.trim()).filter(Boolean);
              if (ids.length > 0) thumbId = ids[0];
            }
            const imageUrl = thumbId && imgMap[thumbId] ? imgMap[thumbId] : null;

            return {
              id: `wp-${r.id}`,
              wpId: r.id,
              code: r.code || `WP-${r.id}`,
              name: r.name,
              category: catMap[r.id] || 'Cây Giống',
              costPrice: Math.round(effSelling * 0.5),
              originalPrice: orig,
              promoPrice: promo,
              sellingPrice: effSelling,
              stock: stock,
              reserved: 0,
              available: stock,
              points: parseInt(parseWpPrice(r.raw_points) || Math.round(effSelling / 10000)),
              unit: 'Cây',
              imageUrl: imageUrl
            };
          }).filter(p => p.name && p.name.trim().length > 0);
          console.log(`✅ [WP Database Engine] Successfully loaded ${wpProdList.length} WooCommerce products directly from live database!`);
        }
      } catch (err) {
        console.error('❌ Lỗi khi đọc bảng WordPress wp_posts:', err.message);
      }
    }

    if (wpProdList.length > 0) {
      return wpProdList;
    }
    console.warn('⚠️ [WP Database Engine] Warning: No WordPress products loaded, checking local fallback...');

    let localProdList = [];
    try {
      const [rows] = await this.pool.query('SELECT *, (stock - reserved) AS available FROM products ORDER BY created_at DESC');
      localProdList = rows.map(r => {
        const orig = parseFloat(r.original_price || 0) || parseFloat(r.selling_price || 0);
        const promo = parseFloat(r.promo_price || 0);
        const effSelling = promo > 0 ? promo : (parseFloat(r.selling_price || 0) || orig);
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          category: r.category || 'Chung',
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
    } catch (e) {}

    if (localProdList.length > 0) {
      return localProdList;
    }

    // Default guaranteed products fallback from danchigialai.com
    return [
      {
        id: "wp-2081",
        wpId: 2081,
        code: "WP-2081",
        name: "Giống cà phê xanh lún thực sinh TS5 (bầu 14)",
        category: "Cây Giống",
        costPrice: 2000,
        originalPrice: 4500,
        promoPrice: 0,
        sellingPrice: 4500,
        stock: 10000,
        reserved: 0,
        available: 10000,
        points: 2,
        unit: "Cây",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2025/10/3.jpg"
      },
      {
        id: "wp-2000",
        wpId: 2000,
        code: "WP-2000",
        name: "Giống Cà Phê Xanh Lún Thực Sinh TS5 Giá Rẻ Gia Lai",
        category: "Cây Giống",
        costPrice: 2000,
        originalPrice: 4500,
        promoPrice: 0,
        sellingPrice: 4500,
        stock: 10000,
        reserved: 0,
        available: 10000,
        points: 2,
        unit: "Cây",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2025/10/5.jpg"
      },
      {
        id: "wp-1898",
        wpId: 1898,
        code: "WP-1898",
        name: "Giống Cà Phê Xanh Lún Ghép Gốc Mít (TS5) Chuẩn F1 Gia Lai",
        category: "Cây Giống",
        costPrice: 8000,
        originalPrice: 18000,
        promoPrice: 16000,
        sellingPrice: 16000,
        stock: 3000,
        reserved: 0,
        available: 3000,
        points: 8,
        unit: "Cây",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2024/12/ca-phe-xanh-lun-ghep.jpg"
      },
      {
        id: "wp-1184",
        wpId: 1184,
        code: "WP-1184",
        name: "Cây giống sầu riêng Musang king Malaysia",
        category: "Cây Giống",
        costPrice: 60000,
        originalPrice: 120000,
        promoPrice: 105000,
        sellingPrice: 105000,
        stock: 500,
        reserved: 0,
        available: 500,
        points: 15,
        unit: "Cây",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2023/09/365883720_9781712475235706_3191800439070956132_n-300x400.jpg"
      },
      {
        id: "wp-1169",
        wpId: 1169,
        code: "WP-1169",
        name: "Hạt cà phê giống",
        category: "Cây Giống",
        costPrice: 1000,
        originalPrice: 2000,
        promoPrice: 0,
        sellingPrice: 2000,
        stock: 50000,
        reserved: 0,
        available: 50000,
        points: 1,
        unit: "Kg",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2023/09/hat-ca-phe-giong-1-300x400.jpg"
      },
      {
        id: "wp-1131",
        wpId: 1131,
        code: "WP-1131",
        name: "Chôm chôm Tiến Cường",
        category: "Cây Giống",
        costPrice: 18000,
        originalPrice: 35000,
        promoPrice: 0,
        sellingPrice: 35000,
        stock: 800,
        reserved: 0,
        available: 800,
        points: 5,
        unit: "Cây",
        imageUrl: "https://danchigialai.com/wp-content/uploads/2023/11/giong-cao-su-209-1-tang-la-kon-tum-1.jpg"
      }
    ];
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
    const isWpProduct = String(productId).startsWith('wp-');
    const wpId = isWpProduct ? String(productId).replace('wp-', '') : null;

    if (isWpProduct && wpId) {
      const hasWP = await this.checkWordPressTables();
      if (hasWP) {
        const [rows] = await this.pool.query('SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = "_stock"', [wpId]);
        const currentStock = rows && rows.length > 0 ? parseInt(rows[0].meta_value || 0) : 0;
        const newStock = Math.max(0, currentStock + importQty);

        await this.updateWpPostMeta(wpId, '_stock', newStock);
        await this.updateWpPostMeta(wpId, '_stock_status', newStock <= 0 ? 'outofstock' : 'instock');
        await this.updateWpPostMeta(wpId, '_manage_stock', 'yes');

        const products = await this.getProducts();
        return products.find(p => p.id === productId) || null;
      }
    }

    await this.pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [importQty, productId]);

    const [prods] = await this.pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    const product = prods[0];

    await this.pool.query(
      `INSERT INTO stock_transactions (id, type, product_id, product_name, qty, note)
       VALUES (?, 'IMPORT', ?, ?, ?, ?)`,
      [`tx-${Date.now()}`, productId, product ? product.name : productId, importQty, note || 'Nhập kho bổ sung']
    );

    return {
      id: product ? product.id : productId,
      code: product ? product.code : 'SP001',
      name: product ? product.name : 'Sản phẩm',
      stock: product ? parseInt(product.stock) : importQty,
      reserved: product ? parseInt(product.reserved) : 0,
      available: product ? parseInt(product.stock - product.reserved) : importQty,
      unit: product ? product.unit : 'Cái'
    };
  }

  async updateProduct(id, updateData) {
    await this.initDatabase();
    if (!this.pool) return null;

    const isWpProduct = String(id).startsWith('wp-');
    const wpId = isWpProduct ? String(id).replace('wp-', '') : null;

    if (isWpProduct && wpId) {
      const hasWP = await this.checkWordPressTables();
      if (hasWP) {
        const { code, name, originalPrice, promoPrice, sellingPrice, stock, points } = updateData;

        if (name) {
          await this.pool.query('UPDATE wp_posts SET post_title = ? WHERE ID = ? AND post_type = "product"', [name, wpId]);
        }

        if (code) {
          await this.updateWpPostMeta(wpId, '_sku', code);
        }

        if (sellingPrice !== undefined || originalPrice !== undefined || promoPrice !== undefined) {
          const origPriceVal = originalPrice !== undefined ? parseFloat(originalPrice) : parseFloat(sellingPrice || 0);
          const promoPriceVal = promoPrice !== undefined ? parseFloat(promoPrice) : 0;
          const effPriceVal = promoPriceVal > 0 ? promoPriceVal : (parseFloat(sellingPrice || 0) || origPriceVal);

          await this.updateWpPostMeta(wpId, '_price', effPriceVal);
          await this.updateWpPostMeta(wpId, '_regular_price', origPriceVal);
          await this.updateWpPostMeta(wpId, '_sale_price', promoPriceVal > 0 ? promoPriceVal : '');
        }

        if (stock !== undefined) {
          const stk = parseInt(stock || 0);
          await this.updateWpPostMeta(wpId, '_stock', stk);
          await this.updateWpPostMeta(wpId, '_stock_status', stk <= 0 ? 'outofstock' : 'instock');
          await this.updateWpPostMeta(wpId, '_manage_stock', 'yes');
        }

        if (points !== undefined) {
          await this.updateWpPostMeta(wpId, '_app_points', parseInt(points || 0));
        }

        const prods = await this.getProducts();
        return prods.find(p => p.id === id) || null;
      }
    }

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

  async getRegionsDetailed() {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const [rows] = await this.pool.query('SELECT id, name FROM regions ORDER BY id ASC');

    const result = [];
    for (const r of rows) {
      let uCount = 0;
      let oCount = 0;
      try {
        const [uRows] = await this.pool.query('SELECT COUNT(*) AS total FROM users WHERE region = ?', [r.name]);
        uCount = uRows[0]?.total || 0;
      } catch (e) {}

      try {
        const [oRows] = await this.pool.query('SELECT COUNT(*) AS total FROM orders WHERE ctv_region = ?', [r.name]);
        oCount = oRows[0]?.total || 0;
      } catch (e) {}

      result.push({
        id: r.id,
        name: r.name,
        userCount: uCount,
        orderCount: oCount
      });
    }
    return result;
  }

  async addRegion(name) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const trimmed = String(name).trim();
    if (!trimmed) throw new Error('Tên khu vực không được để trống');
    await this.pool.query('INSERT IGNORE INTO regions (name) VALUES (?)', [trimmed]);
    return true;
  }

  async renameRegion(oldName, newName) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const oldTrimmed = String(oldName).trim();
    const newTrimmed = String(newName).trim();
    if (!newTrimmed) throw new Error('Tên khu vực mới không được để trống');

    // 1. Cập nhật tên trong bảng regions
    await this.pool.query('UPDATE regions SET name = ? WHERE name = ?', [newTrimmed, oldTrimmed]);

    // 2. Tự động đồng bộ sang users, ctvs và orders
    await this.pool.query('UPDATE users SET region = ? WHERE region = ?', [newTrimmed, oldTrimmed]);
    await this.pool.query('UPDATE ctvs SET region = ? WHERE region = ?', [newTrimmed, oldTrimmed]);
    await this.pool.query('UPDATE orders SET ctv_region = ? WHERE ctv_region = ?', [newTrimmed, oldTrimmed]);

    return true;
  }

  async deleteRegion(name) {
    await this.initDatabase();
    if (!this.pool) throw new Error('Chưa kết nối CSDL MySQL');
    const trimmed = String(name).trim();
    await this.pool.query('DELETE FROM regions WHERE name = ?', [trimmed]);

    // Chuyển tài khoản/CTV thuộc khu vực bị xóa sang 'Chưa phân công'
    await this.pool.query('UPDATE users SET region = "Chưa phân công" WHERE region = ?', [trimmed]);
    await this.pool.query('UPDATE ctvs SET region = "Chưa phân công" WHERE region = ?', [trimmed]);

    return true;
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
        const isWp = String(item.product_id).startsWith('wp-');
        const wpId = isWp ? String(item.product_id).replace('wp-', '') : null;

        if (isWp && wpId) {
          try {
            const [stkRows] = await conn.query('SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = "_stock"', [wpId]);
            const curStk = stkRows && stkRows.length > 0 ? parseInt(stkRows[0].meta_value || 0) : 0;
            const newStk = Math.max(0, curStk - item.qty);
            await this.updateWpPostMeta(wpId, '_stock', newStk);
            await this.updateWpPostMeta(wpId, '_stock_status', newStk <= 0 ? 'outofstock' : 'instock');
          } catch (e) {
            console.error('Lỗi trừ kho WordPress sản phẩm:', e.message);
          }
        }

        try {
          await conn.query(
            'UPDATE products SET stock = stock - ?, reserved = GREATEST(0, reserved - ?) WHERE id = ?',
            [item.qty, item.qty, item.product_id]
          );
        } catch (e) {}

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
