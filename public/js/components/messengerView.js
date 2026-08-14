const MessengerView = {
  async init() {
    this.bindEvents();
    await this.loadSettings();
  },

  bindEvents() {
    const configForm = document.getElementById('fb-messenger-config-form');
    if (configForm) {
      configForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    const testForm = document.getElementById('fb-test-send-form');
    if (testForm) {
      testForm.addEventListener('submit', (e) => this.handleTestSend(e));
    }

    const copyBtn = document.getElementById('btn-copy-webhook-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyWebhookUrl());
    }

    // Floating Messenger Widget Events
    const toggleBtn = document.getElementById('btn-toggle-messenger-widget');
    const closeBtn = document.getElementById('btn-close-chat-box');
    const chatBox = document.getElementById('messenger-chat-box');

    if (toggleBtn && chatBox) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = chatBox.style.display === 'none' || !chatBox.style.display;
        chatBox.style.display = isHidden ? 'block' : 'none';
      });
    }

    if (closeBtn && chatBox) {
      closeBtn.addEventListener('click', () => {
        chatBox.style.display = 'none';
      });
    }

    const actionBtns = document.querySelectorAll('.btn-chat-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleWidgetAction(e));
    });
  },

  handleWidgetAction(e) {
    const action = e.currentTarget.dataset.action;
    const chatBox = document.getElementById('messenger-chat-box');

    if (action === 'products') {
      if (chatBox) chatBox.style.display = 'none';
      const ctvTab = document.querySelector('.role-btn[data-tab="ctv"]');
      if (ctvTab) ctvTab.click();
    } else if (action === 'orders') {
      const phone = prompt('🔍 Nhập Số điện thoại hoặc Mã đơn hàng của bạn để tra cứu:');
      if (phone && phone.trim()) {
        const ctvTab = document.querySelector('.role-btn[data-tab="pricelist"]');
        if (ctvTab) ctvTab.click();
        alert(`🔎 Đang tìm kiếm thông tin đơn hàng của: ${phone.trim()}`);
      }
    } else if (action === 'callback') {
      const phone = prompt('📞 Vui lòng nhập Số điện thoại của bạn, Chuyên viên CSKH sẽ gọi lại tư vấn ngay:');
      if (phone && phone.trim()) {
        API.createQuickPurchase({
          customerName: 'Khách Web Widget',
          phone: phone.trim(),
          productName: 'Yêu cầu gọi lại từ Widget',
          note: 'Đăng ký tư vấn trực tiếp từ Widget Chat'
        }).then(res => {
          alert('✅ Cảm ơn bạn! Chuyên viên CSKH sẽ liên hệ với bạn qua SĐT ' + phone.trim() + ' trong ít phút!');
        });
      }
    } else if (action === 'fb') {
      window.open('https://m.me', '_blank');
    }
  },

  async loadSettings() {
    try {
      const res = await API.getMessengerSettings();
      if (res.success && res.data) {
        const data = res.data;
        const webhookUrlInput = document.getElementById('fb-webhook-url-display');
        const verifyTokenInput = document.getElementById('fb-verify-token-input');
        const pageTokenInput = document.getElementById('fb-page-access-token-input');
        const statusBadge = document.getElementById('fb-bot-status-badge');

        if (webhookUrlInput) {
          // Nếu dùng host local hoặc domain, tự động tính URL đầy đủ
          const currentOrigin = window.location.origin;
          webhookUrlInput.value = `${currentOrigin}/api/messenger/webhook`;
        }

        if (verifyTokenInput && data.verifyToken) {
          verifyTokenInput.value = data.verifyToken;
        }

        if (statusBadge) {
          if (data.hasAccessToken) {
            statusBadge.className = 'badge badge-success';
            statusBadge.innerHTML = '✅ Đã kết nối Facebook Page Access Token';
          } else {
            statusBadge.className = 'badge badge-warning';
            statusBadge.innerHTML = '⚠️ Chưa cài đặt Page Access Token';
          }
        }
      }
    } catch (err) {
      console.error('Lỗi nạp cấu hình Messenger:', err);
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const verifyToken = document.getElementById('fb-verify-token-input').value;
    const pageAccessToken = document.getElementById('fb-page-access-token-input').value;

    try {
      const res = await API.updateMessengerSettings({
        verifyToken,
        pageAccessToken
      });

      if (res.success) {
        alert('✅ Cập nhật cấu hình Facebook Messenger Bot thành công!');
        await this.loadSettings();
      } else {
        alert('❌ Cập nhật thất bại: ' + (res.message || 'Lỗi không xác định'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối khi lưu cấu hình.');
    }
  },

  async handleTestSend(e) {
    e.preventDefault();
    const psid = document.getElementById('fb-test-psid').value;
    const message = document.getElementById('fb-test-message').value;

    if (!psid) {
      alert('Vui lòng nhập Facebook PSID người nhận.');
      return;
    }

    try {
      const res = await API.sendTestMessenger({ psid, message });
      if (res.success) {
        alert('🚀 ' + res.message);
      } else {
        alert('❌ Gửi thất bại: ' + (res.message || 'Kiểm tra lại Page Access Token!'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối máy chủ.');
    }
  },

  copyWebhookUrl() {
    const webhookUrlInput = document.getElementById('fb-webhook-url-display');
    if (webhookUrlInput && webhookUrlInput.value) {
      navigator.clipboard.writeText(webhookUrlInput.value).then(() => {
        alert('📋 Đã sao chép Webhook URL vào Bộ nhớ tạm (Clipboard)!');
      }).catch(() => {
        webhookUrlInput.select();
        document.execCommand('copy');
        alert('📋 Đã sao chép Webhook URL!');
      });
    }
  }
};

window.MessengerView = MessengerView;
