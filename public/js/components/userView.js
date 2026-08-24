class UserView {
  constructor() {
    this.container = document.getElementById('users-table-container');
    this.commissionContainer = document.getElementById('commission-live-table-container');
    this.addUserBtn = document.getElementById('btn-add-user-modal');
    this.saveCommissionBtn = document.getElementById('btn-save-commission-settings');
    this.regions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Chưa phân công'];
    this.selectedRegionFilter = 'ALL';

    this.initEvents();
  }

  initEvents() {
    if (this.addUserBtn) {
      this.addUserBtn.addEventListener('click', () => {
        if (window.authModal) {
          window.authModal.openRegister();
        }
      });
    }

    if (this.saveCommissionBtn) {
      this.saveCommissionBtn.addEventListener('click', () => this.handleSaveCommissionSettings());
    }
  }

  async fetchRegions() {
    try {
      const res = await window.API.getRegions();
      if (res.success && res.data && res.data.length > 0) {
        this.regions = res.data.includes('Chưa phân công') ? res.data : [...res.data, 'Chưa phân công'];
      }
    } catch (e) {}
  }

  async handleSaveCommissionSettings() {
    const topPointValInput = document.getElementById('input-commission-top-point-val');
    const standardPointValInput = document.getElementById('input-commission-standard-point-val');
    const topRateInput = document.getElementById('input-commission-top-rate');
    const standardRateInput = document.getElementById('input-commission-standard-rate');
    const topMultInput = document.getElementById('input-commission-top-mult');

    const topPointValue = Number(topPointValInput?.value || 1000);
    const standardPointValue = Number(standardPointValInput?.value || 500);
    const topRate = Number(topRateInput?.value || 15);
    const standardRate = Number(standardRateInput?.value || 8);
    const topBonusPointsMultiplier = Number(topMultInput?.value || 1.5);

    if (isNaN(topPointValue) || isNaN(standardPointValue) || topPointValue < 0 || standardPointValue < 0) {
      alert('⚠️ Giá trị tính hoa hồng theo điểm (VNĐ / điểm) phải là số hợp lệ >= 0');
      return;
    }

    const res = await window.API.updateCommissionSettings({
      topPointValue,
      standardPointValue,
      topRate,
      standardRate,
      topBonusPointsMultiplier
    });

    if (res.success) {
      alert('🎉 ' + res.message);
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  }

  renderCommissionTable(state) {
    if (!this.commissionContainer) return;
    const { leaderboard, commissionSettings } = state;
    const settings = commissionSettings || { topPointValue: 1000, standardPointValue: 500, topRate: 15, standardRate: 8, topBonusPointsMultiplier: 1.5 };

    const topPointValInput = document.getElementById('input-commission-top-point-val');
    const standardPointValInput = document.getElementById('input-commission-standard-point-val');
    const topRateInput = document.getElementById('input-commission-top-rate');
    const standardRateInput = document.getElementById('input-commission-standard-rate');
    const topMultInput = document.getElementById('input-commission-top-mult');

    if (topPointValInput && document.activeElement !== topPointValInput) topPointValInput.value = settings.topPointValue || 1000;
    if (standardPointValInput && document.activeElement !== standardPointValInput) standardPointValInput.value = settings.standardPointValue || 500;
    if (topRateInput && document.activeElement !== topRateInput) topRateInput.value = settings.topRate || 15;
    if (standardRateInput && document.activeElement !== standardRateInput) standardRateInput.value = settings.standardRate || 8;
    if (topMultInput && document.activeElement !== topMultInput) topMultInput.value = settings.topBonusPointsMultiplier || 1.5;

    const list = leaderboard || [];

    if (list.length === 0) {
      this.commissionContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 16px;">Chưa có dữ liệu Cộng tác viên để tính hoa hồng theo điểm</div>';
      return;
    }

    this.commissionContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th># Thứ Hạng</th>
              <th>Cộng Tác Viên</th>
              <th>Khu Vực</th>
              <th>Điểm Tích Lũy Tuần</th>
              <th>Mức Quy Đổi Đơn Giá</th>
              <th>Tỷ Lệ Chiết Khấu %</th>
              <th>Hoa Hồng Thực Nhận Tuần (Điểm x Đơn Giá)</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((ctv, index) => {
              const isTop1 = index === 0;
              const pointVal = ctv.pointValue || (isTop1 ? (settings.topPointValue || 1000) : (settings.standardPointValue || 500));
              const discountRate = ctv.discountRate || (isTop1 ? settings.topRate : settings.standardRate);
              const estimatedCommission = ctv.estimatedCommission !== undefined ? ctv.estimatedCommission : ((ctv.points || 0) * pointVal);

              let rateBadge = '';
              if (isTop1) {
                rateBadge = `<span class="badge badge-success" style="font-size: 12px; padding: 6px 10px; font-weight: 700;">👑 Top 1 Tuần -> 1.000đ / 1 điểm</span>`;
              } else {
                rateBadge = `<span class="badge badge-info" style="font-size: 12px; padding: 4px 8px;">💼 CTV Thường -> 500đ / 1 điểm</span>`;
              }

              return `
                <tr style="${isTop1 ? 'background: rgba(16, 185, 129, 0.08); border-left: 4px solid var(--success);' : ''}">
                  <td style="font-weight: 800; text-align: center;">${isTop1 ? '👑 Top 1' : index + 1}</td>
                  <td style="font-weight: 700; color: var(--text-primary);">
                    ${ctv.name}
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">📞 ${ctv.phone}</div>
                  </td>
                  <td>📍 ${ctv.region}</td>
                  <td style="color: var(--success); font-weight: 800; font-size: 15px;">+${ctv.points} pts</td>
                  <td>${rateBadge}</td>
                  <td style="font-weight: 600; color: var(--accent-primary);">${discountRate}%</td>
                  <td style="color: var(--success); font-weight: 800; font-size: 16px;">
                    ${(estimatedCommission || 0).toLocaleString()} đ
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">(${ctv.points} pts × ${pointVal.toLocaleString()}đ)</div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async render() {
    this.container = document.getElementById('users-table-container');
    this.commissionContainer = document.getElementById('commission-live-table-container');
    const state = window.store ? window.store.state : null;
    if (state) {
      this.renderCommissionTable(state);
    }

    if (!this.container) return;

    await this.fetchRegions();
    this.container.innerHTML = '<div style="text-align: center; padding: 20px;">Đang tải danh sách tài khoản...</div>';

    const res = await window.API.getUsers();
    if (!res.success || !res.data) {
      this.container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--accent-danger);">Không thể tải danh sách người dùng.</div>';
      return;
    }

    let users = res.data;

    if (users.length === 0) {
      this.container.innerHTML = '<div style="text-align: center; padding: 20px;">Chưa có tài khoản người dùng nào được đăng ký.</div>';
      return;
    }

    // Filter controls UI & Sync VPS Toolbar
    let filterHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">
          👥 Tổng số tài khoản: <span style="color: var(--accent-primary); font-weight: 700;">${users.length}</span>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="btn-sync-vps-code" class="btn btn-warning" style="font-size: 13px; font-weight: 600; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            🔄 Đồng bộ & Cập nhật Code VPS
          </button>
          <label style="font-size: 13px; color: var(--text-secondary);">📍 Sắp xếp / Lọc khu vực:</label>
          <select id="user-region-filter-select" class="form-select" style="width: auto; font-size: 13px;">
            <option value="ALL">🌐 Tất cả khu vực</option>
            ${this.regions.map(r => `<option value="${r}" ${this.selectedRegionFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    let filteredUsers = users;
    if (this.selectedRegionFilter !== 'ALL') {
      filteredUsers = users.filter(u => u.region === this.selectedRegionFilter);
    }

    let tableHtml = `
      <div class="table-responsive">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>#</th>
              <th>Họ và Tên</th>
              <th>Số Điện Thoại</th>
              <th>Trạng Thái CTV</th>
              <th>Khu Vực (Admin sắp xếp)</th>
              <th>Vai Trò (Admin duyệt)</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredUsers.length === 0) {
      tableHtml += `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">Không có tài khoản nào thuộc khu vực "${this.selectedRegionFilter}"</td></tr>`;
    } else {
      filteredUsers.forEach((user, index) => {
        let ctvStatusBadge = '<span class="badge badge-secondary" style="font-size: 11px;">Khách hàng</span>';
        if (user.ctvRequest === 'PENDING') {
          ctvStatusBadge = '<span class="badge badge-warning" style="font-size: 11px; padding: 4px 8px;">⏳ Đang chờ duyệt CTV</span>';
        } else if (user.role === 'CTV' || user.ctvRequest === 'APPROVED') {
          ctvStatusBadge = '<span class="badge badge-success" style="font-size: 11px; padding: 4px 8px;">💼 Cộng Tác Viên</span>';
        }

        const regionOptionsHtml = this.regions.map(r => 
          `<option value="${r}" ${user.region === r ? 'selected' : ''}>${r}</option>`
        ).join('');

        const roleOptionsHtml = `
          <option value="CUSTOMER" ${user.role === 'CUSTOMER' ? 'selected' : ''}>🛒 Khách Hàng</option>
          <option value="CTV" ${user.role === 'CTV' ? 'selected' : ''}>💼 Cộng Tác Viên</option>
          <option value="DRIVER" ${user.role === 'DRIVER' ? 'selected' : ''}>🚚 Tài Xế Giao Hàng</option>
          <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>👑 Quản Trị Viên</option>
        `;

        const isPendingCTV = user.ctvRequest === 'PENDING';

        tableHtml += `
          <tr data-user-id="${user.id}">
            <td>${index + 1}</td>
            <td style="font-weight: 600;">${user.name}</td>
            <td style="font-family: monospace; color: var(--accent-primary); font-weight: 600;">${user.phone}</td>
            <td>${ctvStatusBadge}</td>
            <td>
              <select class="form-select select-user-region" style="font-size: 12px; padding: 4px 8px;">
                ${regionOptionsHtml}
              </select>
            </td>
            <td>
              <select class="form-select select-user-role" style="font-size: 12px; padding: 4px 8px;">
                ${roleOptionsHtml}
              </select>
            </td>
            <td>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${isPendingCTV ? `<button class="btn btn-success btn-approve-ctv" style="font-size: 11px; padding: 4px 8px;" title="Duyệt làm CTV">✅ Duyệt CTV</button>` : ''}
                <button class="btn btn-primary btn-save-user-role" style="font-size: 11px; padding: 4px 8px;">💾 Lưu</button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = filterHtml + tableHtml;

    const filterSelect = document.getElementById('user-region-filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedRegionFilter = e.target.value;
        this.render();
      });
    }

    const syncBtn = document.getElementById('btn-sync-vps-code');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc chắn muốn kích hoạt Đồng bộ & Cập nhật Code từ Git Repository lên VPS Linux không?')) {
          return;
        }
        syncBtn.disabled = true;
        syncBtn.innerHTML = '⏳ Đang kéo code VPS...';
        try {
          const res = await window.API.syncCode();
          if (res.success) {
            alert('🎉 ' + res.message + '\n\n' + (res.logs ? res.logs.join('\n') : ''));
          } else {
            alert('❌ Lỗi đồng bộ: ' + (res.message || 'Không thể đồng bộ code'));
          }
        } catch (e) {
          alert('❌ Lỗi kết nối khi đồng bộ: ' + e.message);
        } finally {
          syncBtn.disabled = false;
          syncBtn.innerHTML = '🔄 Đồng bộ & Cập nhật Code VPS';
        }
      });
    }

    const saveBtns = this.container.querySelectorAll('.btn-save-user-role');
    saveBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSaveUser(e));
    });

    const approveBtns = this.container.querySelectorAll('.btn-approve-ctv');
    approveBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleApproveCTV(e));
    });
  }

  async handleSaveUser(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const userId = tr.dataset.userId;
    const roleSelect = tr.querySelector('.select-user-role');
    const regionSelect = tr.querySelector('.select-user-region');

    const role = roleSelect?.value;
    const region = regionSelect?.value;

    if (!userId || !role || !region) return;

    const res = await window.API.updateUserRoleAndRegion(userId, role, region);
    if (res.success) {
      alert(res.message);
      window.store.fetchAll();
      this.render();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }

  async handleApproveCTV(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const userId = tr.dataset.userId;
    const regionSelect = tr.querySelector('.select-user-region');
    let region = regionSelect?.value;

    if (region === 'Chưa phân công') {
      region = 'Hà Nội';
    }

    const res = await window.API.updateUserRoleAndRegion(userId, 'CTV', region);
    if (res.success) {
      alert(`✅ Đã phê duyệt người dùng làm Cộng Tác Viên tại khu vực ${region}!`);
      window.store.fetchAll();
      this.render();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }
}

window.userView = new UserView();
