const dbJSON = require('../../database');
const OrderModel = require('./OrderModel');

class QuickPurchaseModel {
  /**
   * Tạo liên kết/mã mua nhanh sản phẩm cho CTV
   */
  static async createQuickLink({ ctvId, productId, qty }) {
    const data = dbJSON.readData();
    data.quickPurchases = data.quickPurchases || [];

    const product = (data.products || []).find(p => p.id === productId);
    if (!product) throw new Error('Không tìm thấy sản phẩm');

    const ctv = (data.ctvs || []).find(c => c.id === ctvId);
    if (!ctv) throw new Error('Không tìm thấy CTV');

    const code = `QP${Math.floor(100000 + Math.random() * 900000)}`;
    const quickItem = {
      id: `qp-${Date.now()}`,
      code,
      ctvId,
      ctvName: ctv.name,
      ctvRegion: ctv.region,
      productId,
      productName: product.name,
      sellingPrice: product.sellingPrice,
      qty: Number(qty) || 1,
      createdAt: new Date().toISOString()
    };

    data.quickPurchases.push(quickItem);
    dbJSON.saveData(data);
    return quickItem;
  }

  /**
   * Xác thực mã mua nhanh
   */
  static async validateCode(code) {
    const data = dbJSON.readData();
    const qp = (data.quickPurchases || []).find(q => q.code === code);
    if (!qp) throw new Error('Mã mua nhanh không tồn tại hoặc đã hết hạn');

    const product = (data.products || []).find(p => p.id === qp.productId);
    if (!product) throw new Error('Sản phẩm trong liên kết mua nhanh không còn tồn tại');

    return {
      ...qp,
      product
    };
  }

  /**
   * Đặt hàng nhanh từ khách hàng qua Quick Purchase link
   */
  static async submitQuickOrder({ code, customerName, customerPhone, address }) {
    const qpInfo = await this.validateCode(code);

    const orderData = {
      ctvId: qpInfo.ctvId,
      customerName,
      customerPhone,
      address,
      items: [
        {
          productId: qpInfo.productId,
          qty: qpInfo.qty
        }
      ]
    };

    return await OrderModel.createOrder(orderData);
  }
}

module.exports = QuickPurchaseModel;
