const { exec } = require('child_process');
const path = require('path');
const config = require('../config/config');

class SystemController {
  /**
   * Lấy thông tin trạng thái hệ thống & phiên bản code
   */
  static async getStatus(req, res) {
    const isWin = process.platform === 'win32';
    const rootDir = path.join(__dirname, '../../..');

    exec('git log -1 --format="%h - %s (%cr)"', { cwd: rootDir }, (err, stdout) => {
      const gitInfo = err ? 'Không phải Git Repository hoặc chưa commit' : stdout.trim();

      return res.json({
        success: true,
        data: {
          platform: process.platform,
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(process.uptime()),
          ipAddresses: config.getLocalIpAddresses(),
          port: config.PORT,
          host: config.HOST,
          lastCommit: gitInfo
        }
      });
    });
  }

  /**
   * Đồng bộ & Cập nhật Code từ Git Repository lên VPS Linux (1-Click Update API)
   */
  static async syncCode(req, res) {
    const { token } = req.body || req.query;

    // Kiểm tra token bảo mật nếu token cấu hình không phải mặc định
    if (config.SYNC_SECRET_TOKEN && config.SYNC_SECRET_TOKEN !== 'vps_sync_secret_key_2026') {
      if (token !== config.SYNC_SECRET_TOKEN) {
        return res.status(403).json({
          success: false,
          message: 'Mã xác thực đồng bộ (Sync Token) không hợp lệ!'
        });
      }
    }

    const rootDir = path.join(__dirname, '../../..');
    const isLinux = process.platform !== 'win32';

    console.log('🔄 Đang tiến hành kéo code mới nhất từ Git Repository...');

    // Bước 1: Thực thi git pull
    exec('git pull origin main || git pull', { cwd: rootDir }, (pullErr, pullStdout, pullStderr) => {
      if (pullErr) {
        console.error('❌ Lỗi khi git pull:', pullErr.message);
        return res.status(500).json({
          success: false,
          message: `Lỗi kéo code mới từ Git: ${pullErr.message}`,
          detail: pullStderr
        });
      }

      const outputLogs = [pullStdout.trim()];
      console.log('✅ Git pull thành công:', pullStdout.trim());

      // Bước 2: Tự động перезапуск PM2 nếu đang chạy trên VPS Linux
      if (isLinux) {
        exec('pm2 reload sales-app || pm2 restart sales-app', (pm2Err, pm2Stdout) => {
          if (!pm2Err) {
            outputLogs.push('✅ Đã tự động reload dịch vụ PM2 sales-app thành công!');
          } else {
            outputLogs.push('⚠️ Đã cập nhật code, nhưng chưa reload PM2 (PM2 chưa được khởi tạo với tên sales-app).');
          }

          return res.json({
            success: true,
            message: 'Đồng bộ & Cập nhật Code thành công trên VPS Linux!',
            logs: outputLogs
          });
        });
      } else {
        outputLogs.push('ℹ️ Đã cập nhật code thành công trên máy Local (Windows). Vui lòng khởi động lại server nếu cần.');
        return res.json({
          success: true,
          message: 'Đã kéo thành công bản code mới nhất!',
          logs: outputLogs
        });
      }
    });
  }
}

module.exports = SystemController;
