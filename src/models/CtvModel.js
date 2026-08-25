const dbMySQL = require('../../database-mysql');
const dbJSON = require('../../database');

class CtvModel {
  /**
   * Lấy danh sách tất cả CTV
   */
  static async getAllCtvs() {
    const data = dbJSON.readData();
    return data.ctvs || [];
  }

  /**
   * Lấy danh sách Tài xế
   */
  static async getDrivers() {
    try {
      const drivers = await dbMySQL.getDrivers();
      if (drivers && drivers.length > 0) return drivers;
    } catch (err) {
      console.warn('⚠️ Lỗi getDrivers MySQL, fallback JSON DB:', err.message);
    }
    const data = dbJSON.readData();
    return data.drivers || [];
  }

  /**
   * Lấy danh sách Khu vực (Simple Array)
   */
  static async getRegions() {
    try {
      const mysqlRegions = await dbMySQL.getRegions();
      if (mysqlRegions && mysqlRegions.length > 0) return mysqlRegions;
    } catch (err) {}

    const data = dbJSON.readData();
    return data.regions || [];
  }

  /**
   * Lấy danh sách Khu vực chi tiết kèm số tài khoản & đơn hàng
   */
  static async getRegionsDetailed() {
    try {
      const detailed = await dbMySQL.getRegionsDetailed();
      if (detailed && detailed.length > 0) return detailed;
    } catch (err) {}

    const data = dbJSON.readData();
    const regions = data.regions || [];
    return regions.map((name, id) => {
      const uCount = (data.users || []).filter(u => u.region === name).length;
      const oCount = (data.orders || []).filter(o => o.ctvRegion === name || o.ctv_region === name).length;
      return { id: id + 1, name, userCount: uCount, orderCount: oCount };
    });
  }

  /**
   * Thêm khu vực mới
   */
  static async addRegion(name) {
    try {
      await dbMySQL.addRegion(name);
    } catch (err) {}
    dbJSON.addRegion(name);
    return true;
  }

  /**
   * Đổi tên khu vực và tự động đồng bộ tài khoản/đơn hàng
   */
  static async renameRegion(oldName, newName) {
    try {
      await dbMySQL.renameRegion(oldName, newName);
    } catch (err) {}
    dbJSON.renameRegion(oldName, newName);
    return true;
  }

  /**
   * Xóa khu vực
   */
  static async deleteRegion(name) {
    try {
      await dbMySQL.deleteRegion(name);
    } catch (err) {}
    dbJSON.deleteRegion(name);
    return true;
  }

  /**
   * Lấy cấu hình Hoa hồng & Đổi điểm CTV
   */
  static async getCommissionSettings() {
    try {
      const mysqlSettings = await dbMySQL.getCommissionSettings();
      if (mysqlSettings) return mysqlSettings;
    } catch (err) {
      console.warn('⚠️ Fallback commission settings sang JSON DB');
    }

    const data = dbJSON.readData();
    return data.commissionSettings || {
      topPointValue: 1000,
      standardPointValue: 500,
      topRate: 15,
      standardRate: 8,
      topBonusPointsMultiplier: 1.5
    };
  }

  /**
   * Cập nhật cấu hình Hoa hồng CTV (Admin)
   */
  static async updateCommissionSettings({ topPointValue, standardPointValue, topRate, standardRate, topBonusPointsMultiplier }) {
    const tpv = Math.max(0, Number(topPointValue !== undefined ? topPointValue : 1000));
    const spv = Math.max(0, Number(standardPointValue !== undefined ? standardPointValue : 500));
    const tr = Math.max(0, Number(topRate !== undefined ? topRate : 15));
    const sr = Math.max(0, Number(standardRate !== undefined ? standardRate : 8));
    const mult = Math.max(1, Number(topBonusPointsMultiplier !== undefined ? topBonusPointsMultiplier : 1.5));

    try {
      await dbMySQL.updateCommissionSettings({
        topPointValue: tpv,
        standardPointValue: spv,
        topRate: tr,
        standardRate: sr,
        topBonusPointsMultiplier: mult
      });
    } catch (err) {
      console.warn('⚠️ MySQL updateCommissionSettings fallback sang JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    data.commissionSettings = {
      topPointValue: tpv,
      standardPointValue: spv,
      topRate: tr,
      standardRate: sr,
      topBonusPointsMultiplier: mult
    };

    dbJSON.saveData(data);
    return data.commissionSettings;
  }

  /**
   * Bảng xếp hạng CTV theo khu vực & tính hoa hồng
   */
  static async getLeaderboard(regionFilter) {
    const data = dbJSON.readData();
    let settings = await this.getCommissionSettings();

    let list = [...(data.ctvs || [])];

    if (regionFilter && regionFilter !== 'ALL' && regionFilter !== 'Tất cả khu vực' && regionFilter.trim() !== '') {
      list = list.filter(c => c.region === regionFilter);
    }

    list.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));

    const result = list.map((ctv, index) => {
      const isTop1 = (index === 0 && (ctv.totalSales || 0) > 0);

      const bonusRate = isTop1 ? (settings.topRate || 15) : (settings.standardRate || 8);
      const pointRate = isTop1 ? (settings.topPointValue || 1000) : (settings.standardPointValue || 500);

      const estimatedCommission = ((ctv.totalSales || 0) * bonusRate) / 100;
      const pointsMoneyValue = (ctv.points || 0) * pointRate;
      const totalIncome = estimatedCommission + pointsMoneyValue;

      return {
        rank: index + 1,
        id: ctv.id,
        name: ctv.name,
        phone: ctv.phone,
        region: ctv.region,
        totalSales: ctv.totalSales || 0,
        completedOrdersCount: ctv.completedOrdersCount || 0,
        points: ctv.points || 0,
        isTop1,
        bonusRate: `${bonusRate}%`,
        pointRateFormatted: `${pointRate.toLocaleString('vi-VN')} đ/điểm`,
        estimatedCommission,
        pointsMoneyValue,
        totalIncome
      };
    });

    return {
      settings,
      leaderboard: result
    };
  }
}

module.exports = CtvModel;
