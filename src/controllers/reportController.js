const dbJSON = require('../../database');
const ReportModel = require('../models/ReportModel');

class ReportController {
  /**
   * Báo cáo Dashboard chính cho trang chủ
   */
  static async getDashboardReport(req, res) {
    try {
      const data = dbJSON.readData();
      const orders = data.orders || [];
      const products = data.products || [];
      const ctvs = data.ctvs || [];

      const completedOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED');
      const pendingOrders = orders.filter(o => o.status === 'PENDING');

      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalCost = completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%';

      const totalStockCount = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const totalReservedCount = products.reduce((sum, p) => sum + (p.reserved || 0), 0);
      const totalAvailableCount = totalStockCount - totalReservedCount;

      const regionMap = {};
      for (const order of completedOrders) {
        const reg = order.ctvRegion || 'Chưa phân công';
        if (!regionMap[reg]) {
          regionMap[reg] = { region: reg, revenue: 0, profit: 0, deliveredOrdersCount: 0 };
        }
        regionMap[reg].revenue += (order.totalAmount || 0);
        regionMap[reg].profit += ((order.totalAmount || 0) - (order.totalCost || 0));
        regionMap[reg].deliveredOrdersCount += 1;
      }

      return res.json({
        success: true,
        data: {
          financial: {
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin
          },
          inventory: {
            totalStockCount,
            totalReservedCount,
            totalAvailableCount
          },
          orders: {
            totalCount: orders.length,
            completedCount: completedOrders.length,
            pendingCount: pendingOrders.length
          },
          regions: Object.values(regionMap)
        }
      });
    } catch (error) {
      console.error('❌ Lỗi Controller getDashboardReport:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo Dashboard' });
    }
  }

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
