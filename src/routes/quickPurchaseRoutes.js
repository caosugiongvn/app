const express = require('express');
const router = express.Router();
const QuickPurchaseController = require('../controllers/quickPurchaseController');

// Tạo mã mua nhanh
router.post('/quick-purchase/create', QuickPurchaseController.createLink);

// Xác thực mã mua nhanh
router.get('/quick-purchase/:code', QuickPurchaseController.validateCode);

// Đặt hàng mua nhanh
router.post('/quick-purchase/submit', QuickPurchaseController.submitOrder);

module.exports = router;
