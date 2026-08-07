const QuickPurchaseModel = require('../models/QuickPurchaseModel');

class QuickPurchaseController {
  /**
   * Tạo mã/link mua nhanh
   */
  static async createLink(req, res) {
    try {
      const { ctvId, productId, qty } = req.body;
      if (!ctvId || !productId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ctvId và productId' });
      }

      const quickItem = await QuickPurchaseModel.createQuickLink({ ctvId, productId, qty });
      return res.json({ success: true, message: 'Tạo mã mua nhanh thành công', data: quickItem });
    } catch (error) {
      console.error('❌ Lỗi Controller createLink:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi tạo liên kết mua nhanh' });
    }
  }

  /**
   * Kiểm tra thông tin mã mua nhanh
   */
  static async validateCode(req, res) {
    try {
      const { code } = req.params;
      const data = await QuickPurchaseModel.validateCode(code);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('❌ Lỗi Controller validateCode:', error);
      return res.status(400).json({ success: false, message: error.message || 'Mã mua nhanh không hợp lệ' });
    }
  }

  /**
   * Gửi đơn hàng mua nhanh từ khách
   */
  static async submitOrder(req, res) {
    try {
      const { code, customerName, customerPhone, address } = req.body;
      if (!code || !customerName || !customerPhone || !address) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
      }

      const newOrder = await QuickPurchaseModel.submitQuickOrder({ code, customerName, customerPhone, address });
      return res.json({
        success: true,
        message: 'Đặt hàng thành công qua liên kết mua nhanh!',
        data: newOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller submitOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi đặt hàng mua nhanh' });
    }
  }
}

module.exports = QuickPurchaseController;
