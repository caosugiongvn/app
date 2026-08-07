const express = require('express');
const router = express.Router();
const NetworkController = require('../controllers/networkController');

// Lấy cây mạng lưới CTV
router.get('/network/tree', NetworkController.getNetworkTree);

module.exports = router;
