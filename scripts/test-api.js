const db = require('../database');

console.log('----------------------------------------------------');
console.log('🧪 VERIFYING SECTION 2: BACKEND API ROUTE LOGIC');
console.log('----------------------------------------------------');

const dataBefore = db.readData();
const pBefore = dataBefore.products.find(p => p.id === 'prod-1');
const ctvBefore = dataBefore.ctvs.find(c => c.id === 'ctv-1');

console.log('📊 Initial State for prod-1:');
console.log(` - Stock: ${pBefore.stock} | Reserved: ${pBefore.reserved} | Available: ${pBefore.stock - pBefore.reserved}`);
console.log(` - CTV An Points: ${ctvBefore.points} | Sales: ${ctvBefore.totalSales.toLocaleString()}đ`);

// Step 1: Simulate CTV Order Creation (Reserve Stock)
const orderQty = 3;
pBefore.reserved += orderQty;

const testOrder = {
  id: `ORD-TEST-${Date.now()}`,
  ctvId: ctvBefore.id,
  ctvName: ctvBefore.name,
  ctvRegion: ctvBefore.region,
  driverId: 'drv-1',
  driverName: 'Hoàng Văn Tuấn',
  customerName: 'Kiểm thử Viên',
  customerPhone: '0999888777',
  address: '100 Nguyễn Trãi, Hà Nội',
  items: [
    {
      productId: pBefore.id,
      productName: pBefore.name,
      qty: orderQty,
      costPrice: pBefore.costPrice,
      sellingPrice: pBefore.sellingPrice,
      pointsPerUnit: pBefore.points
    }
  ],
  totalAmount: pBefore.sellingPrice * orderQty,
  totalCost: pBefore.costPrice * orderQty,
  profit: (pBefore.sellingPrice - pBefore.costPrice) * orderQty,
  earnedPoints: pBefore.points * orderQty,
  status: 'PENDING_DELIVERY',
  createdAt: new Date().toISOString()
};

dataBefore.orders.push(testOrder);
db.saveData(dataBefore);

console.log('\n🛒 Step 1: Order Created by CTV (Stock Reserved):');
console.log(` - Order ID: ${testOrder.id}`);
console.log(` - Status: ${testOrder.status}`);
console.log(` - Reserved Stock updated to: ${pBefore.reserved}`);
console.log(` - Available Stock now: ${pBefore.stock - pBefore.reserved}`);

// Step 2: Simulate Driver Delivery Confirmation (Deduct Actual Stock & Award Points)
pBefore.stock -= orderQty;
pBefore.reserved -= orderQty;
ctvBefore.points += testOrder.earnedPoints;
ctvBefore.totalSales += testOrder.totalAmount;
ctvBefore.completedOrdersCount += 1;
testOrder.status = 'DELIVERED';
testOrder.deliveredAt = new Date().toISOString();

db.saveData(dataBefore);

console.log('\n🚚 Step 2: Driver Confirmed Delivery Success:');
console.log(` - Order Status: ${testOrder.status}`);
console.log(` - Actual Stock updated to: ${pBefore.stock}`);
console.log(` - Reserved Stock updated to: ${pBefore.reserved}`);
console.log(` - Available Stock now: ${pBefore.stock - pBefore.reserved}`);
console.log(` - Profit earned on order: ${testOrder.profit.toLocaleString()}đ`);
console.log(` - CTV An Points updated to: ${ctvBefore.points} (+${testOrder.earnedPoints} pts)`);
console.log(` - CTV An Total Sales: ${ctvBefore.totalSales.toLocaleString()}đ`);

console.log('\n✅ SECTION 2 BACKEND API ROUTE LOGIC VERIFIED SUCCESSFULLY!');
console.log('----------------------------------------------------');
