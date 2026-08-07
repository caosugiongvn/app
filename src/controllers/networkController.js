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
}

module.exports = NetworkController;
