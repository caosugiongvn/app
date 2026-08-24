const UserModel = require('../models/UserModel');

class AuthController {
  /**
   * Đăng ký tài khoản
   */
  static async register(req, res) {
    try {
      const { phone, password, confirmPassword, name } = req.body;

      if (!phone || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ Số điện thoại, Họ tên và Mật khẩu'
        });
      }

      if (confirmPassword !== undefined && password.trim() !== confirmPassword.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu và Nhập lại mật khẩu không trùng khớp!'
        });
      }

      const phoneRegex = /^[0-9]{9,11}$/;
      const cleanPhone = phone.trim();
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)'
        });
      }

      const newUser = await UserModel.createUser({
        phone: cleanPhone,
        password: password.trim(),
        name: name.trim(),
        role: 'CUSTOMER',
        region: 'Chưa phân công'
      });

      const { password: _, ...userWithoutPassword } = newUser;

      return res.json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Bạn có thể xem Báo Giá Sản Phẩm & Bảng Xếp Hạng CTV.',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('❌ Lỗi Controller đăng ký:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi hệ thống khi đăng ký'
      });
    }
  }

  /**
   * Đăng nhập
   */
  static async login(req, res) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Số điện thoại và Mật khẩu'
        });
      }

      const user = await UserModel.findByPhone(phone.trim());

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Số điện thoại này chưa được đăng ký tài khoản!'
        });
      }

      if (user.password !== password.trim()) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác'
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        message: `Đăng nhập thành công! Chào mừng ${user.name}`,
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('❌ Lỗi Controller đăng nhập:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đăng nhập'
      });
    }
  }

  /**
   * Đặt lại mật khẩu (Quên mật khẩu)
   */
  static async resetPassword(req, res) {
    try {
      const { phone, newPassword, confirmPassword } = req.body;

      if (!phone || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Số điện thoại và Mật khẩu mới!'
        });
      }

      if (confirmPassword !== undefined && newPassword.trim() !== confirmPassword.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!'
        });
      }

      const phoneRegex = /^[0-9]{9,11}$/;
      const cleanPhone = phone.trim();
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)'
        });
      }

      const user = await UserModel.findByPhone(cleanPhone);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Số điện thoại này chưa được đăng ký trong hệ thống!'
        });
      }

      await UserModel.updatePassword(cleanPhone, newPassword.trim());

      return res.json({
        success: true,
        message: '🔑 Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
      });
    } catch (error) {
      console.error('❌ Lỗi đặt lại mật khẩu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đặt lại mật khẩu'
      });
    }
  }

  /**
   * Gửi yêu cầu xin làm CTV
   */
  static async applyCTV(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Thiếu ID người dùng' });
      }

      await UserModel.applyCTV(userId);

      return res.json({
        success: true,
        message: 'Đã gửi yêu cầu đăng ký làm Cộng tác viên thành công! Vui lòng chờ Quản trị viên xét duyệt khu vực và vai trò.'
      });
    } catch (error) {
      console.error('❌ Lỗi Controller applyCTV:', error);
      return res.status(500).json({ success: false, message: error.message || 'Lỗi khi gửi yêu cầu làm CTV' });
    }
  }

  /**
   * Cập nhật Vai trò & Khu vực (Admin)
   */
  static async updateRoleAndRegion(req, res) {
    try {
      const { userId, role, region } = req.body;
      if (!userId || !role || !region) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ userId, role và region' });
      }

      const updatedUser = await UserModel.updateRoleAndRegion(userId, role, region);

      return res.json({
        success: true,
        message: `Đã duyệt vai trò [${role}] và cập nhật khu vực [${region}] thành công!`,
        data: updatedUser
      });
    } catch (error) {
      console.error('❌ Lỗi Controller updateRoleAndRegion:', error);
      return res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi cập nhật vai trò & khu vực' });
    }
  }

  /**
   * Lấy danh sách tất cả tài khoản người dùng
   */
  static async getUsers(req, res) {
    try {
      const users = await UserModel.getAllUsers();
      return res.json({
        success: true,
        totalUsers: users.length,
        data: users
      });
    } catch (error) {
      console.error('❌ Lỗi Controller getUsers:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi lấy danh sách người dùng'
      });
    }
  }
}

module.exports = AuthController;
