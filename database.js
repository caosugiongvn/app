const fs = require('fs');
const path = require('path');
const config = require('./config');

class DatabaseEngine {
  constructor() {
    this.dbFile = config.DB_FILE;
    this.dataDir = config.DATA_DIR;
    this.ensureDataDirectory();
    this.initDatabase();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getInitialData() {
    return {
      commissionSettings: {
        topPointValue: 1000,
        standardPointValue: 500,
        topRate: 15,
        standardRate: 8,
        topBonusPointsMultiplier: 1.5
      },
      products: [],
      regions: [
        "Hà Nội",
        "TP. Hồ Chí Minh",
        "Đà Nẵng",
        "Hải Phòng",
        "Cần Thơ"
      ],
      users: [
        {
          id: "usr-1",
          phone: "0901234567",
          password: "123456",
          name: "Nguyễn Văn An",
          role: "CTV",
          region: "Hà Nội",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-2",
          phone: "0912345678",
          password: "123456",
          name: "Lê Thị Bích",
          role: "CTV",
          region: "TP. Hồ Chí Minh",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-3",
          phone: "0923456789",
          password: "123456",
          name: "Trần Minh Cường",
          role: "CTV",
          region: "Hà Nội",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-4",
          phone: "0934567890",
          password: "123456",
          name: "Phạm Thu Hà",
          role: "CTV",
          region: "Đà Nẵng",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-drv1",
          phone: "0988111222",
          password: "123456",
          name: "Hoàng Văn Tuấn",
          role: "DRIVER",
          region: "Hà Nội",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-drv2",
          phone: "0988333444",
          password: "123456",
          name: "Nguyễn Tiến Đạt",
          role: "DRIVER",
          region: "TP. Hồ Chí Minh",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-admin-hoa",
          phone: "0979366316",
          password: "TH2532621991",
          name: "Nguyễn Thanh Hoà",
          role: "ADMIN",
          region: "Hà Nội",
          ctvRequest: "NONE",
          createdAt: new Date().toISOString()
        }
      ],
      ctvs: [
        {
          id: "ctv-1",
          name: "Nguyễn Văn An",
          phone: "0901234567",
          region: "Hà Nội",
          points: 250,
          totalSales: 2750000,
          completedOrdersCount: 5
        },
        {
          id: "ctv-2",
          name: "Lê Thị Bích",
          phone: "0912345678",
          region: "TP. Hồ Chí Minh",
          points: 420,
          totalSales: 4800000,
          completedOrdersCount: 8
        },
        {
          id: "ctv-3",
          name: "Trần Minh Cường",
          phone: "0923456789",
          region: "Hà Nội",
          points: 180,
          totalSales: 1980000,
          completedOrdersCount: 3
        },
        {
          id: "ctv-4",
          name: "Phạm Thu Hà",
          phone: "0934567890",
          region: "Đà Nẵng",
          points: 310,
          totalSales: 3400000,
          completedOrdersCount: 6
        }
      ],
      drivers: [
        {
          id: "drv-1",
          name: "Hoàng Văn Tuấn",
          phone: "0988111222",
          vehicle: "Xe máy (29F1-123.45)"
        },
        {
          id: "drv-2",
          name: "Nguyễn Tiến Đạt",
          phone: "0988333444",
          vehicle: "Xe bán tải (51D-987.65)"
        }
      ],
      orders: [
        {
          id: "ORD-1001",
          ctvId: "ctv-1",
          ctvName: "Nguyễn Văn An",
          ctvRegion: "Hà Nội",
          driverId: "drv-1",
          driverName: "Hoàng Văn Tuấn",
          customerName: "Đặng Thị Mai",
          customerPhone: "0977123456",
          address: "123 Đường Xuân Thủy, Cầu Giấy, Hà Nội",
          items: [
            {
              productId: "prod-1",
              productName: "Tai nghe không dây Premium Pro",
              qty: 1,
              costPrice: 280000,
              sellingPrice: 550000,
              pointsPerUnit: 50
            }
          ],
          totalAmount: 550000,
          totalCost: 280000,
          profit: 270000,
          earnedPoints: 50,
          status: "DELIVERED",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          deliveredAt: new Date(Date.now() - 86400000 * 1).toISOString()
        }
      ],
      stockTransactions: [
        {
          id: "tx-101",
          type: "IMPORT",
          productId: "prod-1",
          productName: "Tai nghe không dây Premium Pro",
          qty: 51,
          note: "Khởi tạo tồn kho ban đầu",
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
          id: "tx-102",
          type: "DEDUCT",
          productId: "prod-1",
          productName: "Tai nghe không dây Premium Pro",
          qty: 1,
          note: "Giao thành công đơn ORD-1001",
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
        }
      ]
    };
  }

  initDatabase() {
    if (!fs.existsSync(this.dbFile)) {
      const initialData = this.getInitialData();
      this.saveData(initialData);
      console.log('✅ Đã khởi tạo cơ sở dữ liệu ban đầu tại:', this.dbFile);
    }
  }

  readData() {
    try {
      const raw = fs.readFileSync(this.dbFile, 'utf8');
      const data = JSON.parse(raw);

      // Tự động đảm bảo luôn có tài khoản Admin và cấu hình chiết khấu sẵn sàng
      data.users = data.users || [];
      data.quickPurchases = data.quickPurchases || [];
      data.commissionSettings = data.commissionSettings || { topPointValue: 1000, standardPointValue: 500, topRate: 15, standardRate: 8, topBonusPointsMultiplier: 1.5 };
      const defaultUsers = this.getInitialData().users || [];
      let updated = false;

      for (const defUser of defaultUsers) {
        if (!data.users.some(u => u.phone === defUser.phone)) {
          data.users.push(defUser);
          updated = true;
        }
      }

      if (updated) {
        this.saveData(data);
      }

      return data;
    } catch (error) {
      console.error('❌ Lỗi đọc DB, khôi phục dữ liệu ban đầu:', error.message);
      const initial = this.getInitialData();
      this.saveData(initial);
      return initial;
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('❌ Lỗi ghi DB:', error.message);
      return false;
    }
  }

  addRegion(name) {
    const data = this.readData();
    if (!data.regions) data.regions = [];
    const trimmed = String(name).trim();
    if (trimmed && !data.regions.includes(trimmed)) {
      data.regions.push(trimmed);
      this.saveData(data);
    }
    return data.regions;
  }

  renameRegion(oldName, newName) {
    const data = this.readData();
    if (!data.regions) return [];
    const oldTrimmed = String(oldName).trim();
    const newTrimmed = String(newName).trim();
    const idx = data.regions.indexOf(oldTrimmed);
    if (idx !== -1 && newTrimmed) {
      data.regions[idx] = newTrimmed;
      (data.users || []).forEach(u => { if (u.region === oldTrimmed) u.region = newTrimmed; });
      (data.ctvs || []).forEach(c => { if (c.region === oldTrimmed) c.region = newTrimmed; });
      (data.orders || []).forEach(o => { if (o.ctvRegion === oldTrimmed) o.ctvRegion = newTrimmed; });
      this.saveData(data);
    }
    return data.regions;
  }

  deleteRegion(name) {
    const data = this.readData();
    if (!data.regions) return [];
    const trimmed = String(name).trim();
    data.regions = data.regions.filter(r => r !== trimmed);
    (data.users || []).forEach(u => { if (u.region === trimmed) u.region = 'Chưa phân công'; });
    (data.ctvs || []).forEach(c => { if (c.region === trimmed) c.region = 'Chưa phân công'; });
    this.saveData(data);
    return data.regions;
  }
}

module.exports = new DatabaseEngine();
