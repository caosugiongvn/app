const OrderModel = require('../models/OrderModel');

class OrderController {
  /**
   * Lấy danh sách đơn hàng
   */
  static async getOrders(req, res) {
    try {
      const { ctvId, driverId, status, region } = req.query;
      const orders = await OrderModel.getOrders({ ctvId, driverId, status, region });
      return res.json({ success: true, data: orders });
    } catch (error) {
      console.error('❌ Lỗi Controller getOrders:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng' });
    }
  }

  /**
   * Tạo đơn hàng mới
   */
  static async createOrder(req, res) {
    try {
      const { ctvId, driverId, customerName, customerPhone, address, items } = req.body;

      if (!ctvId || !customerName || !customerPhone || !address || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin CTV, khách hàng và danh sách sản phẩm' });
      }

      const newOrder = await OrderModel.createOrder({
        ctvId, driverId, customerName, customerPhone, address, items
      });

      return res.json({
        success: true,
        message: 'Tạo đơn hàng thành công! Đơn hàng đang chờ Quản trị viên duyệt & phân công tài xế.',
        data: newOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller createOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo đơn hàng' });
    }
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái mới' });
      }

      const updatedOrder = await OrderModel.updateOrderStatus(id, status);

      return res.json({
        success: true,
        message: `Đã cập nhật trạng thái đơn hàng sang ${status}`,
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller updateOrderStatus:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi cập nhật trạng thái' });
    }
  }

  /**
   * Phân công tài xế
   */
  static async assignDriver(req, res) {
    try {
      const { id } = req.params;
      const { driverId, estimatedDeliveryTime } = req.body;

      if (!driverId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn tài xế' });
      }

      const updatedOrder = await OrderModel.assignDriver(id, driverId, estimatedDeliveryTime);

      return res.json({
        success: true,
        message: `Đã phân công tài xế ${updatedOrder.driverName} thành công!`,
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller assignDriver:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi phân công tài xế' });
    }
  }

  /**
   * Duyệt đơn hàng (Admin)
   */
  static async approveOrder(req, res) {
    try {
      const { id } = req.params;
      const { approvalStatus, status } = req.body || {};
      const newApprovalStatus = approvalStatus || status || 'APPROVED';

      const updatedOrder = await OrderModel.approveOrder(id, newApprovalStatus);

      return res.json({
        success: true,
        message: `Đã duyệt đơn hàng thành công (${newApprovalStatus})!`,
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller approveOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi duyệt đơn hàng' });
    }
  }

  /**
   * Hoàn tất giao hàng
   */
  static async deliverOrder(req, res) {
    try {
      const { id } = req.params;
      const { cashAmount, transferAmount, debtAmount, paymentNote } = req.body || {};

      const updatedOrder = await OrderModel.updateOrderStatus(id, 'COMPLETED');
      if (cashAmount || transferAmount || debtAmount) {
        await OrderModel.updatePayment(id, { cashAmount, transferAmount, debtAmount, paymentNote });
      }

      return res.json({
        success: true,
        message: 'Đã hoàn tất giao đơn hàng thành công!',
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller deliverOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi hoàn tất đơn hàng' });
    }
  }

  /**
   * Hủy đơn hàng
   */
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const updatedOrder = await OrderModel.updateOrderStatus(id, 'CANCELLED');

      return res.json({
        success: true,
        message: 'Đã hủy đơn hàng thành công',
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller cancelOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi hủy đơn hàng' });
    }
  }

  /**
   * Cập nhật thanh toán
   */
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { cashAmount, transferAmount, debtAmount, paymentNote } = req.body || {};

      const updatedOrder = await OrderModel.updatePayment(id, { cashAmount, transferAmount, debtAmount, paymentNote });

      return res.json({
        success: true,
        message: 'Cập nhật thanh toán đơn hàng thành công!',
        data: updatedOrder
      });
    } catch (error) {
      console.error('❌ Lỗi Controller updatePayment:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi cập nhật thanh toán' });
    }
  }

  /**
   * Xóa đơn hàng
   */
  static async deleteOrder(req, res) {
    try {
      const { id } = req.params;
      await OrderModel.deleteOrder(id);

      return res.json({
        success: true,
        message: 'Đã xóa đơn hàng thành công'
      });
    } catch (error) {
      console.error('❌ Lỗi Controller deleteOrder:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi khi xóa đơn hàng' });
    }
  }
}

module.exports = OrderController;
