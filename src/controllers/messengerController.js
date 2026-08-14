const config = require('../config/config');
const MessengerService = require('../services/messengerService');

class MessengerController {

  /**
   * GET /api/messenger/webhook
   * Thao tác bắt tay xác thực Webhook với Facebook Meta Developer Console
   */
  static verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedVerifyToken = process.env.FB_VERIFY_TOKEN || config.FB_VERIFY_TOKEN || 'smart_inventory_messenger_verify_token_2026';

    console.log(`🔍 [FB Webhook Handshake] Mode: ${mode}, Token nhận được: "${token}"`);

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedVerifyToken) {
        console.log('✅ [FB Webhook] Xác thực Facebook Webhook thành công!');
        return res.status(200).send(challenge);
      } else {
        console.warn(`❌ [FB Webhook] Verify Token không khớp. Kỳ vọng: "${expectedVerifyToken}", Nhận được: "${token}"`);
        return res.sendStatus(403);
      }
    }

    return res.status(400).send('Thiếu tham số hub.mode hoặc hub.verify_token');
  }

  /**
   * POST /api/messenger/webhook
   * Lắng nghe và xử lý sự kiện tin nhắn từ người dùng gửi đến Facebook Fanpage
   */
  static async handleWebhookPayload(req, res) {
    const body = req.body;

    if (body.object === 'page') {
      // Phản hồi 200 OK ngay lập tức cho Facebook để tránh bị Retry/Timeout
      res.status(200).send('EVENT_RECEIVED');

      if (Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging ? entry.messaging[0] : null;

          if (webhookEvent) {
            const senderPsid = webhookEvent.sender ? webhookEvent.sender.id : null;

            if (senderPsid) {
              if (webhookEvent.message) {
                await MessengerService.handleMessage(senderPsid, webhookEvent.message);
              } else if (webhookEvent.postback) {
                await MessengerService.handlePostback(senderPsid, webhookEvent.postback);
              }
            }
          }
        }
      }
      return;
    }

    return res.sendStatus(404);
  }

  /**
   * GET /api/messenger/settings
   * Lấy thông tin cấu hình Bot Messenger hiện tại
   */
  static getSettings(req, res) {
    const verifyToken = process.env.FB_VERIFY_TOKEN || config.FB_VERIFY_TOKEN;
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || config.FB_PAGE_ACCESS_TOKEN || '';

    // Lấy thông tin URL địa chỉ máy chủ
    const ipAddresses = config.getLocalIpAddresses();
    const primaryUrl = ipAddresses[0] ? ipAddresses[0].url : `http://localhost:${config.PORT}`;
    const webhookUrl = `${primaryUrl}/api/messenger/webhook`;

    return res.json({
      success: true,
      data: {
        verifyToken,
        hasAccessToken: Boolean(pageAccessToken && pageAccessToken.length > 10),
        maskedAccessToken: pageAccessToken ? `${pageAccessToken.substring(0, 10)}...${pageAccessToken.substring(pageAccessToken.length - 6)}` : '',
        webhookUrl: webhookUrl,
        instructions: {
          step1: 'Đăng nhập vào developers.facebook.com và tạo ứng dụng (Type: Business).',
          step2: 'Thêm sản phẩm Facebook Messenger vào ứng dụng.',
          step3: 'Liên kết Facebook Page và tạo Page Access Token.',
          step4: 'Điền URL Webhook (hoặc ngrok HTTPS) và Verify Token vào phần Webhooks của Fanpage.',
          step5: 'Đăng ký các quyền lắng nghe: messages, messaging_postbacks.'
        }
      }
    });
  }

  /**
   * POST /api/messenger/settings
   * Cập nhật cấu hình Messenger Tokens
   */
  static updateSettings(req, res) {
    const { verifyToken, pageAccessToken } = req.body;

    if (verifyToken) {
      process.env.FB_VERIFY_TOKEN = verifyToken.trim();
      config.FB_VERIFY_TOKEN = verifyToken.trim();
    }

    if (pageAccessToken !== undefined) {
      process.env.FB_PAGE_ACCESS_TOKEN = pageAccessToken.trim();
      config.FB_PAGE_ACCESS_TOKEN = pageAccessToken.trim();
    }

    return res.json({
      success: true,
      message: 'Cập nhật cấu hình Facebook Messenger Bot thành công!',
      data: {
        verifyToken: config.FB_VERIFY_TOKEN,
        hasAccessToken: Boolean(config.FB_PAGE_ACCESS_TOKEN)
      }
    });
  }

  /**
   * POST /api/messenger/test-send
   * Gửi tin nhắn thử nghiệm tới PSID cụ thể
   */
  static async sendTestMessage(req, res) {
    const { psid, message } = req.body;

    if (!psid) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Facebook PSID của người nhận.' });
    }

    const testText = message || '👋 Chào bạn, đây là tin nhắn kiểm tra hệ thống Bot chăm sóc khách hàng tự động!';
    const result = await MessengerService.sendTextMessage(psid, testText);

    if (result) {
      return res.json({ success: true, message: `Đã gửi thành công tin nhắn thử nghiệm tới PSID: ${psid}` });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Lỗi gửi tin nhắn qua Facebook Graph API. Vui lòng kiểm tra lại Page Access Token!'
      });
    }
  }
}

module.exports = MessengerController;
