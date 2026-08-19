const CTVView = {
  autoAssignedCtvId: null,

  init() {
    this.ctvSelect = document.getElementById('order-ctv-select');
    this.autoRegionSelect = document.getElementById('order-auto-region-select');
    this.driverSelect = document.getElementById('order-driver-select');
    this.itemsContainer = document.getElementById('order-items-container');
    this.addItemBtn = document.getElementById('add-order-item-btn');
    this.totalPreview = document.getElementById('order-total-preview');
    this.pointsPreview = document.getElementById('order-points-preview');
    this.form = document.getElementById('create-order-form');
    this.ordersContainer = document.getElementById('ctv-orders-container');

    // Price list elements in Order View
    this.priceSearchInput = document.getElementById('ctv-price-search');
    this.priceCategorySelect = document.getElementById('ctv-price-category');
    this.priceGrid = document.getElementById('ctv-pricelist-grid');

    if (this.addItemBtn) {
      this.addItemBtn.addEventListener('click', () => this.addProductRow());
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleCreateOrder(e));
    }

    if (this.autoRegionSelect) {
      this.autoRegionSelect.addEventListener('change', () => this.updateAdminAutoCTV());
    }

    // Radio assign mode switchers
    const modeRadios = document.querySelectorAll('input[name="admin-ctv-assign-mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const state = window.store ? window.store.state : null;
        if (state) this.render(state);
      });
    });

    if (this.priceSearchInput) {
      this.priceSearchInput.addEventListener('input', () => {
        const state = window.store ? window.store.state : null;
        if (state && state.products) this.renderPriceList(state.products);
      });
    }

    if (this.priceCategorySelect) {
      this.priceCategorySelect.addEventListener('change', () => {
        const state = window.store ? window.store.state : null;
        if (state && state.products) this.renderPriceList(state.products);
      });
    }
  },

  updateAdminAutoCTV() {
    const state = window.store ? window.store.state : null;
    if (!state) return;
    const { ctvs, regions } = state;

    if (this.autoRegionSelect) {
      if (this.autoRegionSelect.children.length === 0 && regions && regions.length > 0) {
        this.autoRegionSelect.innerHTML = regions.map(r => `
          <option value="${r}">📍 ${r}</option>
        `).join('');
      }
    }

    const selectedRegion = this.autoRegionSelect ? this.autoRegionSelect.value : (regions && regions[0] ? regions[0] : 'Hà Nội');

    // Filter CTVs in selected region and sort by highest points / sales
    const regionCtvs = (ctvs || []).filter(c => c.region === selectedRegion);
    regionCtvs.sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) {
        return (b.points || 0) - (a.points || 0);
      }
      return (b.totalSales || 0) - (a.totalSales || 0);
    });

    const topCtv = regionCtvs[0];

    const regionNameEl = document.getElementById('auto-region-name');
    const topNameEl = document.getElementById('auto-top-ctv-name');
    const topPhoneEl = document.getElementById('auto-top-ctv-phone');
    const topPointsEl = document.getElementById('auto-top-ctv-points');

    if (topCtv) {
      this.autoAssignedCtvId = topCtv.id;
      if (regionNameEl) regionNameEl.textContent = selectedRegion;
      if (topNameEl) topNameEl.textContent = topCtv.name;
      if (topPhoneEl) topPhoneEl.textContent = topCtv.phone;
      if (topPointsEl) topPointsEl.textContent = `+${topCtv.points || 0} pts`;
    } else {
      this.autoAssignedCtvId = null;
      if (regionNameEl) regionNameEl.textContent = selectedRegion;
      if (topNameEl) topNameEl.textContent = 'Chưa có CTV đăng ký';
      if (topPhoneEl) topPhoneEl.textContent = '-';
      if (topPointsEl) topPointsEl.textContent = '0 pts';
    }
  },

  addProductRow(productId = null) {
    if (!this.itemsContainer) return null;
    const products = (window.store && window.store.state) ? window.store.state.products : [];

    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';

    row.innerHTML = `
      <select class="form-select item-prod-select" style="flex: 2;" required>
        <option value="">-- Chọn sản phẩm --</option>
        ${products.map(p => {
          const available = p.stock - p.reserved;
          const selected = String(p.id) === String(productId) ? 'selected' : '';
          return `<option value="${p.id}" ${selected} data-price="${p.sellingPrice}" data-points="${p.points}" data-available="${available}">
            ${p.name} (${p.sellingPrice.toLocaleString()}đ)
          </option>`;
        }).join('')}
      </select>
      <input type="number" class="form-control item-qty-input" style="flex: 1; min-width: 70px;" value="1" min="1" required placeholder="SL">
      <button type="button" class="btn btn-danger btn-icon remove-row-btn">✕</button>
    `;

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
      row.remove();
      this.calculatePreviews();
    });

    row.querySelector('.item-prod-select').addEventListener('change', () => this.calculatePreviews());
    row.querySelector('.item-qty-input').addEventListener('input', () => this.calculatePreviews());

    this.itemsContainer.appendChild(row);
    this.calculatePreviews();
    return row;
  },

  addProductToOrder(productId, productName) {
    if (!this.itemsContainer) return;

    const rows = this.itemsContainer.querySelectorAll('.order-item-row');
    let targetRow = null;

    rows.forEach(r => {
      const sel = r.querySelector('.item-prod-select');
      if (sel && !sel.value) {
        targetRow = r;
      }
    });

    if (targetRow) {
      const sel = targetRow.querySelector('.item-prod-select');
      sel.value = productId;
      this.calculatePreviews();
    } else {
      this.addProductRow(productId);
    }

    if (typeof showToast === 'function') {
      showToast(`✨ Đã chọn "${productName}" vào đơn hàng!`);
    }
  },

  renderPriceList(products) {
    if (!this.priceGrid) return;
    products = products || [];

    if (this.priceCategorySelect && this.priceCategorySelect.children.length <= 1) {
      const categories = Array.from(new Set(products.map(p => p.category || 'Chung')));
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = `📁 ${cat}`;
        this.priceCategorySelect.appendChild(opt);
      });
    }

    const searchTerm = this.priceSearchInput ? this.priceSearchInput.value.toLowerCase().trim() : '';
    const selectedCat = this.priceCategorySelect ? this.priceCategorySelect.value : 'ALL';

    const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm) || (p.code && p.code.toLowerCase().includes(searchTerm));
      const matchCat = selectedCat === 'ALL' || p.category === selectedCat;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      this.priceGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <p style="font-size: 14px; font-weight: 600; margin: 0;">Không tìm thấy sản phẩm phù hợp</p>
        </div>
      `;
      return;
    }

    this.priceGrid.innerHTML = filtered.map(p => {
      const available = p.stock - p.reserved;
      const isAvailable = available > 0;
      const stockBadge = isAvailable
        ? `<span class="badge badge-success" style="font-size: 10px; padding: 2px 6px;">Kho: ${available}</span>`
        : `<span class="badge badge-danger" style="font-size: 10px; padding: 2px 6px;">Hết hàng</span>`;

      const imgHtml = p.imageUrl 
        ? `<img src="${p.imageUrl}" alt="${p.name}" class="product-card-img" onerror="this.outerHTML='<div class=\\'product-img-fallback\\'>📦</div>';">`
        : `<div class="product-img-fallback">🌿</div>`;

      const origPrice = p.originalPrice || 0;
      const hasDiscount = origPrice > (p.sellingPrice || 0);

      return `
        <div class="product-card">
          <div>
            <div class="product-image-wrap">
              <div class="product-badge-overlay">
                <span style="font-size: 10px; font-weight: 700; color: var(--accent-primary); background: rgba(99, 102, 241, 0.25); backdrop-filter: blur(4px); padding: 2px 8px; border-radius: 6px;">
                  ${p.code || 'SP'}
                </span>
              </div>
              <div class="product-stock-overlay">
                ${stockBadge}
              </div>
              ${imgHtml}
            </div>

            <div style="font-size: 12px; font-weight: 600; color: var(--accent-secondary); margin-bottom: 2px;">
              📁 ${p.category || 'Chung'}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.3; height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${p.name}
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
              <div>
                ${hasDiscount ? `<div style="font-size: 11px; color: var(--text-muted); text-decoration: line-through;">${origPrice.toLocaleString()} đ</div>` : ''}
                <div style="font-size: 16px; font-weight: 800; color: var(--success); font-family: 'Outfit', sans-serif;">
                  ${(p.sellingPrice || 0).toLocaleString()} đ
                </div>
              </div>
              <span class="badge badge-info" style="font-size: 11px; font-weight: 700;">
                +${p.points || 0} pts
              </span>
            </div>
            <button type="button" class="btn btn-sm btn-primary btn-add-ctv-order" data-id="${p.id}" data-name="${p.name}" style="width: 100%; font-size: 12px; padding: 8px; justify-content: center; font-weight: 700;">
              ➕ Chọn vào đơn
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.priceGrid.querySelectorAll('.btn-add-ctv-order').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addProductToOrder(btn.dataset.id, btn.dataset.name);
      });
    });
  },

  calculatePreviews() {
    let total = 0;
    let points = 0;

    const rows = document.querySelectorAll('.order-item-row');
    rows.forEach(row => {
      const select = row.querySelector('.item-prod-select');
      const qtyInput = row.querySelector('.item-qty-input');
      const selectedOpt = select.options[select.selectedIndex];

      if (selectedOpt && selectedOpt.value) {
        const price = Number(selectedOpt.dataset.price) || 0;
        const pts = Number(selectedOpt.dataset.points) || 0;
        const qty = Number(qtyInput.value) || 0;

        total += price * qty;
        points += pts * qty;
      }
    });

    if (this.totalPreview) this.totalPreview.textContent = total.toLocaleString() + ' đ';
    if (this.pointsPreview) this.pointsPreview.textContent = `+${points} pts`;
  },

  async handleCreateOrder(e) {
    e.preventDefault();

    const currentUser = window.store ? window.store.state.currentUser : null;
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    let ctvId = null;

    if (isAdmin) {
      const modeRadio = document.querySelector('input[name="admin-ctv-assign-mode"]:checked');
      const mode = modeRadio ? modeRadio.value : 'AUTO';

      if (mode === 'AUTO') {
        ctvId = this.autoAssignedCtvId;
      } else {
        ctvId = this.ctvSelect ? this.ctvSelect.value : null;
      }
    } else {
      ctvId = this.ctvSelect ? this.ctvSelect.value : null;
    }

    if (!ctvId) {
      alert('⚠️ Không tìm thấy CTV phù hợp! Vui lòng chọn khu vực khác hoặc chọn thủ công CTV.');
      return;
    }

    const driverId = this.driverSelect ? this.driverSelect.value : null;
    const customerName = document.getElementById('order-customer-name').value;
    const customerPhone = document.getElementById('order-customer-phone').value;
    const address = document.getElementById('order-customer-address').value;

    const itemRows = document.querySelectorAll('.order-item-row');
    const items = [];

    itemRows.forEach(row => {
      const prodId = row.querySelector('.item-prod-select').value;
      const qty = row.querySelector('.item-qty-input').value;
      if (prodId && qty) {
        items.push({ productId: prodId, qty: Number(qty) });
      }
    });

    if (items.length === 0) {
      alert('⚠️ Vui lòng chọn ít nhất 1 sản phẩm');
      return;
    }

    const res = await window.API.createOrder({
      ctvId,
      driverId,
      customerName,
      customerPhone,
      address,
      items
    });

    if (res.success) {
      alert('🎉 ' + res.message);
      this.form.reset();
      this.itemsContainer.innerHTML = '';
      this.addProductRow();
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  render(state) {
    const { ctvs, drivers, orders, currentUser, products } = state;

    // 1. Render Product Price Quotes catalog inside CTV view
    this.renderPriceList(products);

    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    // Toggle Admin Mode Containers vs CTV Mode Containers
    const adminModeContainer = document.getElementById('admin-order-mode-container');
    const autoWrapper = document.getElementById('admin-auto-region-wrapper');
    const manualWrapper = document.getElementById('admin-manual-ctv-wrapper');

    if (isAdmin) {
      if (adminModeContainer) adminModeContainer.style.display = 'block';

      const modeRadio = document.querySelector('input[name="admin-ctv-assign-mode"]:checked');
      const mode = modeRadio ? modeRadio.value : 'AUTO';

      if (mode === 'AUTO') {
        if (autoWrapper) autoWrapper.style.display = 'block';
        if (manualWrapper) manualWrapper.style.display = 'none';
        this.updateAdminAutoCTV();
      } else {
        if (autoWrapper) autoWrapper.style.display = 'none';
        if (manualWrapper) manualWrapper.style.display = 'block';
      }
    } else {
      if (adminModeContainer) adminModeContainer.style.display = 'none';
      if (autoWrapper) autoWrapper.style.display = 'none';
      if (manualWrapper) manualWrapper.style.display = 'block';
    }

    // Populate Manual CTV Select dropdown
    if (this.ctvSelect) {
      const currentCtvsHTML = ctvs.map(c => `
        <option value="${c.id}">💼 ${c.name} (${c.phone}) - Area: ${c.region}</option>
      `).join('');
      if (this.ctvSelect.innerHTML !== currentCtvsHTML) {
        this.ctvSelect.innerHTML = currentCtvsHTML;
      }

      if (currentUser && currentUser.role === 'CTV') {
        const matched = ctvs.find(c => c.phone === currentUser.phone || c.id === currentUser.id);
        if (matched) {
          this.ctvSelect.value = matched.id;
        }
        this.ctvSelect.disabled = true;
      } else {
        this.ctvSelect.disabled = false;
      }
    }

    if (this.driverSelect && this.driverSelect.children.length === 0) {
      this.driverSelect.innerHTML = drivers.map(d => `
        <option value="${d.id}">🚚 ${d.name}</option>
      `).join('');
    }

    if (this.itemsContainer && this.itemsContainer.children.length === 0) {
      this.addProductRow();
    }

    // Render Order history table
    if (this.ordersContainer) {
      if (orders.length === 0) {
        this.ordersContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">Chưa có đơn hàng nào</div>';
        return;
      }

      this.ordersContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>CTV Khởi Tạo</th>
              <th>Khách Hàng</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái Đơn Hàng</th>
              <th>Thời Gian Giao Dự Kiến</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              let badge = '<span class="badge badge-warning">⏳ Chờ Duyệt (Quản trị viên)</span>';
              if (o.status === 'DELIVERED') {
                badge = '<span class="badge badge-success">🎉 Đã Giao Thành Công</span>';
              } else if (o.status === 'CANCELLED' || o.approvalStatus === 'REJECTED') {
                badge = '<span class="badge badge-danger">❌ Đã Hủy / Từ Chối</span>';
              } else if (o.approvalStatus === 'APPROVED') {
                badge = '<span class="badge badge-info">✅ Đã Duyệt (Đang Giao)</span>';
              }

              const estimatedTimeText = o.estimatedDeliveryTime 
                ? `<span style="font-weight: 600; color: var(--accent-primary);">🕒 ${o.estimatedDeliveryTime}</span>`
                : `<span style="font-size: 12px; color: var(--text-muted);">Chưa cập nhật</span>`;

              return `
                <tr>
                  <td style="font-weight: 700; color: var(--accent-primary);">${o.id}</td>
                  <td style="font-weight: 600;">${o.ctvName} <span style="font-size: 11px; color: var(--text-muted);">(${o.ctvRegion})</span></td>
                  <td>${o.customerName}<br><span style="font-size: 11px; color: var(--text-secondary);">${o.customerPhone}</span></td>
                  <td style="font-weight: 600;">${o.totalAmount.toLocaleString()} đ</td>
                  <td>${badge}</td>
                  <td>${estimatedTimeText}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }
};

window.CTVView = CTVView;
