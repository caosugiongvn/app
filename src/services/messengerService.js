const https = require('https');
const config = require('../config/config');
const ProductModel = require('../models/ProductModel');
const OrderModel = require('../models/OrderModel');
const dbMySQL = require('../../database-mysql');

/**
 * Service xử lý tin nhắn & Bot Chat tự động Facebook Messenger
 */
class MessengerService {

  /**
   * Lấy Page Access Token (từ config/env hoặc tùy chỉnh)
   */
  static getAccessToken() {
    return process.env.FB_PAGE_ACCESS_TOKEN || config.FB_PAGE_ACCESS_TOKEN || '';
  }

  /**
   * Format giá tiền VND
   */
  static formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  }

  /**
   * Trả về danh sách Quick Replies mặc định
   */
  static getDefaultQuickReplies() {
    return [
      {
        content_type: 'text',
        title: '📦 Xem sản phẩm',
        payload: 'MENU_PRODUCTS'
      },
      {
        content_type: 'text',
        title: '🔍 Tra cứu đơn hàng',
        payload: 'MENU_CHECK_ORDER'
      },
      {
        content_type: 'text',
        title: '📞 Đăng ký tư vấn',
        payload: 'MENU_SUPPORT'
      },
      {
        content_type: 'text',
        title: '🏪 Cửa hàng',
        payload: 'MENU_STORE_INFO'
      }
    ];
  }

  /**
   * Gửi request HTTP tới Facebook Graph API (Send API)
   */
  static async callSendAPI(senderPsid, responsePayload) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      console.warn('⚠️ FB_PAGE_ACCESS_TOKEN chưa được cấu hình. Không thể gửi tin nhắn phản hồi tới Facebook.');
      return false;
    }

    const requestBody = {
      recipient: {
        id: senderPsid
      },
      message: responsePayload
    };

    const postData = JSON.stringify(requestBody);

    return new Promise((resolve) => {
      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ [FB Bot] Đã gửi tin nhắn phản hồi thành công tới PSID: ${senderPsid}`);
            resolve(true);
          } else {
            console.error(`❌ [FB Bot] Lỗi gửi tin nhắn HTTP ${res.statusCode}:`, body);
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ [FB Bot] Lỗi kết nối Graph API:', err.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Gửi tin nhắn văn bản đơn giản kèm Quick Replies
   */
  static async sendTextMessage(senderPsid, text, quickReplies = null) {
    const payload = {
      text: text
    };
    if (quickReplies && Array.isArray(quickReplies)) {
      payload.quick_replies = quickReplies;
    } else {
      payload.quick_replies = this.getDefaultQuickReplies();
    }

    return await this.callSendAPI(senderPsid, payload);
  }

  /**
   * Xử lý tin nhắn đến từ người dùng (Incoming Text / Quick Reply)
   */
  static async handleMessage(senderPsid, receivedMessage) {
    let userText = '';
    let quickPayload = '';

    if (receivedMessage.quick_reply && receivedMessage.quick_reply.payload) {
      quickPayload = receivedMessage.quick_reply.payload;
    }

    if (receivedMessage.text) {
      userText = receivedMessage.text.trim();
    }

    const lowerText = userText.toLowerCase();

    console.log(`📩 [FB Bot] Nhận tin nhắn từ PSID (${senderPsid}): "${userText}" (Payload: ${quickPayload})`);

    // 1. Xử lý theo Quick Reply Payload
    if (quickPayload === 'MENU_PRODUCTS') {
      return await this.sendProductList(senderPsid);
    }
    if (quickPayload === 'MENU_CHECK_ORDER') {
      return await this.sendTextMessage(
        senderPsid,
        '🔍 Bạn vui lòng nhập **Số điện thoại đặt hàng** hoặc **Mã đơn hàng** (Ví dụ: ORD-1700000000 hoặc 0901234567) để hệ thống kiểm tra nhé!'
      );
    }
    if (quickPayload === 'MENU_SUPPORT') {
      return await this.sendTextMessage(
        senderPsid,
        '📞 Vui lòng gửi Số điện thoại của bạn kèm tên hoặc nhu cầu (VD: "Cần tư vấn 0912345678"), bộ phận CSKH sẽ gọi lại cho bạn ngay!'
      );
    }
    if (quickPayload === 'MENU_STORE_INFO') {
      return await this.sendStoreInfo(senderPsid);
    }

    // 2. Tra cứu Đơn Hàng (Nếu nhập số điện thoại hoặc mã đơn hàng)
    const phoneRegex = /(0[3|5|7|8|9]+[0-9]{8})\b/g;
    const isPhoneMatch = userText.match(phoneRegex);
    const isOrderCodeMatch = lowerText.startsWith('ord') || lowerText.includes('đơn hàng') || lowerText.includes('don hang') || lowerText.includes('tra cứu');

    if (isPhoneMatch || (isOrderCodeMatch && userText.length >= 4)) {
      const searchTerm = isPhoneMatch ? isPhoneMatch[0] : userText.replace(/^(đơn hàng|don hang|tra cứu|kiểm tra)\s*/i, '').trim();

      if (searchTerm.length >= 3) {
        const found = await this.searchOrders(searchTerm);
        if (found) {
          return await this.sendTextMessage(senderPsid, found);
        }
      }
    }

    // 3. Tra cứu Sản Phẩm (Nếu hỏi giá, xem sản phẩm, báo giá, sp, sản phẩm)
    if (
      lowerText.includes('sản phẩm') ||
      lowerText.includes('san pham') ||
      lowerText.includes('giá') ||
      lowerText.includes('báo giá') ||
      lowerText.includes('bảng giá') ||
      lowerText.includes('danh sách') ||
      lowerText === 'sp'
    ) {
      return await this.sendProductList(senderPsid, userText);
    }

    // 4. Đăng ký thông tin tư vấn (Nếu chứa SĐT)
    if (isPhoneMatch && (lowerText.includes('tư vấn') || lowerText.includes('tu van') || lowerText.includes('gọi lại') || lowerText.includes('mua'))) {
      const phoneNum = isPhoneMatch[0];
      try {
        await dbMySQL.createQuickPurchase({
          customerName: `Khách FB (${senderPsid.substring(0, 6)})`,
          phone: phoneNum,
          productName: 'Tư vấn từ Facebook Messenger',
          note: `Tin nhắn từ Messenger: "${userText}"`
        });
      } catch (e) {
        console.warn('Lỗi lưu quick_purchase:', e.message);
      }

      return await this.sendTextMessage(
        senderPsid,
        `✅ Cảm ơn bạn! Hệ thống đã ghi nhận số điện thoại ${phoneNum}. Chuyên viên tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất! 🚀`
      );
    }

    // 5. Chào hỏi ban đầu & Fallback Menu
    if (
      lowerText === 'hi' ||
      lowerText === 'hello' ||
      lowerText === 'chào' ||
      lowerText.includes('xin chào') ||
      lowerText.includes('start') ||
      lowerText.includes('bắt đầu')
    ) {
      return await this.sendWelcomeMessage(senderPsid);
    }

    // Fallback thông minh: Kiểm tra tìm kiếm tên sản phẩm tương đối
    const products = await ProductModel.getAllProducts();
    const matchedProduct = products.find(p => p.name.toLowerCase().includes(lowerText) || (p.code && p.code.toLowerCase() === lowerText));

    if (matchedProduct && userText.length >= 3) {
      const available = (matchedProduct.stock || 0) - (matchedProduct.reserved || 0);
      const statusText = available > 0 ? '🟢 Còn hàng' : '🔴 Hết hàng';
      const msg = `📦 **Thông tin sản phẩm**:
• **Mã SP**: ${matchedProduct.code || matchedProduct.id}
• **Tên SP**: ${matchedProduct.name}
• **Danh mục**: ${matchedProduct.category || 'Chung'}
• **Giá bán**: ${this.formatVND(matchedProduct.sellingPrice)}
• **Trạng thái**: ${statusText} (Tồn khả dụng: ${available})`;

      return await this.sendTextMessage(senderPsid, msg);
    }

    // Trả lời mặc định kèm Menu lựa chọn
    const defaultMsg = `Xin chào! 👋 Cảm ơn bạn đã liên hệ với chúng tôi.\n\nTôi là Bot tự động chăm sóc khách hàng. Vui lòng chọn một trong các tùy chọn bên dưới để tôi hỗ trợ bạn nhanh nhất nhé:`;
    return await this.sendTextMessage(senderPsid, defaultMsg);
  }

  /**
   * Xử lý Postback (Khi click nút trong tin nhắn)
   */
  static async handlePostback(senderPsid, receivedPostback) {
    const payload = receivedPostback.payload;

    if (payload === 'GET_STARTED' || payload === 'START') {
      return await this.sendWelcomeMessage(senderPsid);
    }

    return await this.handleMessage(senderPsid, { text: '', quick_reply: { payload } });
  }

  /**
   * Tin nhắn chào mừng
   */
  static async sendWelcomeMessage(senderPsid) {
    const welcomeMsg = `👋 **Chào mừng bạn đến với Cửa Hàng!**\n\nHệ thống phản hồi tự động sẵn sàng hỗ trợ bạn 24/7. Bạn cần hỗ trợ thông tin gì dưới đây?`;
    return await this.sendTextMessage(senderPsid, welcomeMsg);
  }

  /**
   * Gửi danh sách sản phẩm
   */
  static async sendProductList(senderPsid, keyword = '') {
    try {
      let products = await ProductModel.getAllProducts();

      if (!products || products.length === 0) {
        return await this.sendTextMessage(senderPsid, 'Hiện tại chưa có sản phẩm nào trong danh mục.');
      }

      const displayProducts = products.slice(0, 6);

      let msg = `🛍️ **DANH SÁCH SẢN PHẨM NỔI BẬT**:\n\n`;
      displayProducts.forEach((p, idx) => {
        const available = (p.stock || 0) - (p.reserved || 0);
        const status = available > 0 ? '🟢 Còn hàng' : '🔴 Hết hàng';
        msg += `${idx + 1}. **${p.name}**\n`;
        msg += `   • Giá: **${this.formatVND(p.sellingPrice)}** | Tình trạng: ${status}\n`;
        msg += `   • Mã SP: \`${p.code || p.id}\`\n\n`;
      });

      msg += `💡 *Nhập tên sản phẩm hoặc SĐT để đăng ký tư vấn mua hàng ngay nhé!*`;

      return await this.sendTextMessage(senderPsid, msg);
    } catch (err) {
      console.error('Lỗi sendProductList:', err);
      return await this.sendTextMessage(senderPsid, 'Xin lỗi, không thể lấy danh sách sản phẩm lúc này.');
    }
  }

  /**
   * Tìm kiếm đơn hàng
   */
  static async searchOrders(searchTerm) {
    try {
      const allOrders = await OrderModel.getOrders({});
      const term = searchTerm.toLowerCase();

      const matched = allOrders.filter(o =>
        (o.id && o.id.toLowerCase().includes(term)) ||
        (o.customerPhone && o.customerPhone.includes(term)) ||
        (o.customer_phone && o.customer_phone.includes(term))
      );

      if (!matched || matched.length === 0) {
        return `❌ Không tìm thấy đơn hàng nào khớp với thông tin "${searchTerm}". Bạn vui lòng kiểm tra lại Số điện thoại hoặc Mã đơn nhé!`;
      }

      let msg = `📦 **KẾT QUẢ TRA CỨU ĐƠN HÀNG (${matched.length})**:\n\n`;
      matched.slice(0, 3).forEach((o, index) => {
        const orderId = o.id;
        const total = this.formatVND(o.totalAmount || o.total_amount || 0);
        const statusMap = {
          'PENDING_DELIVERY': '⏳ Đang chờ giao hàng',
          'DELIVERED': '✅ Đã giao thành công',
          'CANCELLED': '❌ Đã hủy đơn'
        };
        const statusStr = statusMap[o.status] || o.status || 'Đang xử lý';
        const customer = o.customerName || o.customer_name || 'Khách hàng';

        msg += `${index + 1}. **Đơn hàng ${orderId}**\n`;
        msg += `   • Khách hàng: ${customer}\n`;
        msg += `   • Trạng thái: **${statusStr}**\n`;
        msg += `   • Tổng tiền: ${total}\n`;
        if (o.createdAt || o.created_at) {
          const dateStr = new Date(o.createdAt || o.created_at).toLocaleDateString('vi-VN');
          msg += `   • Ngày đặt: ${dateStr}\n`;
        }
        msg += `\n`;
      });

      return msg;
    } catch (err) {
      console.error('Lỗi searchOrders:', err);
      return null;
    }
  }

  /**
   * Thông tin cửa hàng
   */
  static async sendStoreInfo(senderPsid) {
    const storeMsg = `🏪 **THÔNG TIN CỬA HÀNG & CSKH**:\n\n` +
      `📍 **Địa chỉ**: Hệ thống Bán Hàng & Chăm Sóc Khách Hàng Tự Động\n` +
      `📞 **Hotline / Zalo**: 0979.366.316\n` +
      `⏰ **Giờ làm việc**: 08:00 - 21:00 (Tất cả các ngày trong tuần)\n` +
      `🌐 **Website**: Hệ thống quản lý bán hàng VPS\n\n` +
      `Trân trọng cảm ơn quý khách! ❤️`;

    return await this.sendTextMessage(senderPsid, storeMsg);
  }
}

module.exports = MessengerService;
