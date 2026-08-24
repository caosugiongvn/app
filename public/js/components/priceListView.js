class PriceListView {
  constructor() {
    this.approvalContainer = document.getElementById('pricelist-approval-container');
    this.selectedStatusFilter = 'PENDING'; // Default: PENDING
    this.leaderboardRegion = 'ALL';

    this.initEvents();
  }

  initEvents() {
    // Status filter buttons if present
  }

  setStatusFilter(status) {
    this.selectedStatusFilter = status;
    this.render();
  }

  async approveOrder(orderId) {
    const driverSelect = document.getElementById(`pricelist-approve-driver-${orderId}`);
    const dateInput = document.getElementById(`pricelist-approve-date-${orderId}`);

    const driverId = driverSelect ? driverSelect.value : null;
    let estimatedDeliveryTime = dateInput ? dateInput.value.trim() : '';

    if (!driverId) {
      alert('⚠️ Vui lòng chọn tài xế phân công cho đơn hàng!');
      return;
    }

    if (!estimatedDeliveryTime) {
      alert('⚠️ Vui lòng chọn ngày giờ giao dự kiến!');
      return;
    }

    if (estimatedDeliveryTime.includes('T')) {
      const parts = estimatedDeliveryTime.split('T');
      const dateParts = parts[0].split('-');
      estimatedDeliveryTime = `${parts[1]} ngày ${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    }

    const res = await window.API.approveOrder(orderId, {
      driverId,
      estimatedDeliveryTime
    });

    if (res.success) {
      alert('🎉 ' + res.message);
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  }

  async cancelOrder(orderId) {
    const reason = prompt(`Nhập lý do từ chối / hủy đơn ${orderId}:`, 'Không đủ hàng / Địa chỉ không hợp lệ');
    if (reason === null) return;

    const res = await window.API.cancelOrder(orderId, reason);
    if (res.success) {
      alert('⚠️ ' + res.message);
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  }

  render() {
    this.approvalContainer = document.getElementById('pricelist-approval-container');
    const state = window.store.state;
    const { orders, drivers, currentUser, leaderboard, regions } = state;

    if (!this.approvalContainer) return;

    const isCTV = currentUser && currentUser.role === 'CTV';
    const isAdmin = currentUser && currentUser.role === 'ADMIN';
    const isGuest = !currentUser;

    const tabTextEl = document.getElementById('tab-pricelist-text');

    // 1. Dynamic Tab Button Label based on user role (Only CTV sees Leaderboard tab title)
    if (tabTextEl) {
      if (isCTV) {
        tabTextEl.textContent = '🏆 Bảng Xếp Hạng CTV';
      } else {
        tabTextEl.textContent = '⚡ Duyệt Đơn Nhanh';
      }
    }

    const headerCard = document.querySelector('#view-pricelist > .glass-card:first-child');
    const filterBar = document.getElementById('pricelist-status-filter-bar');

    // 2. FOR LOGGED-IN CTV USER VIEW ONLY: Hide Admin Order Approval & Render CTV Leaderboard
    if (isCTV) {
      if (filterBar) filterBar.innerHTML = ''; // Clear status filters for CTV

      if (headerCard) {
        headerCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 style="font-size: 18px; font-weight: 700; color: var(--accent-primary);">🏆 Bảng Xếp Hạng Cộng Tác Viên</h2>
              <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Vinh danh các Cộng tác viên có điểm tích lũy và doanh số bán hàng xuất sắc nhất</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <select id="pricelist-leaderboard-region" class="form-select" style="font-size: 13px; width: auto; min-width: 150px;">
                <option value="ALL">🌐 Tất cả khu vực</option>
                ${(regions || []).map(r => `<option value="${r}">📍 ${r}</option>`).join('')}
              </select>
            </div>
          </div>
        `;

        const regionSelect = document.getElementById('pricelist-leaderboard-region');
        if (regionSelect) {
          regionSelect.value = this.leaderboardRegion || 'ALL';
          regionSelect.onchange = (e) => {
            this.leaderboardRegion = e.target.value;
            this.render();
          };
        }
      }

      const regionFilter = this.leaderboardRegion || 'ALL';
      let list = leaderboard || [];
      if (regionFilter !== 'ALL') {
        list = list.filter(c => c.region === regionFilter);
      }

      if (list.length === 0) {
        this.approvalContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px;">Chưa có dữ liệu xếp hạng trong khu vực này.</div>';
      } else {
        this.approvalContainer.innerHTML = `
          <div class="leaderboard-list">
            ${list.map((ctv, idx) => {
              let rank = ctv.rank || (idx + 1);
              let rankClass = 'rank-normal';
              let itemClass = '';
              let crown = '';

              if (rank === 1) { rankClass = 'rank-1'; itemClass = 'top-1'; crown = '👑 '; }
              else if (rank === 2) { rankClass = 'rank-2'; itemClass = 'top-2'; crown = '🥈 '; }
              else if (rank === 3) { rankClass = 'rank-3'; itemClass = 'top-3'; crown = '🥉 '; }

              return `
                <div class="leaderboard-item ${itemClass}">
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    <div>
                      <div style="font-weight: 700; font-size: 15px;">${crown}${ctv.name}</div>
                      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">📍 ${ctv.region} | 📞 ${ctv.phone}</div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 700; color: var(--success); font-size: 15px;">+${ctv.points} pts</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${(ctv.totalSales || 0).toLocaleString()} đ (${ctv.completedOrdersCount || 0} đơn)</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      return;
    }

    // 3. FOR GUEST (UNAUTHENTICATED USER) OR CUSTOMER VIEW: Display Product Price Quotes, Quick Buy Buttons & CTV Leaderboard
    if (isGuest || !isAdmin) {
      if (tabTextEl) {
        tabTextEl.textContent = '🏷️ Báo Giá & Mua Hàng Nhanh';
      }

      const products = state.products || [];
      const defaultCats = ['Cây Giống', 'Phân Bón', 'Thuốc BVTV', 'Vật Tư Nông Nghiệp'];
      const categories = Array.from(new Set([...products.map(p => p.category).filter(Boolean), ...defaultCats]));
      const standardPointVal = state.commissionSettings?.standardPointValue || 500;

      if (!this.selectedCategory) this.selectedCategory = 'ALL';

      if (headerCard) {
        headerCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
            <div>
              <h2 style="font-size: 18px; font-weight: 700; color: var(--accent-primary);">🏷️ Tra Cứu Báo Giá Sản Phẩm & Mua Hàng Nhanh</h2>
              <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Bấm <strong>"🛒 Mua Hàng Nhanh"</strong> để gửi SĐT tư vấn hoặc Đăng Ký CTV để mua với giá chiết khấu ưu đãi.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input type="text" id="guest-price-search" class="form-control" placeholder="🔍 Tìm theo tên hoặc mã SP..." style="font-size: 13px; padding: 6px 12px; min-width: 200px;" value="${this.searchQuery || ''}">
            </div>
          </div>

          <!-- CATEGORY TABS BAR -->
          <div class="category-tabs-container">
            <button class="category-tab-btn ${this.selectedCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">
              📁 Tất cả danh mục
            </button>
            ${categories.map(c => {
              let icon = '🌿';
              if (c.toLowerCase().includes('phân bón')) icon = '🧪';
              if (c.toLowerCase().includes('thuốc')) icon = '🛡️';
              if (c.toLowerCase().includes('vật tư')) icon = '📦';
              return `
                <button class="category-tab-btn ${this.selectedCategory === c ? 'active' : ''}" data-cat="${c}">
                  ${icon} ${c}
                </button>
              `;
            }).join('')}
          </div>
        `;

        const searchInput = document.getElementById('guest-price-search');
        if (searchInput) {
          searchInput.oninput = (e) => {
            this.searchQuery = e.target.value;
            this.render();
          };
        }

        const tabBtns = headerCard.querySelectorAll('.category-tab-btn');
        tabBtns.forEach(btn => {
          btn.onclick = () => {
            this.selectedCategory = btn.dataset.cat;
            this.render();
          };
        });
      }

      // Filter products: Hide out-of-stock items (available <= 0) and filter by search & category tab
      let filteredProds = products.filter(p => {
        const stockVal = Number(p.stock !== undefined ? p.stock : 9999);
        const reservedVal = Number(p.reserved || 0);
        const available = p.available !== undefined ? Number(p.available) : (stockVal - reservedVal);
        return available > 0;
      });

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase().trim();
        filteredProds = filteredProds.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.code && p.code.toLowerCase().includes(q)));
      }
      if (this.selectedCategory && this.selectedCategory !== 'ALL') {
        const targetCat = this.selectedCategory.trim().toLowerCase();
        filteredProds = filteredProds.filter(p => (p.category || 'Chung').trim().toLowerCase() === targetCat);
      }

      // Leaderboard list
      let topCtvs = leaderboard || [];

      this.approvalContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Left Column: Product Catalog Price Cards & Quick Buy Buttons -->
          <div style="flex: 2;">
            <div style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
              <span>📦 Danh Mục Sản Phẩm (${filteredProds.length} sản phẩm)</span>
              <span style="font-size: 12px; color: var(--text-muted);">💡 Bấm để gửi SĐT tư vấn nhanh</span>
            </div>

            ${filteredProds.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: var(--text-muted);" class="glass-card">
                Không tìm thấy sản phẩm nào phù hợp trong danh mục này.
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px;">
                ${filteredProds.map(p => {
                  const orig = p.originalPrice || p.sellingPrice || 0;
                  const promo = p.promoPrice || 0;
                  const effSelling = p.sellingPrice || (promo > 0 ? promo : orig);
                  const hasPromo = promo > 0 && promo < orig;
                  const commissionVnd = (p.points || 0) * standardPointVal;

                  return `
                  <div class="glass-card" style="padding: 14px; display: flex; flex-direction: column; justify-content: space-between; border: ${hasPromo ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glass)'}; position: relative;">
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; gap: 4px;">
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <span class="badge badge-secondary">${p.code || 'SP'}</span>
                          ${hasPromo ? '<span class="badge badge-danger" style="font-size: 10px; font-weight: 800; padding: 2px 6px;">🔥 KM</span>' : ''}
                        </div>
                        <span class="badge badge-success" style="font-weight: 700;" title="${p.points || 0} điểm tích lũy">
                          🎁 +${commissionVnd.toLocaleString()} đ HH
                        </span>
                      </div>
                      <div style="font-weight: 700; font-size: 14px; color: var(--text-primary); margin-bottom: 4px; line-height: 1.3;">
                        ${p.name}
                      </div>
                      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
                        Danh mục: ${p.category || 'Chung'}
                      </div>
                      <div style="margin-bottom: 10px;">
                        <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                          <span style="font-size: 17px; font-weight: 800; color: ${hasPromo ? 'var(--success)' : 'var(--accent-primary)'};">
                            ${effSelling.toLocaleString()} đ
                          </span>
                          ${hasPromo ? `
                            <span style="font-size: 12px; text-decoration: line-through; color: var(--text-muted);">
                              ${orig.toLocaleString()} đ
                            </span>
                          ` : ''}
                        </div>
                      </div>
                    </div>

                    <button class="btn btn-primary btn-quick-buy-item" data-name="${p.name}" style="width: 100%; font-weight: 600; justify-content: center; font-size: 12px; padding: 8px 10px;">
                      🛒 Mua Hàng / Yêu Cầu Tư Vấn
                    </button>
                  </div>
                `;}).join('')}
              </div>
            `}
          </div>

          <!-- Right Column: CTV Leaderboard -->
          <div>
            <div class="glass-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">🏆 Bảng Xếp Hạng CTV</h3>
                  <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Top hoa hồng tích lũy & doanh số</p>
                </div>
              </div>

              <div class="leaderboard-list">
                ${topCtvs.length === 0 ? '<div style="color: var(--text-muted); font-size: 12px;">Chưa có dữ liệu xếp hạng.</div>' : topCtvs.slice(0, 5).map((ctv, idx) => {
                  let rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-normal';
                  const ctvPointVal = ctv.pointValue || (idx === 0 ? (state.commissionSettings?.topPointValue || 1000) : standardPointVal);
                  const ctvEstComm = ctv.estimatedCommission !== undefined ? ctv.estimatedCommission : ((ctv.points || 0) * ctvPointVal);

                  return `
                    <div class="leaderboard-item" style="padding: 10px 12px; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="rank-badge ${rankClass}" style="width: 26px; height: 26px; font-size: 12px;">${idx + 1}</div>
                        <div>
                          <div style="font-weight: 700; font-size: 13px;">${ctv.name}</div>
                          <div style="font-size: 11px; color: var(--text-muted);">📍 ${ctv.region}</div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-weight: 700; color: var(--success); font-size: 13px;">+${(ctvEstComm || 0).toLocaleString()} đ</div>
                        <div style="font-size: 10px; color: var(--text-muted);">${ctv.points} pts</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Attach event listeners to quick buy buttons
      const quickBtns = this.approvalContainer.querySelectorAll('.btn-quick-buy-item');
      quickBtns.forEach(btn => {
        btn.onclick = () => {
          if (window.quickBuyModal) {
            window.quickBuyModal.open(btn.dataset.name);
          } else if (window.authModal) {
            window.authModal.openLogin();
          }
        };
      });

      return;
    }

    // FOR ADMIN LOGGED IN USER VIEW:
    let userOrders = orders || [];
    const pendingOrders = userOrders.filter(o => o.status === 'PENDING_DELIVERY' || o.approvalStatus === 'PENDING');
    const approvedOrders = userOrders.filter(o => o.approvalStatus === 'APPROVED' && o.status !== 'DELIVERED');
    const deliveredOrders = userOrders.filter(o => o.status === 'DELIVERED');
    const cancelledOrders = userOrders.filter(o => o.status === 'CANCELLED' || o.approvalStatus === 'REJECTED');

    const adminFilterBar = document.getElementById('pricelist-status-filter-bar');
    if (adminFilterBar) {
      adminFilterBar.innerHTML = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Lọc trạng thái:</span>
          <button class="btn ${this.selectedStatusFilter === 'PENDING' ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="priceListView.setStatusFilter('PENDING')">
            ⏳ Chờ Duyệt (${pendingOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="priceListView.setStatusFilter('APPROVED')">
            ✅ Đã Duyệt / Đang Giao (${approvedOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'DELIVERED' ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="priceListView.setStatusFilter('DELIVERED')">
            🎉 Đã Giao Thành Công (${deliveredOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'CANCELLED' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="priceListView.setStatusFilter('CANCELLED')">
            ❌ Đã Hủy / Từ Chối (${cancelledOrders.length})
          </button>
        </div>
      `;
    }

    let displayOrders = pendingOrders;
    if (this.selectedStatusFilter === 'APPROVED') displayOrders = approvedOrders;
    if (this.selectedStatusFilter === 'DELIVERED') displayOrders = deliveredOrders;
    if (this.selectedStatusFilter === 'CANCELLED') displayOrders = cancelledOrders;

    if (displayOrders.length === 0) {
      this.approvalContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);" class="glass-card">
          <div style="font-size: 40px; margin-bottom: 10px;">✨</div>
          <p style="font-size: 16px; font-weight: 700;">Không có đơn hàng nào ở trạng thái này</p>
          <p style="font-size: 13px; color: var(--text-muted);">Tất cả các đơn đặt hàng đã được xử lý cập nhật.</p>
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 16);

    this.approvalContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Cộng Tác Viên</th>
              <th>Khách Hàng</th>
              <th>Sản Phẩm Đặt</th>
              <th>Tổng Tiền COD</th>
              <th>Phân Công Tài Xế</th>
              <th>Chọn Ngày Giao Dự Kiến</th>
              <th>Thao Tác / Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            ${displayOrders.map(o => {
              const isPending = o.approvalStatus === 'PENDING' || o.status === 'PENDING_DELIVERY';
              const isApproved = o.approvalStatus === 'APPROVED' && o.status !== 'DELIVERED';
              const isDelivered = o.status === 'DELIVERED';
              const isCancelled = o.status === 'CANCELLED' || o.approvalStatus === 'REJECTED';

              const itemsSummary = (o.items || []).map(i => `${i.productName} (x${i.qty})`).join(', ');

              let driverCol = '';
              let dateCol = '';
              let actionCol = '';

              if (isPending) {
                driverCol = `
                  <select id="pricelist-approve-driver-${o.id}" class="form-select" style="font-size: 13px; padding: 6px 10px; min-width: 150px;">
                    <option value="">-- Chọn Tài Xế --</option>
                    ${(drivers || []).map(d => `
                      <option value="${d.id}" ${o.driverId === d.id ? 'selected' : ''}>🚚 ${d.name}</option>
                    `).join('')}
                  </select>
                `;

                dateCol = `
                  <input type="datetime-local" id="pricelist-approve-date-${o.id}" class="form-control" style="font-size: 13px; padding: 6px 10px; min-width: 170px;" min="${todayStr}">
                `;

                actionCol = `
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-success btn-sm" onclick="priceListView.approveOrder('${o.id}')" title="Duyệt đơn và phân công tài xế">
                      ⚡ Duyệt Nhanh
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="priceListView.cancelOrder('${o.id}')" title="Từ chối đơn hàng">
                      ❌ Từ Chối
                    </button>
                  </div>
                `;
              } else if (isApproved) {
                driverCol = `
                  <select id="pricelist-approve-driver-${o.id}" class="form-select" style="font-size: 13px; padding: 6px 10px; min-width: 150px;">
                    ${(drivers || []).map(d => `
                      <option value="${d.id}" ${o.driverId === d.id ? 'selected' : ''}>🚚 ${d.name}</option>
                    `).join('')}
                  </select>
                `;

                dateCol = `
                  <input type="datetime-local" id="pricelist-approve-date-${o.id}" class="form-control" style="font-size: 13px; padding: 6px 10px; min-width: 170px;" min="${todayStr}">
                `;

                actionCol = `
                  <button class="btn btn-primary btn-sm" onclick="priceListView.approveOrder('${o.id}')">
                    🔄 Đổi Tài Xế / Hẹn Giờ
                  </button>
                `;
              } else {
                const assignedDriver = (drivers || []).find(d => d.id === o.driverId);
                driverCol = assignedDriver 
                  ? `<span style="font-weight: 600; color: var(--accent-primary);">🚚 ${assignedDriver.name}</span>`
                  : `<span style="font-size: 12px; color: var(--text-muted);">${o.driverName || 'Chưa phân công'}</span>`;

                dateCol = o.estimatedDeliveryTime
                  ? `<span style="font-weight: 600; color: var(--accent-primary);">🕒 ${o.estimatedDeliveryTime}</span>`
                  : `<span style="font-size: 12px; color: var(--text-muted);">Chờ cập nhật</span>`;

                if (isDelivered) {
                  actionCol = `<span class="badge badge-success">🎉 Giao Thành Công</span>`;
                } else if (isCancelled) {
                  actionCol = `<span class="badge badge-danger">❌ Đã Hủy</span>`;
                }
              }

              return `
                <tr>
                  <td style="font-weight: 800; color: var(--accent-primary);">${o.id}</td>
                  <td>
                    <div style="font-weight: 600;">💼 ${o.ctvName}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">📍 ${o.ctvRegion}</div>
                  </td>
                  <td>
                    <div style="font-weight: 600;">👤 ${o.customerName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">📞 ${o.customerPhone}</div>
                    <div style="font-size: 11px; color: var(--text-muted); max-width: 180px;">📍 ${o.address}</div>
                  </td>
                  <td style="font-size: 13px; max-width: 200px;">
                    <span title="${itemsSummary}">${itemsSummary}</span>
                  </td>
                  <td style="font-weight: 800; color: var(--success); font-size: 15px;">
                    ${(o.totalAmount || 0).toLocaleString()} đ
                  </td>
                  <td>${driverCol}</td>
                  <td>${dateCol}</td>
                  <td>${actionCol}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

window.priceListView = new PriceListView();
