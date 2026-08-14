const QRCode = require('qrcode');
const config = require('../config/config');
const dbJSON = require('../../database');

class NetworkController {
  /**
   * Lấy cấu trúc cây mạng lưới CTV
   */
  static async getNetworkTree(req, res) {
    try {
      const data = dbJSON.readData();
      const ctvs = data.ctvs || [];

      // Tạo cấu trúc phân cây theo khu vực
      const tree = {};
      ctvs.forEach(ctv => {
        const region = ctv.region || 'Chưa phân công';
        if (!tree[region]) tree[region] = [];
        tree[region].push(ctv);
      });

      return res.json({ success: true, data: tree });
    } catch (error) {
      console.error('❌ Lỗi Controller getNetworkTree:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy cây mạng lưới CTV' });
    }
  }

  /**
   * Lấy thông tin mạng lưới & Tạo mã QR quét kết nối từ xa trên điện thoại
   */
  static async getNetworkInfo(req, res) {
    try {
      const hostHeader = req.headers.host;
      const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
      const protocol = isHttps ? 'https' : 'http';

      let primaryUrl = '';
      if (hostHeader) {
        const subPath = hostHeader.includes('danchigialai.com') ? '/sales-app/' : '/';
        primaryUrl = `${protocol}://${hostHeader}${subPath}`;
      } else {
        const ipList = config.getLocalIpAddresses();
        primaryUrl = ipList[0]?.url || `http://127.0.0.1:${config.PORT}`;
      }

      // Tạo hình ảnh QR Code dạng Data URL Base64
      const qrCodeDataUrl = await QRCode.toDataURL(primaryUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      const ipList = config.getLocalIpAddresses();
      const interfaces = ipList.map(item => ({
        interface: item.name,
        url: item.url
      }));

      if (hostHeader) {
        interfaces.unshift({
          interface: 'Tên Miền Web VPS',
          url: primaryUrl
        });
      }

      return res.json({
        success: true,
        data: {
          primaryUrl,
          qrCodeDataUrl,
          interfaces
        }
      });
    } catch (error) {
          console.error('❌ Lỗi Controller getNetworkInfo:', error);
      return res.status(500).json({ success: false, message: 'Lỗi tạo mã QR kết nối từ xa' });
    }
  }
}

module.exports = NetworkController;
