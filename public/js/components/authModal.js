class AuthModal {
  constructor() {
    this.registerModal = document.getElementById('register-modal');
    this.loginModal = document.getElementById('login-modal');

    this.registerForm = document.getElementById('register-form');
    this.loginForm = document.getElementById('login-form');

    this.btnOpenLogin = document.getElementById('btn-open-login');
    this.btnOpenRegister = document.getElementById('btn-open-register');

    this.btnCloseRegister = document.getElementById('close-register-modal-btn');
    this.btnCloseLogin = document.getElementById('close-login-modal-btn');

    this.linkSwitchToLogin = document.getElementById('link-switch-to-login');
    this.linkSwitchToRegister = document.getElementById('link-switch-to-register');

    this.loggedBadge = document.getElementById('logged-user-badge');
    this.guestActions = document.getElementById('guest-auth-actions');

    this.userNameDisplay = document.getElementById('user-display-name');
    this.userRoleDisplay = document.getElementById('user-display-role');
    this.userInitialsDisplay = document.getElementById('user-avatar-initials');

    this.btnLogout = document.getElementById('btn-user-logout');
    this.regRegionSelect = document.getElementById('reg-region');

    this.initEvents();
  }

  initEvents() {
    if (this.btnOpenLogin) {
      this.btnOpenLogin.addEventListener('click', () => this.openLogin());
    }

    if (this.btnOpenRegister) {
      this.btnOpenRegister.addEventListener('click', () => this.openRegister());
    }

    // Banner Buttons
    const bannerBtnLogin = document.getElementById('banner-btn-login');
    const bannerBtnRegister = document.getElementById('banner-btn-register');
    if (bannerBtnLogin) bannerBtnLogin.addEventListener('click', () => this.openLogin());
    if (bannerBtnRegister) bannerBtnRegister.addEventListener('click', () => this.openRegister());

    const btnApplyCTV = document.getElementById('btn-apply-ctv');
    if (btnApplyCTV) {
      btnApplyCTV.addEventListener('click', async () => {
        const user = window.store.state.currentUser;
        if (!user) return;
        const res = await window.API.applyCTV(user.id);
        if (res.success) {
          alert(res.message);
          user.ctvRequest = 'PENDING';
          window.store.setCurrentUser(user);
          btnApplyCTV.textContent = '⏳ Đã Gửi Yêu Cầu CTV';
          btnApplyCTV.disabled = true;
        } else {
          alert(`⚠️ ${res.message}`);
        }
      });
    }

    if (this.btnCloseRegister) {
      this.btnCloseRegister.addEventListener('click', () => this.closeRegister());
    }

    if (this.btnCloseLogin) {
      this.btnCloseLogin.addEventListener('click', () => this.closeLogin());
    }

    if (this.linkSwitchToLogin) {
      this.linkSwitchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeRegister();
        this.openLogin();
      });
    }

    if (this.linkSwitchToRegister) {
      this.linkSwitchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeLogin();
        this.openRegister();
      });
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        window.store.logout();
        alert('Bạn đã đăng xuất thành công!');
      });
    }

    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
    }

    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    // Subscribe to store state changes
    window.store.subscribe((state) => this.renderUserState(state.currentUser));
    this.renderUserState(window.store.state.currentUser);
  }

  async populateRegions() {
    if (!this.regRegionSelect) return;
    const res = await window.API.getRegions();
    if (res.success && res.data) {
      this.regRegionSelect.innerHTML = res.data.map(r => `<option value="${r}">${r}</option>`).join('');
    } else {
      this.regRegionSelect.innerHTML = `
        <option value="Hà Nội">Hà Nội</option>
        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
        <option value="Đà Nẵng">Đà Nẵng</option>
      `;
    }
  }

  openRegister() {
    this.registerModal?.classList.add('active');
  }

  closeRegister() {
    this.registerModal?.classList.remove('active');
  }

  openLogin() {
    this.loginModal?.classList.add('active');
  }

  closeLogin() {
    this.loginModal?.classList.remove('active');
  }

  async handleRegisterSubmit(e) {
    e.preventDefault();

    const phone = document.getElementById('reg-phone')?.value;
    const name = document.getElementById('reg-name')?.value;
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;

    if (password !== confirmPassword) {
      alert('⚠️ Mật khẩu và Nhập lại mật khẩu không trùng khớp! Vui lòng kiểm tra lại.');
      return;
    }

    const res = await window.API.register({ phone, name, password, confirmPassword });

    if (res.success) {
      alert(res.message);
      this.closeRegister();
      this.registerForm.reset();

      // Automatically log in user after registration
      window.store.setCurrentUser(res.data);
      window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }

  async handleLoginSubmit(e) {
    e.preventDefault();

    const phone = document.getElementById('login-phone')?.value;
    const password = document.getElementById('login-password')?.value;

    const res = await window.API.login(phone, password);

    if (res.success) {
      alert(res.message);
      this.closeLogin();
      this.loginForm.reset();

      window.store.setCurrentUser(res.data);
      window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }

  renderUserState(user) {
    const welcomeBanner = document.getElementById('guest-welcome-banner');
    const btnApplyCTV = document.getElementById('btn-apply-ctv');

    if (user) {
      if (this.guestActions) this.guestActions.classList.add('hidden');
      if (this.loggedBadge) this.loggedBadge.classList.remove('hidden');
      if (welcomeBanner) welcomeBanner.style.display = 'none';

      if (this.userNameDisplay) this.userNameDisplay.textContent = user.name;
      if (this.userRoleDisplay) {
        if (user.role === 'CTV') {
          this.userRoleDisplay.textContent = '💼 Cộng tác viên';
        } else if (user.role === 'ADMIN') {
          this.userRoleDisplay.textContent = '👑 Quản trị viên';
        } else if (user.role === 'DRIVER') {
          this.userRoleDisplay.textContent = '🚚 Tài xế giao hàng';
        } else {
          this.userRoleDisplay.textContent = '🛒 Khách hàng';
        }
      }

      if (btnApplyCTV) {
        if (user.role === 'CUSTOMER') {
          btnApplyCTV.style.display = 'inline-block';
          if (user.ctvRequest === 'PENDING') {
            btnApplyCTV.textContent = '⏳ Đã Gửi Yêu Cầu CTV';
            btnApplyCTV.disabled = true;
          } else {
            btnApplyCTV.textContent = '💼 Đăng Ký Làm CTV';
            btnApplyCTV.disabled = false;
          }
        } else {
          btnApplyCTV.style.display = 'none';
        }
      }

      if (this.userInitialsDisplay) {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
        this.userInitialsDisplay.textContent = initials;
      }
    } else {
      if (this.guestActions) this.guestActions.classList.remove('hidden');
      if (this.loggedBadge) this.loggedBadge.classList.add('hidden');
      if (welcomeBanner) welcomeBanner.style.display = 'flex';
      if (btnApplyCTV) btnApplyCTV.style.display = 'none';
    }

    this.applyRolePermissions(user);
  }

  applyRolePermissions(user) {
    const roleBtns = document.querySelectorAll('.role-btn');
    const roleTabsNav = document.querySelector('.role-tabs');
    if (!roleBtns || roleBtns.length === 0) return;

    let allowedTabs = ['pricelist'];
    let defaultTab = 'pricelist';

    if (!user) {
      // Guest mode
      allowedTabs = ['pricelist'];
      defaultTab = 'pricelist';
    } else if (user.role === 'ADMIN') {
      allowedTabs = ['pricelist', 'dashboard', 'inventory', 'ctv', 'driver', 'users'];
      defaultTab = 'dashboard';
    } else if (user.role === 'CTV') {
      allowedTabs = ['pricelist', 'ctv'];
      defaultTab = 'ctv';
    } else if (user.role === 'DRIVER') {
      allowedTabs = ['pricelist', 'driver'];
      defaultTab = 'driver';
    } else {
      // CUSTOMER
      allowedTabs = ['pricelist'];
      defaultTab = 'pricelist';
    }

    roleBtns.forEach(btn => {
      const tab = btn.dataset.tab;
      if (allowedTabs.includes(tab)) {
        btn.style.display = 'inline-flex';
      } else {
        btn.style.display = 'none';
      }
    });

    // Ẩn thanh tab chuyển đổi vai trò nếu Chưa đăng nhập (Guest) hoặc là Khách Hàng (chỉ có 1 tab Báo giá)
    if (roleTabsNav) {
      if (!user || user.role === 'CUSTOMER' || allowedTabs.length <= 1) {
        roleTabsNav.style.display = 'none';
      } else {
        roleTabsNav.style.display = 'flex';
      }
    }

    // Check currently active tab; if not allowed, switch to defaultTab
    const currentActiveBtn = document.querySelector('.role-btn.active');
    const currentActiveTab = currentActiveBtn ? currentActiveBtn.dataset.tab : '';

    if (!allowedTabs.includes(currentActiveTab)) {
      const targetBtn = document.querySelector(`.role-btn[data-tab="${defaultTab}"]`);
      if (targetBtn) {
        targetBtn.click();
      }
    }

    // Trigger re-render of PriceListView to ensure catalog subtab is active for guests
    if (window.priceListView) {
      window.priceListView.render();
    }
  }
}

window.authModal = new AuthModal();
