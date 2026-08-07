const db = require('../database');
const config = require('../config');

console.log('----------------------------------------------------');
console.log('🧪 VERIFYING SECTION 1: DATABASE & CONFIG MODULES');
console.log('----------------------------------------------------');

const ipList = config.getLocalIpAddresses();
console.log('📍 Recognized Network IP Addresses:');
ipList.forEach(ip => {
  console.log(` - Interface: ${ip.interface} | IP: ${ip.address} | URL: ${ip.url}`);
});

const data = db.readData();

console.log(`\n📦 Products in Database: ${data.products.length}`);
data.products.forEach(p => {
  const available = p.stock - p.reserved;
  console.log(`  - [${p.code}] ${p.name} | Tồn thực: ${p.stock} | Tạm trừ: ${p.reserved} | Khả dụng: ${available} | Giá vốn: ${p.costPrice.toLocaleString()}đ | Giá bán: ${p.sellingPrice.toLocaleString()}đ`);
});

console.log(`\n👥 CTVs by Region: ${data.ctvs.length}`);
data.ctvs.forEach(c => {
  console.log(`  - ${c.name} (${c.phone}) | Khu vực: ${c.region} | Điểm: ${c.points} | Doanh số: ${c.totalSales.toLocaleString()}đ`);
});

console.log(`\n🚚 Drivers registered: ${data.drivers.length}`);
console.log(`📑 Orders initialized: ${data.orders.length}`);

console.log('\n✅ SECTION 1 VERIFICATION COMPLETED SUCCESSFULLY!');
console.log('----------------------------------------------------');
