const API = {
  baseUrl: window.location.pathname.includes('/sales-app') ? '/sales-app/api' : '/api',

  async request(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const json = await response.json();
      return json;
    } catch (error) {
      console.error(`❌ API Error [${method} ${endpoint}]:`, error);
      return { success: false, message: 'Không thể kết nối tới server. Vui lòng kiểm tra lại mạng.' };
    }
  },

  getProducts() { return this.request('/products'); },
  addProduct(productData) { return this.request('/products', 'POST', productData); },
  updateProduct(id, productData) { return this.request(`/products/${id}`, 'PUT', productData); },
  importStock(importData) { return this.request('/inventory/import', 'POST', importData); },
  getOrders(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/orders${params ? '?' + params : ''}`);
  },
  createOrder(orderData) { return this.request('/orders', 'POST', orderData); },
  approveOrder(orderId, approvalData) { return this.request(`/orders/${orderId}/approve`, 'POST', approvalData); },
  deliverOrder(orderId, paymentData = {}) { return this.request(`/orders/${orderId}/deliver`, 'POST', paymentData); },
  cancelOrder(orderId, reason = '') { return this.request(`/orders/${orderId}/cancel`, 'POST', { reason }); },
  getCtvs() { return this.request('/ctvs'); },
  getDrivers() { return this.request('/drivers'); },
  getRegions() { return this.request('/regions'); },
  getRegionsDetailed() { return this.request('/regions/detailed'); },
  addRegion(name) { return this.request('/regions', 'POST', { name }); },
  renameRegion(oldName, newName) { return this.request('/regions/rename', 'PUT', { oldName, newName }); },
  deleteRegion(name) { return this.request('/regions', 'DELETE', { name }); },
  getLeaderboard(region = 'ALL') { return this.request(`/ctvs/leaderboard?region=${region}`); },
  getCommissionSettings() { return this.request('/ctvs/commission-settings'); },
  updateCommissionSettings(data) { return this.request('/ctvs/commission-settings', 'POST', data); },
  getDashboardReport() { return this.request('/reports/dashboard'); },
  recordVisit() { return this.request('/reports/visits/record', 'POST'); },
  getVisitStats() { return this.request('/reports/visits'); },
  getNetworkInfo() { return this.request('/network-info'); },

  // --- AUTH & USER APIS ---
  register(userData) { return this.request('/auth/register', 'POST', userData); },
  login(phoneOrCredentials, password) {
    const payload = (typeof phoneOrCredentials === 'object' && phoneOrCredentials !== null)
      ? phoneOrCredentials
      : { phone: phoneOrCredentials, password };
    return this.request('/auth/login', 'POST', payload);
  },
  resetPassword(data) { return this.request('/auth/reset-password', 'POST', data); },
  getUsers() { return this.request('/auth/users'); },
  applyCTV(userId) { return this.request('/auth/apply-ctv', 'POST', { userId }); },
  updateUserRoleAndRegion(userId, role, region) { return this.request('/auth/users/role-region', 'PUT', { userId, role, region }); },

  // --- QUICK PURCHASE APIS (MUA HÀNG NHANH & SĐT KHÁCH) ---
  getQuickPurchases() { return this.request('/quick-purchases'); },
  addQuickPurchase(data) { return this.request('/quick-purchases', 'POST', data); },
  createQuickPurchase(data) { return this.request('/quick-purchases', 'POST', data); },
  updateQuickPurchaseStatus(id, statusData) { return this.request(`/quick-purchases/${id}/status`, 'PUT', typeof statusData === 'string' ? { status: statusData } : statusData); },
  deleteQuickPurchase(id) { return this.request(`/quick-purchases/${id}`, 'DELETE'); },

  // --- SYSTEM & VPS SYNC APIS ---
  getSystemStatus() { return this.request('/system/status'); },
  syncCode() { return this.request('/system/git-pull', 'POST'); },

  // --- FACEBOOK MESSENGER BOT APIS ---
  getMessengerSettings() { return this.request('/messenger/settings'); },
  updateMessengerSettings(data) { return this.request('/messenger/settings', 'POST', data); },
  sendTestMessenger(data) { return this.request('/messenger/test-send', 'POST', data); }
};

window.API = API;
