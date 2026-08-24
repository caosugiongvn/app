const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const config = require('./src/config/config');
const dbMySQL = require('./database-mysql');
const apiRoutes = require('./src/routes');

// Toàn cục: Ngăn chặn tiến trình crash do lỗi ngầm trên VPS
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Global Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Global Uncaught Exception:', err.message);
});

// Express App Initialization
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các tệp tĩnh Frontend trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Mount Central API Routes (MVC Architecture)
app.use('/api', apiRoutes);

// Phục vụ SPA index.html cho các route còn lại
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi chạy Server (Lắng nghe cổng IPv4/IPv6 Dual-Stack để Nginx reverse proxy không bị 502)
app.listen(config.PORT, async () => {
  console.log('\n================================================================');
  console.log(`🚀 HỆ THỐNG QUẢN LÝ BÁN HÀNG & TỒN KHO (MÔ HÌNH MVC - VPS LINUX READY)`);
  console.log('================================================================');
  
  // Khởi tạo kết nối & Database schema an toàn
  try {
    await dbMySQL.initDatabase();
  } catch (err) {
    console.error('⚠️ Lỗi kết nối CSDL khi khởi động:', err.message);
  }

  const ipList = config.getLocalIpAddresses();
  console.log(`\n📱 TRUY CẬP HỆ THỐNG (PORT ${config.PORT}):`);
  
  for (const item of ipList) {
    console.log(`   👉 ${item.url}`);
  }

  try {
    const primaryIp = ipList.find(i => i.address !== '127.0.0.1') || ipList[0];
    const qrString = await QRCode.toString(primaryIp.url, { type: 'terminal', small: true });
    console.log('\n📲 Quét mã QR dưới đây bằng camera điện thoại để truy cập nhanh:');
    console.log(qrString);
  } catch (err) {
    // QRCode terminal string fallback
  }

  console.log('================================================================\n');
});
