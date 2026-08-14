const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');

// Lấy danh sách đơn hàng
router.get('/orders', OrderController.getOrders);

// Tạo đơn hàng mới
router.post('/orders', OrderController.createOrder);

// Cập nhật trạng thái đơn hàng
router.put('/orders/:id/status', OrderController.updateOrderStatus);

// Phân công tài xế giao hàng
router.put('/orders/:id/driver', OrderController.assignDriver);

// Duyệt đơn hàng (Admin) - Hỗ trợ cả POST/PUT và các định dạng URL
router.post('/orders/:id/approve', OrderController.approveOrder);
router.put('/orders/:id/approve', OrderController.approveOrder);
router.post('/orders/:id/approval', OrderController.approveOrder);
router.put('/orders/:id/approval', OrderController.approveOrder);

// Hoàn tất / Giao đơn hàng
router.post('/orders/:id/deliver', OrderController.deliverOrder);
router.put('/orders/:id/deliver', OrderController.deliverOrder);

// Hủy đơn hàng
router.post('/orders/:id/cancel', OrderController.cancelOrder);
router.put('/orders/:id/cancel', OrderController.cancelOrder);

// Cập nhật thanh toán
router.put('/orders/:id/payment', OrderController.updatePayment);

// Xóa đơn hàng
router.delete('/orders/:id', OrderController.deleteOrder);

module.exports = router;
