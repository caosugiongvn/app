class QuickBuyModal {
  constructor() {
    this.modal = document.getElementById('quick-buy-modal');
    this.form = document.getElementById('quick-buy-form');
    this.closeBtn = document.getElementById('close-quick-buy-modal-btn');
    this.btnOpenLogin = document.getElementById('quick-buy-login-btn');
    this.btnOpenRegister = document.getElementById('quick-buy-register-btn');
    this.productNameInput = document.getElementById('quick-buy-product-name');
    this.phoneInput = document.getElementById('quick-buy-phone');
    this.nameInput = document.getElementById('quick-buy-name');
    this.noteInput = document.getElementById('quick-buy-note');

    this.initEvents();
  }

  initEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.btnOpenLogin) {
      this.btnOpenLogin.addEventListener('click', () => {
        this.close();
        if (window.authModal) {
          window.authModal.openLogin();
        }
      });
    }

    if (this.btnOpenRegister) {
      this.btnOpenRegister.addEventListener('click', () => {
        this.close();
        if (window.authModal) {
          window.authModal.openRegister();
        }
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  open(productName = '') {
    if (this.productNameInput) {
      this.productNameInput.value = productName || 'Sản phẩm chọn mua';
    }
    if (this.modal) {
      this.modal.classList.add('active');
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const customerName = this.nameInput?.value.trim();
    const phone = this.phoneInput?.value.trim();
    const productName = this.productNameInput?.value.trim() || '';
    const note = this.noteInput?.value.trim() || '';

    if (!customerName || !phone) {
      alert('⚠️ Vui lòng nhập đầy đủ Họ tên và Số điện thoại!');
      return;
    }

    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(phone)) {
      alert('⚠️ Số điện thoại không hợp lệ (phải gồm 9-11 chữ số)!');
      return;
    }

    const res = await window.API.createQuickPurchase({
      customerName,
      phone,
      productName,
      note
    });

    if (res.success) {
      alert(`🎉 ${res.message}`);
      if (typeof showToast === 'function') {
        showToast(`📞 Đã gửi SĐT (${phone}). Quản trị viên sẽ liên hệ lại với bạn!`);
      }
      this.close();
      if (this.form) this.form.reset();
      window.store.fetchAll();
    } else {
      alert(`❌ ${res.message}`);
    }
  }
}

window.quickBuyModal = new QuickBuyModal();
