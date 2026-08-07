const ReportModel = require('../models/ReportModel');

class ReportController {
  /**
   * Báo cáo tổng quan doanh thu & kho
   */
  static async getSummaryReport(req, res) {
    try {
      const summary = await ReportModel.getSummaryReport();
      return res.json({ success: true, data: summary });
    } catch (error) {
      console.error('❌ Lỗi Controller getSummaryReport:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo tổng quan' });
    }
  }

  /**
   * Báo cáo theo khu vực
   */
  static async getRegionReport(req, res) {
    try {
      const report = await ReportModel.getRegionReport();
      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('❌ Lỗi Controller getRegionReport:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo khu vực' });
    }
  }
}

module.exports = ReportController;
