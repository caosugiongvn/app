const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const ctvRoutes = require('./ctvRoutes');
const reportRoutes = require('./reportRoutes');
const networkRoutes = require('./networkRoutes');
const quickPurchaseRoutes = require('./quickPurchaseRoutes');
const systemRoutes = require('./systemRoutes');
const messengerRoutes = require('./messengerRoutes');

// Mount tất cả các modul routes với tiền tố /api
router.use('/auth', authRoutes);
router.use('/messenger', messengerRoutes);
router.use('/', productRoutes);
router.use('/', orderRoutes);
router.use('/', ctvRoutes);
router.use('/', reportRoutes);
router.use('/', networkRoutes);
router.use('/', quickPurchaseRoutes);
router.use('/', systemRoutes);

module.exports = router;
