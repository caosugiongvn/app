const express = require('express');
const router = express.Router();
const MessengerController = require('../controllers/messengerController');

// Facebook Meta Webhook Verification & Listener
router.get('/webhook', MessengerController.verifyWebhook);
router.post('/webhook', MessengerController.handleWebhookPayload);

// Admin Configuration & Testing APIs
router.get('/settings', MessengerController.getSettings);
router.post('/settings', MessengerController.updateSettings);
router.post('/test-send', MessengerController.sendTestMessage);

module.exports = router;
