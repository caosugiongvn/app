const express = require('express');
const router = express.Router();
const CtvController = require('../controllers/ctvController');

// Danh sách CTV
router.get('/ctvs', CtvController.getCtvs);

// Danh sách Tài xế
router.get('/drivers', CtvController.getDrivers);

// Quản lý Khu vực bán hàng / giao hàng
router.get('/regions', CtvController.getRegions);
router.get('/regions/detailed', CtvController.getRegionsDetailed);
router.post('/regions', CtvController.addRegion);
router.put('/regions/rename', CtvController.renameRegion);
router.delete('/regions', CtvController.deleteRegion);

// Cấu hình chiết khấu hoa hồng
router.get('/ctvs/commission-settings', CtvController.getCommissionSettings);
router.post('/ctvs/commission-settings', CtvController.updateCommissionSettings);

// Bảng xếp hạng CTV
router.get('/ctvs/leaderboard', CtvController.getLeaderboard);

module.exports = router;
