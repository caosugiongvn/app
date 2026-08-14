const express = require('express');
const router = express.Router();
const NetworkController = require('../controllers/networkController');

// Lấy cây mạng lưới CTV
router.get('/network/tree', NetworkController.getNetworkTree);

// Lấy thông tin mạng lưới & Mã QR kết nối từ xa
router.get('/network-info', NetworkController.getNetworkInfo);
router.get('/network/info', NetworkController.getNetworkInfo);

module.exports = router;
