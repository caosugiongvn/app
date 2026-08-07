const dbMySQL = require('../../database-mysql');
const dbJSON = require('../../database');

class OrderModel {
  /**
   * Lấy danh sách đơn hàng theo bộ lọc (ctvId, driverId, status, region)
   */
  static async getOrders(filters = {}) {
    try {
      const mysqlOrders = await dbMySQL.getOrders(filters);
      if (mysqlOrders) return mysqlOrders;
    } catch (err) {
      console.warn('⚠️ Lỗi lấy danh sách đơn từ MySQL, fallback JSON DB:', err.message);
    }

    const { ctvId, driverId, status, region } = filters;
    const data = dbJSON.readData();
    let orders = data.orders || [];

    if (ctvId) orders = orders.filter(o => o.ctvId === ctvId);
    if (driverId) orders = orders.filter(o => o.driverId === driverId);
    if (status) orders = orders.filter(o => o.status === status);
    if (region) orders = orders.filter(o => o.ctvRegion === region);

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return orders;
  }

  /**
   * Tạo đơn hàng mới
   */
  static async createOrder({ ctvId, driverId, customerName, customerPhone, address, items }) {
    try {
      const result = await dbMySQL.createOrder({
        ctvId,
        driverId,
        customerName,
        customerPhone,
        address,
        items
      });
      return result;
    } catch (mysqlErr) {
      if (mysqlErr.message.includes('không đủ tồn kho') || mysqlErr.message.includes('không tồn tại')) {
        throw mysqlErr;
      }
      console.warn('⚠️ MySQL không sẵn sàng, fallback tạo đơn sang JSON DB:', mysqlErr.message);
    }

    const data = dbJSON.readData();
    const ctv = data.ctvs.find(c => c.id === ctvId);
    if (!ctv) {
      throw new Error('Không tìm thấy thông tin Cộng tác viên');
    }

    let driverName = 'Chưa phân công';
    if (driverId) {
      const driver = data.drivers.find(d => d.id === driverId);
      if (driver) driverName = driver.name;
    }

    const orderItems = [];
    let totalAmount = 0;
    let totalCost = 0;
    let totalEarnedPoints = 0;

    for (const item of items) {
      const product = data.products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`Sản phẩm ID ${item.productId} không tồn tại`);
      }

