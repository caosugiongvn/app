class AppStore {
  constructor() {
    this.state = {
      products: [],
      ctvs: [],
      drivers: [],
      regions: [],
      orders: [],
      dashboardReport: null,
      leaderboard: [],
      selectedRegion: 'ALL',
      activeTab: 'dashboard',
      users: [],
      quickPurchases: [],
      commissionSettings: { topRate: 15, standardRate: 8, topBonusPointsMultiplier: 1.5 },
      currentUser: this.loadUserFromStorage()
    };

    this.listeners = [];
  }

  loadUserFromStorage() {
    try {
      const saved = localStorage.getItem('smart_inventory_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  setCurrentUser(user) {
    this.state.currentUser = user;
    if (user) {
      localStorage.setItem('smart_inventory_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('smart_inventory_user');
    }
    this.notify();
  }

  logout() {
    this.setCurrentUser(null);
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  async fetchAll() {
    const safeFetch = async (apiCall, defaultVal = []) => {
      try {
        const res = await apiCall();
        if (res && res.success && res.data !== undefined) return res.data;
      } catch (e) {
        console.warn('⚠️ SafeFetch error:', e.message);
      }
      return defaultVal;
    };

    this.state.products = await safeFetch(() => window.API.getProducts(), this.state.products);
    this.state.ctvs = await safeFetch(() => window.API.getCtvs(), this.state.ctvs);
    this.state.drivers = await safeFetch(() => window.API.getDrivers(), this.state.drivers);
    this.state.regions = await safeFetch(() => window.API.getRegions(), this.state.regions);
    this.state.orders = await safeFetch(() => window.API.getOrders(), this.state.orders);
    this.state.dashboardReport = await safeFetch(() => window.API.getDashboardReport(), this.state.dashboardReport);
    this.state.leaderboard = await safeFetch(() => window.API.getLeaderboard(this.state.selectedRegion), this.state.leaderboard);
    this.state.quickPurchases = await safeFetch(() => window.API.getQuickPurchases(), this.state.quickPurchases);
    this.state.commissionSettings = await safeFetch(() => window.API.getCommissionSettings(), this.state.commissionSettings);

    this.notify();
  }

  async setLeaderboardRegion(region) {
    this.state.selectedRegion = region;
    const res = await window.API.getLeaderboard(region);
    if (res.success) {
      this.state.leaderboard = res.data;
      this.notify();
    }
  }
}

window.store = new AppStore();
