const DashboardView = {
  init() {
    this.regionSelect = document.getElementById('leaderboard-region-filter');
    this.leaderboardContainer = document.getElementById('leaderboard-container');
    this.regionalStatsContainer = document.getElementById('regional-stats-container');
    this.recentOrdersContainer = document.getElementById('recent-orders-container');
    this.approvalSection = document.getElementById('admin-approval-section');
    this.approvalTableContainer = document.getElementById('admin-approval-table-container');
    this.quickPurchaseSection = document.getElementById('admin-quick-purchase-section');
    this.quickPurchaseTableContainer = document.getElementById('admin-quick-purchase-table-container');

    if (this.regionSelect) {
      this.regionSelect.addEventListener('change', (e) => {
        window.store.setLeaderboardRegion(e.target.value);
      });
    }
  },

  async updateQuickPurchaseStatus(id, status) {
    const res = await window.API.updateQuickPurchaseStatus(id, status);
    if (res.success) {
      if (typeof showToast === 'function') showToast(res.message);
      window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  },

  async deleteQuickPurchase(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu tư vấn này?')) return;
    const res = await window.API.deleteQuickPurchase(id);
    if (res.success) {
      if (typeof showToast === 'function') showToast(res.message);
      window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  },

  async approveOrder(orderId) {
    const driverSelect = document.getElementById(`approve-driver-${orderId}`);
    const timeInput = document.getElementById(`approve-time-${orderId}`);

    const driverId = driverSelect ? driverSelect.value : null;
    const estimatedDeliveryTime = timeInput ? timeInput.value.trim() : '';

    if (!driverId) {
      alert('⚠️ Vui lòng chọn tài xế phân công cho đơn hàng này!');
      return;
    }

    if (!estimatedDeliveryTime) {
      alert('⚠️ Vui lòng nhập thời gian giao dự kiến (ví dụ: 17:00 ngày 07/08)!');
      return;
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
  },

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
  },

  render(state) {
    const { dashboardReport, leaderboard, regions, orders, drivers, currentUser } = state;
    if (!dashboardReport) return;

    const { financial, inventory, orders: orderStats } = dashboardReport;

    document.getElementById('stat-revenue').textContent = financial.totalRevenue.toLocaleString() + ' đ';
    document.getElementById('stat-profit').textContent = financial.totalProfit.toLocaleString() + ' đ';
    document.getElementById('stat-profit-margin').textContent = `Biên lợi nhuận: ${financial.profitMargin} (Giá vốn: ${financial.totalCost.toLocaleString()}đ)`;
    document.getElementById('stat-pending-orders').textContent = orderStats.pendingCount;
    document.getElementById('stat-inventory-summary').textContent = `${inventory.totalStockCount} / ${inventory.totalReservedCount} / ${inventory.totalAvailableCount}`;

    // --- RENDERING ADMIN ORDER APPROVAL SECTION ---
    if (this.approvalSection) {
      // Chỉ Quản trị viên (ADMIN) mới xem và thực hiện duyệt đơn hàng
      const isAdmin = currentUser && currentUser.role === 'ADMIN';
      if (!isAdmin) {
        this.approvalSection.style.display = 'none';
      } else {
        this.approvalSection.style.display = 'block';

        const pendingOrders = orders.filter(o => o.status === 'PENDING_DELIVERY' || o.approvalStatus === 'PENDING');
        const pendingBadge = document.getElementById('pending-approval-count-badge');
        if (pendingBadge) {
          pendingBadge.textContent = `⏳ ${pendingOrders.length} đơn chờ duyệt`;
        }

        if (this.approvalTableContainer) {
          if (pendingOrders.length === 0) {
            this.approvalTableContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 24px;">✨ Tất cả đơn hàng đã được xử lý duyệt. Không có đơn chờ duyệt.</div>';
          } else {
            this.approvalTableContainer.innerHTML = `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Người Đặt (CTV)</th>
                    <th>Khách Hàng</th>
                    <th>Tổng Tiền</th>
                    <th>Phân Công Tài Xế</th>
                    <th>Thời Gian Giao Dự Kiến</th>
                    <th>Thao Tác Duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingOrders.map(o => {
                    const isApproved = o.approvalStatus === 'APPROVED';
                    return `
                      <tr>
                        <td style="font-weight: 700; color: var(--accent-primary);">${o.id}</td>
                        <td style="font-weight: 600;">💼 ${o.ctvName}<br><span style="font-size: 11px; color: var(--text-muted);">${o.ctvRegion}</span></td>
                        <td>${o.customerName}<br><span style="font-size: 12px; color: var(--text-secondary);">📞 ${o.customerPhone}</span><br><span style="font-size: 11px; color: var(--text-muted);">📍 ${o.address}</span></td>
                        <td style="font-weight: 700; color: var(--success);">${o.totalAmount.toLocaleString()} đ</td>
                        <td>
                          <select id="approve-driver-${o.id}" class="form-select" style="font-size: 13px; padding: 4px 8px; min-width: 140px;">
                            <option value="">-- Chọn Tài Xế --</option>
                            ${drivers.map(d => `
                              <option value="${d.id}" ${o.driverId === d.id ? 'selected' : ''}>🚚 ${d.name}</option>
                            `).join('')}
                          </select>
                        </td>
                        <td>
                          <input type="text" id="approve-time-${o.id}" class="form-control" placeholder="VD: 17:00 - 07/08" value="${o.estimatedDeliveryTime || ''}" style="font-size: 13px; padding: 4px 8px; min-width: 140px;">
                        </td>
                        <td>
                          <div style="display: flex; gap: 6px;">
                            <button class="btn btn-success btn-sm" onclick="DashboardView.approveOrder('${o.id}')" title="Duyệt đơn và phân công">
                              ${isApproved ? '🔄 Cập Nhật' : '✅ Duyệt Đơn'}
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="DashboardView.cancelOrder('${o.id}')" title="Từ chối / Hủy đơn">
                              ❌ Từ Chối
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `;
          }
        }
      }
    }

    // --- RENDERING ADMIN QUICK PURCHASES (MUA HÀNG NHANH) SECTION ---
    if (this.quickPurchaseSection) {
      const isAdmin = currentUser && currentUser.role === 'ADMIN';
      if (!isAdmin) {
        this.quickPurchaseSection.style.display = 'none';
      } else {
        this.quickPurchaseSection.style.display = 'block';

        const quickPurchases = state.quickPurchases || [];
        const pendingCount = quickPurchases.filter(q => q.status === 'PENDING').length;
        const qpBadge = document.getElementById('admin-quick-purchase-count-badge');
        if (qpBadge) {
          qpBadge.textContent = `📞 ${pendingCount} SĐT chờ liên hệ`;
        }

        if (this.quickPurchaseTableContainer) {
          if (quickPurchases.length === 0) {
            this.quickPurchaseTableContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 24px;">✨ Chưa có yêu cầu Mua Hàng Nhanh nào từ khách hàng.</div>';
          } else {
            this.quickPurchaseTableContainer.innerHTML = `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Họ và Tên Khách</th>
                    <th>Số Điện Thoại</th>
                    <th>Sản Phẩm Quan Tâm</th>
                    <th>Ghi Chú Tư Vấn</th>
                    <th>Thời Gian Gửi</th>
                    <th>Trạng Thái</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${quickPurchases.map((q, idx) => {
                    let statusBadge = '<span class="badge badge-warning" style="font-size: 11px;">⏳ Chờ liên hệ</span>';
                    if (q.status === 'CONTACTED') {
                      statusBadge = '<span class="badge badge-success" style="font-size: 11px;">✅ Đã tư vấn</span>';
                    } else if (q.status === 'CANCELLED') {
                      statusBadge = '<span class="badge badge-danger" style="font-size: 11px;">❌ Đã hủy</span>';
                    }

                    const timeStr = q.createdAt ? new Date(q.createdAt).toLocaleString('vi-VN') : 'Mới đây';

                    return `
                      <tr>
                        <td>${idx + 1}</td>
                        <td style="font-weight: 700;">${q.customerName}</td>
                        <td style="font-family: monospace; font-size: 15px; font-weight: 800; color: var(--accent-primary);">📞 ${q.phone}</td>
                        <td style="font-weight: 600; color: var(--text-primary);">${q.productName || 'Tư vấn chung'}</td>
                        <td style="font-size: 12px; color: var(--text-secondary); max-width: 200px;">${q.note || '-'}</td>
                        <td style="font-size: 12px; color: var(--text-muted);">${timeStr}</td>
                        <td>${statusBadge}</td>
                        <td>
                          <div style="display: flex; gap: 6px;">
                            ${q.status !== 'CONTACTED' ? `
                              <button class="btn btn-success btn-sm" onclick="DashboardView.updateQuickPurchaseStatus('${q.id}', 'CONTACTED')" title="Đánh dấu đã liên hệ tư vấn">
                                ✅ Đã Liên Hệ
                              </button>
                            ` : `
                              <button class="btn btn-secondary btn-sm" onclick="DashboardView.updateQuickPurchaseStatus('${q.id}', 'PENDING')" title="Đưa về chờ liên hệ">
                                🔄 Đặt Chờ
                              </button>
                            `}
                            <button class="btn btn-danger btn-sm" onclick="DashboardView.deleteQuickPurchase('${q.id}')" title="Xóa yêu cầu">
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `;
          }
        }
      }
    }

    if (this.regionSelect && this.regionSelect.children.length <= 1) {
      regions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = `📍 ${r}`;
        this.regionSelect.appendChild(opt);
      });
    }

    if (this.leaderboardContainer) {
      if (!leaderboard || leaderboard.length === 0) {
        this.leaderboardContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">Chưa có dữ liệu xếp hạng</div>';
      } else {
        this.leaderboardContainer.innerHTML = leaderboard.map(ctv => {
          let rankClass = 'rank-normal';
          let itemClass = '';
          let crown = '';

          if (ctv.rank === 1) { rankClass = 'rank-1'; itemClass = 'top-1'; crown = '👑 '; }
          else if (ctv.rank === 2) { rankClass = 'rank-2'; itemClass = 'top-2'; crown = '🥈 '; }
          else if (ctv.rank === 3) { rankClass = 'rank-3'; itemClass = 'top-3'; crown = '🥉 '; }

          return `
            <div class="leaderboard-item ${itemClass}">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="rank-badge ${rankClass}">${ctv.rank}</div>
                <div>
                  <div style="font-weight: 700; font-size: 14px;">${crown}${ctv.name}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">📍 ${ctv.region} | 📞 ${ctv.phone}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--success); font-size: 14px;">+${ctv.points} pts</div>
                <div style="font-size: 12px; color: var(--text-muted);">${(ctv.totalSales || 0).toLocaleString()} đ (${ctv.completedOrdersCount || 0} đơn)</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (this.regionalStatsContainer && dashboardReport.regions) {
      this.regionalStatsContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Khu Vực</th>
              <th>Đơn Hoàn Thành</th>
              <th>Doanh Thu</th>
              <th>Lợi Nhuận Ròng</th>
            </tr>
          </thead>
          <tbody>
            ${dashboardReport.regions.map(r => `
              <tr>
                <td style="font-weight: 600;">📍 ${r.region}</td>
                <td>${r.deliveredOrdersCount} đơn</td>
                <td style="color: var(--success); font-weight: 600;">${r.revenue.toLocaleString()} đ</td>
                <td style="color: var(--accent-secondary); font-weight: 600;">${r.profit.toLocaleString()} đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (this.recentOrdersContainer) {
      const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').slice(0, 8);
      if (deliveredOrders.length === 0) {
        this.recentOrdersContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 16px;">Chưa có đơn hàng thành công</div>';
      } else {
        this.recentOrdersContainer.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Tài Xế Giao</th>
                <th>Khách Hàng</th>
                <th>Tổng COD</th>
                <th>Phân Bổ Thanh Toán</th>
                <th>Lợi Nhuận Ròng</th>
              </tr>
            </thead>
            <tbody>
              ${deliveredOrders.map(o => {
                const cash = o.cashAmount || o.totalAmount || 0;
                const transfer = o.transferAmount || 0;
                const debt = o.debtAmount || 0;

                return `
                  <tr>
                    <td style="font-weight: 700; color: var(--accent-primary);">${o.id}</td>
                    <td style="font-weight: 600; font-size: 13px;">🚚 ${o.driverName || 'Tài xế'}</td>
                    <td>${o.customerName}<br><span style="font-size: 11px; color: var(--text-muted);">📞 ${o.customerPhone}</span></td>
                    <td style="font-weight: 700; color: var(--success);">${o.totalAmount.toLocaleString()} đ</td>
                    <td style="font-size: 12px;">
                      <div>💵 Tiền mặt: <strong style="color: var(--success);">${cash.toLocaleString()}đ</strong></div>
                      ${transfer > 0 ? `<div>💳 Chuyển khoản: <strong style="color: var(--accent-secondary);">${transfer.toLocaleString()}đ</strong></div>` : ''}
                      ${debt > 0 ? `<div>⚠️ Nợ lại: <strong style="color: var(--danger);">${debt.toLocaleString()}đ</strong></div>` : ''}
                    </td>
                    <td style="color: var(--success); font-weight: 700;">+${o.profit.toLocaleString()} đ</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }
  }
};

window.DashboardView = DashboardView;
