const ProductModel = require('../models/ProductModel');

class ProductController {
  /**
   * Lấy danh sách sản phẩm
   */
  static async getProducts(req, res) {
    try {
      const products = await ProductModel.getAllProducts();
      return res.json({ success: true, data: products });
    } catch (error) {
      console.error('❌ Lỗi Controller getProducts:', error);
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sản phẩm' });
    }
  }

  /**
   * Thêm sản phẩm mới
   */
  static async createProduct(req, res) {
    try {
      const { code, name, category, costPrice, sellingPrice, stock, points, unit } = req.body;

      if (!name || !costPrice || !sellingPrice) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tên, giá vốn và giá bán sản phẩm' });
      }

      const newProduct = await ProductModel.createProduct({
        code, name, category, costPrice, sellingPrice, stock, points, unit
      });

      return res.json({ success: true, message: 'Tạo sản phẩm thành công', data: newProduct });
    } catch (error) {
      console.error('❌ Lỗi Controller createProduct:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi tạo sản phẩm mới' });
    }
  }

  /**
   * Cập nhật thông tin sản phẩm
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updatedProduct = await ProductModel.updateProduct(id, req.body);

      return res.json({
        success: true,
        message: 'Cập nhật thông tin sản phẩm thành công',
        data: updatedProduct
      });
    } catch (error) {
      console.error('❌ Lỗi Controller updateProduct:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật sản phẩm' });
    }
  }

  /**
   * Nhập kho sản phẩm
   */
  static async importStock(req, res) {
    try {
      const { productId, qty, note } = req.body;

      if (!productId || !qty || Number(qty) <= 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ' });
      }

      const updatedProduct = await ProductModel.importStock(productId, qty, note);

      return res.json({
        success: true,
        message: `Nhập kho thành công ${qty} ${updatedProduct.unit} ${updatedProduct.name}`,
        data: updatedProduct
      });
    } catch (error) {
      console.error('❌ Lỗi Controller importStock:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi khi nhập kho' });
    }
  }

  /**
   * Xuất kho trực tiếp
   */
  static async exportStock(req, res) {
    try {
      const { productId, qty, note } = req.body;

      if (!productId || !qty || Number(qty) <= 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ' });
      }

      const updatedProduct = await ProductModel.exportStock(productId, qty, note);

      return res.json({
        success: true,
        message: `Xuất kho thành công ${qty} ${updatedProduct.unit} ${updatedProduct.name}`,
        data: updatedProduct
      });
    } catch (error) {
      console.error('❌ Lỗi Controller exportStock:', error);
      return res.status(400).json({ success: false, message: error.message || 'Lỗi khi xuất kho' });
    }
  }
}

module.exports = ProductController;
