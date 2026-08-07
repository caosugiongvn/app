const CtvModel = require('../models/CtvModel');

class CtvController {
  /**
   * Lấy danh sách CTV
   */
  static async getCtvs(req, res) {
    try {
      const ctvs = await CtvModel.getAllCtvs();
      return res.json({ success: true, data: ctvs });
    } catch (error) {
      console.error('❌ Lỗi Controller getCtvs:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách CTV' });
    }
  }

  /**
   * Lấy danh sách Tài xế
   */
  static async getDrivers(req, res) {
    try {
      const drivers = await CtvModel.getDrivers();
      return res.json({ success: true, data: drivers });
    } catch (error) {
      console.error('❌ Lỗi Controller getDrivers:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài xế' });
    }
  }

  /**
   * Lấy danh sách Khu vực
   */
  static async getRegions(req, res) {
    try {
      const regions = await CtvModel.getRegions();
      return res.json({ success: true, data: regions });
    } catch (error) {
      console.error('❌ Lỗi Controller getRegions:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khu vực' });
    }
  }

  /**
   * Lấy cấu hình chiết khấu hoa hồng
   */
  static async getCommissionSettings(req, res) {
    try {
      const settings = await CtvModel.getCommissionSettings();
      return res.json({ success: true, data: settings });
    } catch (error) {
      console.error('❌ Lỗi Controller getCommissionSettings:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình hoa hồng' });
    }
  }

  /**
   * Cập nhật cấu hình chiết khấu hoa hồng
   */
  static async updateCommissionSettings(req, res) {
    try {
      const updatedSettings = await CtvModel.updateCommissionSettings(req.body);
      return res.json({
        success: true,
        message: 'Cập nhật bảng hoa hồng đổi điểm thành công!',
        data: updatedSettings
      });
    } catch (error) {
      console.error('❌ Lỗi Controller updateCommissionSettings:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cấu hình hoa hồng' });
    }
  }

  /**
   * Bảng xếp hạng CTV theo khu vực
   */
  static async getLeaderboard(req, res) {
    try {
      const { region } = req.query;
      const data = await CtvModel.getLeaderboard(region);
      return res.json({
        success: true,
        regionFilter: region || 'Tất cả khu vực',
        settings: data.settings,
        data: data.leaderboard
      });
    } catch (error) {
      console.error('❌ Lỗi Controller getLeaderboard:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy bảng xếp hạng CTV' });
    }
  }
}

module.exports = CtvController;
