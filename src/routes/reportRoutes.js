const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');

// Báo cáo tổng quan
router.get('/reports/summary', ReportController.getSummaryReport);

// Báo cáo theo khu vực
router.get('/reports/region', ReportController.getRegionReport);

module.exports = router;
