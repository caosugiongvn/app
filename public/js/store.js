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
    const [productsRes, ctvsRes, driversRes, regionsRes, ordersRes, dashboardRes, leaderboardRes, quickPurchasesRes, commissionRes] = await Promise.all([
      window.API.getProducts(),
      window.API.getCtvs(),
      window.API.getDrivers(),
      window.API.getRegions(),
      window.API.getOrders(),
      window.API.getDashboardReport(),
      window.API.getLeaderboard(this.state.selectedRegion),
      window.API.getQuickPurchases(),
      window.API.getCommissionSettings()
    ]);

    if (productsRes.success) this.state.products = productsRes.data;
    if (ctvsRes.success) this.state.ctvs = ctvsRes.data;
    if (driversRes && driversRes.success) this.state.drivers = driversRes.data;
    if (regionsRes.success) this.state.regions = regionsRes.data;
    if (ordersRes.success) this.state.orders = ordersRes.data;
    if (dashboardRes.success) this.state.dashboardReport = dashboardRes.data;
    if (leaderboardRes && leaderboardRes.success) this.state.leaderboard = leaderboardRes.data;
    if (quickPurchasesRes && quickPurchasesRes.success) this.state.quickPurchases = quickPurchasesRes.data;
    if (commissionRes && commissionRes.success) this.state.commissionSettings = commissionRes.data;

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
