class UserView {
  constructor() {
    this.container = document.getElementById('users-table-container');
    this.commissionContainer = document.getElementById('commission-live-table-container');
    this.regionsContainer = document.getElementById('regions-table-container');
    this.formAddRegion = document.getElementById('form-add-region');
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

    if (this.formAddRegion) {
      this.formAddRegion.addEventListener('submit', (e) => this.handleAddRegion(e));
    }
  }

  async handleAddRegion(e) {
    e.preventDefault();
    const input = document.getElementById('input-new-region-name');
    const name = input?.value.trim();
    if (!name) {
      alert('⚠️ Vui lòng nhập tên khu vực mới!');
      return;
    }

    const res = await window.API.addRegion(name);
    if (res.success) {
      alert(res.message);
      if (input) input.value = '';
      window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
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

    if (topPointValInput && !topPointValInput.dataset.userEdited) topPointValInput.value = settings.topPointValue || 1000;
    if (standardPointValInput && !standardPointValInput.dataset.userEdited) standardPointValInput.value = settings.standardPointValue || 500;
    if (topRateInput && !topRateInput.dataset.userEdited) topRateInput.value = settings.topRate !== undefined ? settings.topRate : 15;
    if (standardRateInput && !standardRateInput.dataset.userEdited) standardRateInput.value = settings.standardRate !== undefined ? settings.standardRate : 8;
    if (topMultInput && !topMultInput.dataset.userEdited) topMultInput.value = settings.topBonusPointsMultiplier || 1.5;

    [topPointValInput, standardPointValInput, topRateInput, standardRateInput, topMultInput].forEach(inp => {
      if (inp) {
        inp.addEventListener('input', () => { inp.dataset.userEdited = "true"; });
      }
    });

    const topCtvs = leaderboard || [];
    const topPointVal = settings.topPointValue || 1000;
    const standardPointVal = settings.standardPointValue || 500;

    if (topCtvs.length === 0) {
      this.commissionContainer.innerHTML = `
        <div style="color: var(--text-muted); padding: 16px; font-size: 13px;">Chưa có dữ liệu CTV để tính toán hoa hồng thực tế.</div>
      `;
      return;
    }

    this.commissionContainer.innerHTML = `
      <table class="data-table" style="font-size: 13px;">
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Cộng Tác Viên</th>
            <th>Khu Vực</th>
            <th>Tổng Điểm Tích Lũy</th>
            <th>Doanh Số Tích Lũy</th>
            <th>Quy Định Tính Hoa Hồng</th>
            <th>Hoa Hồng Dự Kiến Nhận</th>
          </tr>
        </thead>
        <tbody>
          ${topCtvs.map((ctv, idx) => {
            const isTop1 = idx === 0;
            const pointRate = isTop1 ? topPointVal : standardPointVal;
            const bonusMult = isTop1 ? (settings.topBonusPointsMultiplier || 1.5) : 1.0;
            const estComm = (ctv.points || 0) * pointRate;

            return `
              <tr style="${isTop1 ? 'background: rgba(245, 158, 11, 0.08); font-weight: 700;' : ''}">
                <td style="font-weight: 800;">
                  ${isTop1 ? '👑 Top 1' : idx === 1 ? '🥈 Top 2' : idx === 2 ? '🥉 Top 3' : `#${idx + 1}`}
                </td>
                <td>
                  <div style="font-weight: 700;">${ctv.name}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${ctv.phone}</div>
                </td>
                <td><span class="badge badge-secondary">${ctv.region || 'Hà Nội'}</span></td>
                <td style="font-weight: 800; color: var(--accent-primary);">${(ctv.points || 0).toLocaleString()} pts</td>
                <td style="font-weight: 700; color: var(--success);">${(ctv.totalSales || 0).toLocaleString()} đ</td>
                <td>
                  <span class="badge ${isTop1 ? 'badge-warning' : 'badge-secondary'}" style="font-size: 11px;">
                    ${isTop1 ? `👑 Mức Top 1: ${topPointVal.toLocaleString()}đ/pts (X${bonusMult})` : `💼 Mức Thường: ${standardPointVal.toLocaleString()}đ/pts`}
                  </span>
                </td>
                <td style="font-weight: 800; font-size: 14px; color: var(--success);">
                  🎁 ${estComm.toLocaleString()} đ
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  async renderRegionsTable(state) {
    if (!this.regionsContainer) return;
    const { regions, users, orders } = state;

    let regionList = [];
    try {
      const res = await window.API.getRegionsDetailed();
      if (res.success && res.data && res.data.length > 0) {
        regionList = res.data;
      }
    } catch (e) {}

    if (regionList.length === 0) {
      const names = (regions && regions.length > 0) ? regions : this.regions;
      regionList = names.filter(n => n !== 'Chưa phân công').map((name, idx) => {
        const uCount = (users || []).filter(u => u.region === name).length;
        const oCount = (orders || []).filter(o => o.ctvRegion === name || o.ctv_region === name).length;
        return { id: idx + 1, name, userCount: uCount, orderCount: oCount };
      });
    }

    if (regionList.length === 0) {
      this.regionsContainer.innerHTML = `<div style="padding: 16px; color: var(--text-muted);">Chưa có khu vực nào.</div>`;
      return;
    }

    this.regionsContainer.innerHTML = `
      <table class="data-table" style="font-size: 13px;">
        <thead>
          <tr>
            <th style="width: 50px;">STT</th>
            <th>Tên Khu Vực Bán Hàng / Giao Hàng</th>
            <th style="text-align: center;">Số Tài Khoản / CTV</th>
            <th style="text-align: center;">Số Đơn Hàng Phụ Trách</th>
            <th style="text-align: right; min-width: 180px;">Thao Tác Quản Lý</th>
          </tr>
        </thead>
        <tbody>
          ${regionList.map((r, idx) => `
            <tr>
              <td style="font-weight: 700; color: var(--text-secondary);">${idx + 1}</td>
              <td>
                <div style="font-weight: 800; font-size: 14px; color: var(--accent-primary); display: flex; align-items: center; gap: 6px;">
                  📍 ${r.name}
                </div>
              </td>
              <td style="text-align: center;">
                <span class="badge badge-secondary" style="font-weight: 700;">👤 ${r.userCount} tài khoản</span>
              </td>
              <td style="text-align: center;">
                <span class="badge badge-success" style="font-weight: 700;">📦 ${r.orderCount} đơn</span>
              </td>
              <td style="text-align: right;">
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                  <button type="button" class="btn btn-warning btn-sm btn-rename-region" data-name="${r.name}" title="Thay đổi tên khu vực này">
                    ✏️ Đổi Tên
                  </button>
                  <button type="button" class="btn btn-danger btn-sm btn-delete-region" data-name="${r.name}" title="Xóa khu vực này">
                    🗑️ Xóa
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.regionsContainer.querySelectorAll('.btn-rename-region').forEach(btn => {
      btn.addEventListener('click', () => this.handleRenameRegion(btn.dataset.name));
    });

    this.regionsContainer.querySelectorAll('.btn-delete-region').forEach(btn => {
      btn.addEventListener('click', () => this.handleDeleteRegion(btn.dataset.name));
    });
  }

  async handleRenameRegion(oldName) {
    if (!oldName) return;
    const newName = prompt(`✏️ Nhập tên mới cho khu vực "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;

    const res = await window.API.renameRegion(oldName, newName.trim());
    if (res.success) {
      alert(res.message);
      await window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }

  async handleDeleteRegion(name) {
    if (!name) return;
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa khu vực "${name}"?\nTất cả tài khoản thuộc khu vực này sẽ được chuyển sang "Chưa phân công".`)) {
      return;
    }

    const res = await window.API.deleteRegion(name);
    if (res.success) {
      alert(res.message);
      await window.store.fetchAll();
    } else {
      alert(`⚠️ ${res.message}`);
    }
  }

  async render() {
    await this.fetchRegions();
    const state = window.store.getState();

    this.renderCommissionTable(state);
    this.renderUsersTable(state);
    this.renderRegionsTable(state);
  }

  renderUsersTable(state) {
    if (!this.container) return;

    const { users, currentUser } = state;
    const isAdmin = currentUser?.role === 'ADMIN';

    if (!users || users.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          Chưa có tài khoản người dùng nào.
        </div>
      `;
      return;
    }

    let filteredUsers = users;
    if (this.selectedRegionFilter !== 'ALL') {
      filteredUsers = users.filter(u => u.region === this.selectedRegionFilter);
    }

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 13px; color: var(--text-secondary);">
          Hiển thị <b>${filteredUsers.length}</b> / <b>${users.length}</b> tài khoản
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 12px; font-weight: 600;">Lọc theo khu vực:</label>
          <select id="user-filter-region" class="form-control" style="width: auto; font-size: 12px; padding: 4px 8px;">
            <option value="ALL" ${this.selectedRegionFilter === 'ALL' ? 'selected' : ''}>🌍 Tất cả khu vực</option>
            ${this.regions.map(r => `<option value="${r}" ${this.selectedRegionFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Họ & Tên</th>
            <th>Số Điện Thoại</th>
            <th>Vai Trò (Role)</th>
            <th>Khu Vực Phụ Trách</th>
            <th>Yêu Cầu Làm CTV</th>
            <th>Ngày Đăng Ký</th>
            <th style="text-align: right;">Thao Tác Quản Trị</th>
          </tr>
        </thead>
        <tbody>
          ${filteredUsers.map(u => {
            const isCurrentUser = currentUser?.id === u.id || currentUser?.phone === u.phone;
            const regionOptionsHtml = this.regions.map(r => 
              `<option value="${r}" ${u.region === r ? 'selected' : ''}>${r}</option>`
            ).join('');

            let ctvReqBadge = '<span class="badge badge-secondary">Khách hàng</span>';
            if (u.ctvRequest === 'PENDING') {
              ctvReqBadge = '<span class="badge badge-warning" style="font-weight: 700;">⏳ Đang chờ duyệt CTV</span>';
            } else if (u.ctvRequest === 'APPROVED' || u.role === 'CTV') {
              ctvReqBadge = '<span class="badge badge-success">✅ Đã duyệt CTV</span>';
            }

            return `
              <tr data-user-id="${u.id}">
                <td>
                  <div style="font-weight: 700;">${u.name} ${isCurrentUser ? '<span class="badge badge-primary" style="font-size: 10px;">Bạn</span>' : ''}</div>
                </td>
                <td style="font-family: monospace; font-size: 13px;">${u.phone}</td>
                <td>
                  ${isAdmin && !isCurrentUser ? `
                    <select class="form-control select-user-role" style="font-size: 12px; padding: 2px 6px; font-weight: 600;">
                      <option value="CUSTOMER" ${u.role === 'CUSTOMER' ? 'selected' : ''}>Khách Hàng</option>
                      <option value="CTV" ${u.role === 'CTV' ? 'selected' : ''}>Cộng Tác Viên (CTV)</option>
                      <option value="DRIVER" ${u.role === 'DRIVER' ? 'selected' : ''}>Tài Xế Giao Hàng</option>
                      <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Quản Trị Viên (Admin)</option>
                    </select>
                  ` : `
                    <span class="badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'CTV' ? 'badge-success' : u.role === 'DRIVER' ? 'badge-primary' : 'badge-secondary'}">
                      ${u.role}
                    </span>
                  `}
                </td>
                <td>
                  ${isAdmin ? `
                    <select class="form-control select-user-region" style="font-size: 12px; padding: 2px 6px;">
                      ${regionOptionsHtml}
                    </select>
                  ` : `
                    <span class="badge badge-secondary">${u.region || 'Chưa phân công'}</span>
                  `}
                </td>
                <td>${ctvReqBadge}</td>
                <td style="font-size: 12px; color: var(--text-muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới'}</td>
                <td style="text-align: right;">
                  ${isAdmin ? `
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      ${u.ctvRequest === 'PENDING' ? `
                        <button class="btn btn-sm btn-success btn-approve-ctv" title="Duyệt người dùng này thành CTV">
                          ✅ Duyệt CTV
                        </button>
                      ` : ''}
                      <button class="btn btn-sm btn-primary btn-save-user-role" title="Lưu phân quyền & khu vực">
                        💾 Lưu
                      </button>
                    </div>
                  ` : `
                    <span style="font-size: 11px; color: var(--text-muted);">Không có quyền</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    const filterSelect = document.getElementById('user-filter-region');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedRegionFilter = e.target.value;
        this.renderUsersTable(state);
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
