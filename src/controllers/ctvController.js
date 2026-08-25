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
   * Lấy danh sách Khu vực (Simple Array)
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
   * Lấy danh sách Khu vực chi tiết (kèm số tài khoản & đơn hàng)
   */
  static async getRegionsDetailed(req, res) {
    try {
      const detailed = await CtvModel.getRegionsDetailed();
      return res.json({ success: true, data: detailed });
    } catch (error) {
      console.error('❌ Lỗi Controller getRegionsDetailed:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khu vực chi tiết' });
    }
  }

  /**
   * Thêm khu vực bán hàng/giao hàng mới
   */
  static async addRegion(req, res) {
    try {
      const { name } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khu vực mới' });
      }
      const trimmed = String(name).trim();
      await CtvModel.addRegion(trimmed);
      return res.json({ success: true, message: `🎉 Đã thêm khu vực "${trimmed}" thành công!` });
    } catch (error) {
      console.error('❌ Lỗi Controller addRegion:', error);
      return res.status(500).json({ success: false, message: 'Lỗi thêm khu vực mới' });
    }
  }

  /**
   * Thay đổi tên khu vực & tự động đồng bộ tài khoản / đơn hàng
   */
  static async renameRegion(req, res) {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName || !String(newName).trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khu vực mới hợp lệ' });
      }
      const oldTrimmed = String(oldName).trim();
      const newTrimmed = String(newName).trim();
      await CtvModel.renameRegion(oldTrimmed, newTrimmed);
      return res.json({
        success: true,
        message: `🎉 Đã đổi tên khu vực từ "${oldTrimmed}" thành "${newTrimmed}" và tự động đồng bộ tất cả tài khoản/đơn hàng!`
      });
    } catch (error) {
      console.error('❌ Lỗi Controller renameRegion:', error);
      return res.status(500).json({ success: false, message: 'Lỗi đổi tên khu vực' });
    }
  }

  /**
   * Xóa khu vực
   */
  static async deleteRegion(req, res) {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn khu vực cần xóa' });
      }
      await CtvModel.deleteRegion(String(name).trim());
      return res.json({ success: true, message: `🗑️ Đã xóa khu vực "${name}" thành công!` });
    } catch (error) {
      console.error('❌ Lỗi Controller deleteRegion:', error);
      return res.status(500).json({ success: false, message: 'Lỗi xóa khu vực' });
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
