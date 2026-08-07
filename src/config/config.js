const path = require('path');
const os = require('os');

// Nạp các biến môi trường từ tệp .env nếu có
try {
  require('dotenv').config();
} catch (e) {
  // dotenv chưa được cài hoặc dùng môi trường hệ thống
}

/**
 * Cấu hình hệ thống linh hoạt cho cả Local Windows & VPS Linux
 */
const config = {
  // Cổng lắng nghe (Ưu tiên biến môi trường PORT trên VPS Linux)
  PORT: process.env.PORT || 3000,

  // Địa chỉ Host (Mặc định '0.0.0.0' để chấp nhận mọi kết nối từ bên ngoài trên VPS)
  HOST: process.env.HOST || '0.0.0.0',

  // Secret Token dùng để bảo mật API đồng bộ code (Sync API)
  SYNC_SECRET_TOKEN: process.env.SYNC_SECRET_TOKEN || 'vps_sync_secret_key_2026',

  // Tệp lưu trữ JSON Database Fallback
  DATA_DIR: path.join(__dirname, '../../data'),
  DB_FILE: path.join(__dirname, '../../data/db.json'),

  // Cấu hình kết nối MySQL (Đọc từ .env hoặc mặc định cho XAMPP/VPS Linux)
  MYSQL_CONFIG: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_inventory',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    dateStrings: true
  },

  /**
   * Lấy danh sách địa chỉ IP local/mạng nội bộ của máy chủ
   */
  getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const k in interfaces) {
      for (const k2 of interfaces[k]) {
        if (k2.family === 'IPv4' && !k2.internal) {
          addresses.push({
            name: k,
            address: k2.address,
            url: `http://${k2.address}:${this.PORT}`
          });
        }
      }
    }

    if (addresses.length === 0) {
      addresses.push({
        name: 'Localhost',
        address: '127.0.0.1',
        url: `http://127.0.0.1:${this.PORT}`
      });
    }

    return addresses;
  }
};

module.exports = config;