      const qty = Number(item.qty);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Số lượng cho sản phẩm ${product.name} không hợp lệ`);
      }

      const available = product.stock - product.reserved;
      if (qty > available) {
        throw new Error(`Sản phẩm "${product.name}" không đủ tồn kho khả dụng (${available} < ${qty})`);
      }

      const itemTotalSelling = product.sellingPrice * qty;
      const itemTotalCost = product.costPrice * qty;
      const itemPoints = (product.points || 0) * qty;

      product.reserved += qty;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        totalSellingPrice: itemTotalSelling,
        earnedPoints: itemPoints
      });

      totalAmount += itemTotalSelling;
      totalCost += itemTotalCost;
      totalEarnedPoints += itemPoints;
    }

    const newOrder = {
      id: `ord-${Date.now()}`,
      code: `DH${Math.floor(100000 + Math.random() * 900000)}`,
      ctvId: ctv.id,
      ctvName: ctv.name,
      ctvRegion: ctv.region,
      driverId: driverId || null,
      driverName: driverName,
      customerName,
      customerPhone,
      address,
      items: orderItems,
      totalAmount,
      totalCost,
      earnedPoints: totalEarnedPoints,
      status: 'PENDING',
      approvalStatus: 'PENDING',
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString()
    };

    data.orders.push(newOrder);
    dbJSON.saveData(data);
    return newOrder;
  }

  /**
   * Cập nhật trạng thái đơn hàng (PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED)
   */
  static async updateOrderStatus(orderId, status) {
    try {
      const updatedMysql = await dbMySQL.updateOrderStatus(orderId, status);
      if (updatedMysql) return updatedMysql;
    } catch (err) {
      console.warn('⚠️ Lỗi updateOrderStatus MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const order = data.orders.find(o => o.id === orderId);

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    const oldStatus = order.status;
    order.status = status;

    if (oldStatus !== 'COMPLETED' && status === 'COMPLETED') {
      order.completedAt = new Date().toISOString();

      for (const item of order.items) {
        const product = data.products.find(p => p.id === item.productId);
        if (product) {
          product.stock -= item.qty;
          product.reserved = Math.max(0, product.reserved - item.qty);

          data.stockTransactions.push({
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type: 'EXPORT',
            productId: product.id,
            productName: product.name,
            qty: item.qty,
            note: `Xuất kho hoàn tất đơn hàng ${order.code}`,
            createdAt: new Date().toISOString()
          });
        }
      }

      const ctv = data.ctvs.find(c => c.id === order.ctvId);
      if (ctv) {
        ctv.totalSales = (ctv.totalSales || 0) + order.totalAmount;
        ctv.points = (ctv.points || 0) + (order.earnedPoints || 0);
        ctv.completedOrdersCount = (ctv.completedOrdersCount || 0) + 1;
      }
    } else if (oldStatus !== 'CANCELLED' && status === 'CANCELLED') {
      for (const item of order.items) {
        const product = data.products.find(p => p.id === item.productId);
        if (product) {
          product.reserved = Math.max(0, product.reserved - item.qty);
        }
      }
    }

    dbJSON.saveData(data);
    return order;
  }

  /**
   * Phân công tài xế giao hàng
   */
  static async assignDriver(orderId, driverId, estimatedDeliveryTime = '') {
    try {
      const updatedMysql = await dbMySQL.assignDriver(orderId, driverId, estimatedDeliveryTime);
      if (updatedMysql) return updatedMysql;
    } catch (err) {
      console.warn('⚠️ Lỗi assignDriver MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const order = data.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const driver = data.drivers.find(d => d.id === driverId);
    if (!driver) throw new Error('Không tìm thấy tài xế');

    order.driverId = driver.id;
    order.driverName = driver.name;
    if (estimatedDeliveryTime) order.estimatedDeliveryTime = estimatedDeliveryTime;

    dbJSON.saveData(data);
    return order;
  }

  /**
   * Duyệt đơn hàng (Admin)
   */
  static async approveOrder(orderId, approvalStatus) {
    try {
      const updatedMysql = await dbMySQL.approveOrder(orderId, approvalStatus);
      if (updatedMysql) return updatedMysql;
    } catch (err) {
      console.warn('⚠️ Lỗi approveOrder MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const order = data.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    order.approvalStatus = approvalStatus;
    if (approvalStatus === 'APPROVED') {
      order.approvedAt = new Date().toISOString();
    }
    dbJSON.saveData(data);
    return order;
  }

  /**
   * Cập nhật thanh toán (Tài xế/Admin thu tiền mặt, chuyển khoản, ghi nợ)
   */
  static async updatePayment(orderId, { cashAmount = 0, transferAmount = 0, debtAmount = 0, paymentNote = '' }) {
    try {
      const updatedMysql = await dbMySQL.updatePayment(orderId, { cashAmount, transferAmount, debtAmount, paymentNote });
      if (updatedMysql) return updatedMysql;
    } catch (err) {
      console.warn('⚠️ Lỗi updatePayment MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const order = data.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    order.cashAmount = Number(cashAmount) || 0;
    order.transferAmount = Number(transferAmount) || 0;
    order.debtAmount = Number(debtAmount) || 0;
    order.paymentNote = paymentNote || '';

    const paidTotal = order.cashAmount + order.transferAmount;
    if (paidTotal >= order.totalAmount) {
      order.paymentStatus = 'PAID';
    } else if (paidTotal > 0 || order.debtAmount > 0) {
      order.paymentStatus = 'PARTIAL';
    }

    dbJSON.saveData(data);
    return order;
  }

  /**
   * Xóa đơn hàng
   */
  static async deleteOrder(orderId) {
    try {
      await dbMySQL.deleteOrder(orderId);
      return true;
    } catch (err) {
      console.warn('⚠️ Lỗi deleteOrder MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const index = data.orders.findIndex(o => o.id === orderId);
    if (index === -1) throw new Error('Không tìm thấy đơn hàng');

    const order = data.orders[index];
    if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
      for (const item of order.items) {
        const product = data.products.find(p => p.id === item.productId);
        if (product) {
          product.reserved = Math.max(0, product.reserved - item.qty);
        }
      }
    }

    data.orders.splice(index, 1);
    dbJSON.saveData(data);
    return true;
  }
}

module.exports = OrderModel;
