const dbMySQL = require('../../database-mysql');
const dbJSON = require('../../database');

class UserModel {
  /**
   * Đăng ký tài khoản người dùng mới
   */
  static async createUser({ phone, password, name, role = 'CUSTOMER', region = 'Chưa phân công' }) {
    try {
      const newUser = await dbMySQL.createUser({ phone, password, name, role, region });
      return newUser;
    } catch (mysqlErr) {
      if (mysqlErr.message.includes('đã được đăng ký')) {
        throw mysqlErr;
      }
      console.warn('⚠️ MySQL không khả dụng khi tạo user, dùng JSON DB fallback:', mysqlErr.message);

      const data = dbJSON.readData();
      data.users = data.users || [];

      const existing = data.users.find(u => u.phone === phone);
      if (existing) {
        throw new Error('Số điện thoại này đã được đăng ký tài khoản!');
      }

      const userId = `usr-${Date.now()}`;
      const newUser = {
        id: userId,
        phone,
        password,
        name,
        role,
        region,
        ctvRequest: 'NONE',
        createdAt: new Date().toISOString()
      };

      data.users.push(newUser);
      dbJSON.saveData(data);
      return newUser;
    }
  }

  /**
   * Tìm người dùng theo số điện thoại
   */
  static async findByPhone(phone) {
    try {
      const user = await dbMySQL.findUserByPhone(phone);
      if (user) return user;
    } catch (err) {
      console.warn('⚠️ Lỗi truy vấn MySQL login, fallback sang JSON:', err.message);
    }

    const data = dbJSON.readData();
    const users = data.users || [];
    return users.find(u => u.phone === phone) || null;
  }

  /**
   * Tìm người dùng theo ID
   */
  static async findById(id) {
    const data = dbJSON.readData();
    const users = data.users || [];
    return users.find(u => u.id === id) || null;
  }

  /**
   * Lấy danh sách tất cả tài khoản
   */
  static async getAllUsers() {
    try {
      const users = await dbMySQL.getAllUsers();
      if (users && users.length > 0) return users;
    } catch (err) {
      console.warn('⚠️ MySQL không khả dụng, dùng JSON DB:', err.message);
    }

    const data = dbJSON.readData();
    return (data.users || []).map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      region: u.region || 'Chưa phân công',
      ctvRequest: u.ctvRequest || 'NONE',
      createdAt: u.createdAt
    }));
  }

  /**
   * Gửi yêu cầu xin làm Cộng Tác Viên
   */
  static async applyCTV(userId) {
    try {
      await dbMySQL.applyCTV(userId);
      return true;
    } catch (err) {
      console.warn('⚠️ MySQL applyCTV fallback JSON:', err.message);
      const data = dbJSON.readData();
      const user = (data.users || []).find(u => u.id === userId);
      if (user) {
        user.ctvRequest = 'PENDING';
        dbJSON.saveData(data);
        return true;
      }
      throw new Error('Không tìm thấy tài khoản người dùng');
    }
  }

  /**
   * Cập nhật Vai trò & Khu vực người dùng (Admin)
   */
  static async updateRoleAndRegion(userId, role, region) {
    try {
      const updatedUser = await dbMySQL.updateUserRoleAndRegion(userId, role, region);
      if (updatedUser) return updatedUser;
    } catch (err) {
      console.warn('⚠️ MySQL update role-region fallback JSON:', err.message);
    }

    const data = dbJSON.readData();
    data.users = data.users || [];
    data.ctvs = data.ctvs || [];

    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('Không tìm thấy người dùng');
    }

    data.users[userIndex].role = role;
    data.users[userIndex].region = region;
    if (role === 'CTV') {
      data.users[userIndex].ctvRequest = 'APPROVED';

      const ctvExists = data.ctvs.find(c => c.phone === data.users[userIndex].phone || c.id === userId);
      if (!ctvExists) {
        data.ctvs.push({
          id: userId,
          name: data.users[userIndex].name,
          phone: data.users[userIndex].phone,
          region: region,
          points: 0,
          totalSales: 0,
          completedOrdersCount: 0
        });
      } else {
        ctvExists.region = region;
        ctvExists.name = data.users[userIndex].name;
      }
    }
    dbJSON.saveData(data);
    return data.users[userIndex];
  }
}

module.exports = UserModel;
