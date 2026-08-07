const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Đăng ký tài khoản mới
router.post('/register', AuthController.register);

// Đăng nhập
router.post('/login', AuthController.login);

// Đăng ký làm CTV
router.post('/apply-ctv', AuthController.applyCTV);

// Quản trị viên cập nhật vai trò & khu vực
router.put('/users/role-region', AuthController.updateRoleAndRegion);

// Danh sách tài khoản người dùng
router.get('/users', AuthController.getUsers);

module.exports = router;
