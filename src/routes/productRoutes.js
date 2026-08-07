const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');

// Lấy danh sách sản phẩm
router.get('/products', ProductController.getProducts);

// Thêm sản phẩm mới
router.post('/products', ProductController.createProduct);

// Cập nhật sản phẩm
router.put('/products/:id', ProductController.updateProduct);

// Nhập kho bổ sung
router.post('/inventory/import', ProductController.importStock);

// Xuất kho trực tiếp
router.post('/inventory/export', ProductController.exportStock);

module.exports = router;
