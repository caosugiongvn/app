const dbJSON = require('../../database');

class ReportModel {
  /**
   * Tổng quan báo cáo doanh thu & tồn kho
   */
  static async getSummaryReport() {
    const data = dbJSON.readData();
    const orders = data.orders || [];
    const products = data.products || [];
    const ctvs = data.ctvs || [];

    const completedOrders = orders.filter(o => o.status === 'COMPLETED');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCost = completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || 0)), 0);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrders: orders.length,
      completedOrdersCount: completedOrders.length,
      totalProducts: products.length,
      totalStock,
      totalStockValue,
      totalCtvs: ctvs.length
    };
  }

  /**
   * Báo cáo doanh thu theo khu vực
   */
  static async getRegionReport() {
    const data = dbJSON.readData();
    const orders = (data.orders || []).filter(o => o.status === 'COMPLETED');
    const regionMap = {};

    for (const order of orders) {
      const reg = order.ctvRegion || 'Chưa phân công';
      if (!regionMap[reg]) {
        regionMap[reg] = { region: reg, totalRevenue: 0, orderCount: 0 };
      }
      regionMap[reg].totalRevenue += order.totalAmount || 0;
      regionMap[reg].orderCount += 1;
    }

    return Object.values(regionMap);
  }

  /**
   * Ghi nhận lượt truy cập hệ thống
   */
  static async recordVisit() {
    const dbMySQL = require('../../database-mysql');
    try {
      const mysqlStats = await dbMySQL.recordVisit();
      if (mysqlStats) return mysqlStats;
    } catch (err) {}
    return dbJSON.recordVisit();
  }

  /**
   * Lấy thống kê lượt truy cập hệ thống
   */
  static async getVisitStats() {
    const dbMySQL = require('../../database-mysql');
    try {
      const mysqlStats = await dbMySQL.getVisitStats();
      if (mysqlStats) return mysqlStats;
    } catch (err) {}
    return dbJSON.getVisitStats();
  }
}

module.exports = ReportModel;
