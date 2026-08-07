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

// Duyệt đơn hàng (Admin)
router.put('/orders/:id/approval', OrderController.approveOrder);

// Cập nhật thanh toán
router.put('/orders/:id/payment', OrderController.updatePayment);

// Xóa đơn hàng
router.delete('/orders/:id', OrderController.deleteOrder);

module.exports = router;
