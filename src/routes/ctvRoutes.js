const express = require('express');
const router = express.Router();
const CtvController = require('../controllers/ctvController');

// Danh sách CTV
router.get('/ctvs', CtvController.getCtvs);

// Danh sách Tài xế
router.get('/drivers', CtvController.getDrivers);

// Danh sách Khu vực
router.get('/regions', CtvController.getRegions);

// Cấu hình chiết khấu hoa hồng
router.get('/ctvs/commission-settings', CtvController.getCommissionSettings);
router.post('/ctvs/commission-settings', CtvController.updateCommissionSettings);

// Bảng xếp hạng CTV
router.get('/ctvs/leaderboard', CtvController.getLeaderboard);

module.exports = router;
