const express = require('express');
const router = express.Router();
const SystemController = require('../controllers/systemController');

// Lấy thông tin trạng thái hệ thống & Git version
router.get('/system/status', SystemController.getStatus);

// Kích hoạt Đồng bộ & Cập nhật Code 1-Click lên VPS Linux (git pull + pm2 reload)
router.post('/system/git-pull', SystemController.syncCode);
router.get('/system/git-pull', SystemController.syncCode);

module.exports = router;
