const dbJSON = require('../database');
const dbMySQL = require('../database-mysql');

async function migrateSuperAdmin() {
  console.log('================================================================');
  console.log('👑 MIGRATING SUPER ADMIN TO PHONE 0979366316 (Nguyễn Thanh Hoà)');
  console.log('================================================================\n');

  const targetPhone = '0979366316';
  const oldAdminPhone = '0999999999';

  // 1. Migrate JSON DB
  try {
    const data = dbJSON.readData();
    data.users = data.users || [];

    // Delete old admin
    data.users = data.users.filter(u => u.phone !== oldAdminPhone && u.id !== 'usr-admin');

    // Find target user 0979366316
    let targetUser = data.users.find(u => u.phone === targetPhone);
    if (targetUser) {
      targetUser.role = 'ADMIN';
      targetUser.ctvRequest = 'NONE';
      console.log('   ✅ Promoted user 0979366316 (Nguyễn Thanh Hoà) to ADMIN in JSON DB');
    } else {
      // Create if missing
      targetUser = {
        id: 'usr-admin-hoa',
        phone: targetPhone,
        password: 'TH2532621991',
        name: 'Nguyễn Thanh Hoà',
        role: 'ADMIN',
        region: 'Hà Nội',
        ctvRequest: 'NONE',
        createdAt: new Date().toISOString()
      };
      data.users.push(targetUser);
      console.log('   ✅ Created super admin 0979366316 (Nguyễn Thanh Hoà) in JSON DB');
    }

    dbJSON.saveData(data);
    console.log('   ✅ Saved updated db.json');
  } catch (err) {
    console.error('   ❌ JSON DB migration error:', err.message);
  }

  // 2. Migrate MySQL DB (if running)
  try {
    const initRes = await dbMySQL.initDatabase();
    if (initRes && dbMySQL.pool) {
      // Delete old admin from MySQL
      await dbMySQL.pool.query('DELETE FROM users WHERE phone = ? OR id = ?', [oldAdminPhone, 'usr-admin']);
      console.log('   ✅ Deleted old admin (0999999999) from MySQL');

      // Update or insert target user 0979366316
      const [existing] = await dbMySQL.pool.query('SELECT * FROM users WHERE phone = ?', [targetPhone]);
      if (existing.length > 0) {
        await dbMySQL.pool.query('UPDATE users SET role = ?, ctv_request = ? WHERE phone = ?', ['ADMIN', 'NONE', targetPhone]);
        console.log('   ✅ Promoted user 0979366316 (Nguyễn Thanh Hoà) to ADMIN in MySQL');
      } else {
        await dbMySQL.pool.query(
          'INSERT INTO users (id, phone, password, name, role, region, ctv_request) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['usr-admin-hoa', targetPhone, 'TH2532621991', 'Nguyễn Thanh Hoà', 'ADMIN', 'Hà Nội', 'NONE']
        );
        console.log('   ✅ Created super admin 0979366316 (Nguyễn Thanh Hoà) in MySQL');
      }
    }
  } catch (err) {
    console.log('   ⚠️ MySQL not connected or migration note:', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 SUPER ADMIN MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

migrateSuperAdmin();
