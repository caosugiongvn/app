const dbMySQL = require('../../database-mysql');
const dbJSON = require('../../database');

class ProductModel {
  /**
   * Lấy danh sách sản phẩm kèm tồn kho khả dụng
   */
  static async getAllProducts() {
    try {
      const mysqlProducts = await dbMySQL.getProducts();
      if (mysqlProducts && mysqlProducts.length > 0) return mysqlProducts;
    } catch (err) {
      console.warn('⚠️ Lỗi getProducts MySQL, fallback JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    return (data.products || []).map(p => ({
      ...p,
      available: p.stock - (p.reserved || 0)
    }));
  }

  /**
   * Thêm sản phẩm mới
   */
  static async createProduct({ code, name, category, costPrice, originalPrice, promoPrice, sellingPrice, stock, points, unit }) {
    const data = dbJSON.readData();
    const orig = Number(originalPrice || sellingPrice) || 0;
    const promo = Number(promoPrice) || 0;
    const effSelling = promo > 0 ? promo : (Number(sellingPrice) || orig);

    const newProduct = {
      id: `prod-${Date.now()}`,
      code: code || `SP${Math.floor(100 + Math.random() * 900)}`,
      name,
      category: category || 'Chung',
      costPrice: Number(costPrice) || 0,
      originalPrice: orig,
      promoPrice: promo,
      sellingPrice: effSelling,
      stock: Number(stock) || 0,
      reserved: 0,
      points: Number(points) || 0,
      unit: unit || 'Cái'
    };

    data.products.push(newProduct);

    if (newProduct.stock > 0) {
      data.stockTransactions.push({
        id: `tx-${Date.now()}`,
        type: 'IMPORT',
        productId: newProduct.id,
        productName: newProduct.name,
        qty: newProduct.stock,
        note: 'Khởi tạo sản phẩm mới',
        createdAt: new Date().toISOString()
      });
    }

    dbJSON.saveData(data);
    return newProduct;
  }

  /**
   * Cập nhật thông tin sản phẩm
   */
  static async updateProduct(id, updateData) {
    try {
      const updatedMysql = await dbMySQL.updateProduct(id, updateData);
      if (updatedMysql) return updatedMysql;
    } catch (err) {
      console.warn('⚠️ Lỗi MySQL updateProduct, fallback sang JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    const productIndex = data.products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    const product = data.products[productIndex];
    const { code, name, category, costPrice, originalPrice, promoPrice, sellingPrice, stock, points, unit } = updateData;

    if (code !== undefined && String(code).trim() !== '') product.code = String(code).trim();
    if (name !== undefined && String(name).trim() !== '') product.name = String(name).trim();
    if (category !== undefined) product.category = category;
    if (costPrice !== undefined && !isNaN(Number(costPrice))) product.costPrice = Number(costPrice);
    if (originalPrice !== undefined && !isNaN(Number(originalPrice))) product.originalPrice = Number(originalPrice);
    if (promoPrice !== undefined && !isNaN(Number(promoPrice))) product.promoPrice = Number(promoPrice);
    
    if (promoPrice !== undefined || originalPrice !== undefined || sellingPrice !== undefined) {
      const p = Number(product.promoPrice || 0);
      const o = Number(product.originalPrice || product.sellingPrice || 0);
      product.sellingPrice = p > 0 ? p : (o > 0 ? o : Number(sellingPrice || product.sellingPrice || 0));
    }

    if (points !== undefined && !isNaN(Number(points))) product.points = Number(points);
    if (unit !== undefined) product.unit = unit;

    if (stock !== undefined && !isNaN(Number(stock))) {
      const oldStock = Number(product.stock) || 0;
      const newStock = Math.max(0, Number(stock));
      if (oldStock !== newStock) {
        product.stock = newStock;
        const diff = newStock - oldStock;
        data.stockTransactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          type: diff > 0 ? 'IMPORT' : 'EXPORT',
          productId: product.id,
          productName: product.name,
          qty: Math.abs(diff),
          note: 'Admin điều chỉnh số lượng trực tiếp trong tồn kho',
          createdAt: new Date().toISOString()
        });
      }
    }

    dbJSON.saveData(data);
    return {
      ...product,
      available: product.stock - (product.reserved || 0)
    };
  }

  /**
   * Nhập kho bổ sung sản phẩm
   */
  static async importStock(productId, qty, note) {
    const data = dbJSON.readData();
    const product = data.products.find(p => p.id === productId);

    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    const importQty = Number(qty);
    product.stock += importQty;

    data.stockTransactions.push({
      id: `tx-${Date.now()}`,
      type: 'IMPORT',
      productId: product.id,
      productName: product.name,
      qty: importQty,
      note: note || 'Nhập kho bổ sung',
      createdAt: new Date().toISOString()
    });

    dbJSON.saveData(data);
    return {
      ...product,
      available: product.stock - product.reserved
    };
  }

  /**
   * Xuất kho trực tiếp
   */
  static async exportStock(productId, qty, note) {
    const data = dbJSON.readData();
    const product = data.products.find(p => p.id === productId);

    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    const exportQty = Number(qty);
    const available = product.stock - product.reserved;

    if (exportQty > available) {
      throw new Error(`Tồn kho khả dụng không đủ (${available} < ${exportQty})`);
    }

    product.stock -= exportQty;

    data.stockTransactions.push({
      id: `tx-${Date.now()}`,
      type: 'EXPORT',
      productId: product.id,
      productName: product.name,
      qty: exportQty,
      note: note || 'Xuất kho trực tiếp',
      createdAt: new Date().toISOString()
    });

    dbJSON.saveData(data);
    return {
      ...product,
      available: product.stock - product.reserved
    };
  }
}

module.exports = ProductModel;
