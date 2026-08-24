const InventoryView = {
  init() {
    this.tableBody = document.getElementById('inventory-table-body');
    this.addProductBtn = document.getElementById('add-product-modal-btn');
    this.addProductModal = document.getElementById('add-product-modal');
    this.closeAddProductBtn = document.getElementById('close-add-product-modal-btn');
    this.addProductForm = document.getElementById('add-product-form');

    this.importStockBtn = document.getElementById('import-stock-modal-btn');
    this.importStockModal = document.getElementById('import-stock-modal');
    this.closeImportStockBtn = document.getElementById('close-import-stock-modal-btn');
    this.importStockForm = document.getElementById('import-stock-form');
    this.importProdSelect = document.getElementById('import-prod-select');

    if (this.addProductBtn) {
      this.addProductBtn.addEventListener('click', () => this.openAddModal());
    }
    if (this.closeAddProductBtn) {
      this.closeAddProductBtn.addEventListener('click', () => this.closeAddModal());
    }
    if (this.addProductForm) {
      this.addProductForm.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
    }

    if (this.importStockBtn) {
      this.importStockBtn.addEventListener('click', () => {
        this.populateImportSelect();
        this.importStockModal.classList.add('active');
      });
    }
    if (this.closeImportStockBtn) {
      this.closeImportStockBtn.addEventListener('click', () => this.importStockModal.classList.remove('active'));
    }
    if (this.importStockForm) {
      this.importStockForm.addEventListener('submit', (e) => this.handleImportStock(e));
    }
  },

  openAddModal() {
    if (this.addProductForm) {
      this.addProductForm.reset();
    }
    const editIdEl = document.getElementById('prod-edit-id');
    const titleEl = document.getElementById('prod-modal-title');
    const submitBtnEl = document.getElementById('prod-modal-submit-btn');

    if (editIdEl) editIdEl.value = '';
    if (titleEl) titleEl.textContent = '➕ Thêm Sản Phẩm Mới';
    if (submitBtnEl) submitBtnEl.textContent = '💾 Thêm Sản Phẩm Mới';

    if (this.addProductModal) {
      this.addProductModal.classList.add('active');
    }
  },

  closeAddModal() {
    if (this.addProductModal) {
      this.addProductModal.classList.remove('active');
    }
    if (this.addProductForm) {
      this.addProductForm.reset();
    }
  },

  openEditModal(productId) {
    const user = window.store.state.currentUser;
    if (!user || user.role !== 'ADMIN') {
      alert('🔒 Bạn cần đăng nhập tài khoản Quản trị viên (Admin) để chỉnh sửa sản phẩm!');
      if (window.authModal) window.authModal.openLogin();
      return;
    }

    const products = window.store.state.products || [];
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      alert('❌ Không tìm thấy thông tin sản phẩm!');
      return;
    }

    const editIdEl = document.getElementById('prod-edit-id');
    const codeEl = document.getElementById('new-prod-code');
    const nameEl = document.getElementById('new-prod-name');
    const categoryEl = document.getElementById('new-prod-category');
    const unitEl = document.getElementById('new-prod-unit');
    const costEl = document.getElementById('new-prod-cost');
    const origPriceEl = document.getElementById('new-prod-original-price');
    const promoPriceEl = document.getElementById('new-prod-promo-price');
    const stockEl = document.getElementById('new-prod-stock');
    const pointsEl = document.getElementById('new-prod-points');
    const imageEl = document.getElementById('new-prod-image');
    const titleEl = document.getElementById('prod-modal-title');
    const submitBtnEl = document.getElementById('prod-modal-submit-btn');

    if (editIdEl) editIdEl.value = prod.id;
    if (codeEl) codeEl.value = prod.code || '';
    if (nameEl) nameEl.value = prod.name || '';
    if (categoryEl) categoryEl.value = prod.category || 'Chung';
    if (unitEl) unitEl.value = prod.unit || 'Cái';
    if (costEl) costEl.value = prod.costPrice || 0;
    if (origPriceEl) origPriceEl.value = prod.originalPrice || prod.sellingPrice || 0;
    if (promoPriceEl) promoPriceEl.value = prod.promoPrice || 0;
    if (stockEl) stockEl.value = prod.stock || 0;
    if (pointsEl) pointsEl.value = prod.points || 0;
    if (imageEl) imageEl.value = prod.imageUrl || '';

    if (titleEl) titleEl.textContent = `✏️ Chỉnh Sửa Sản Phẩm: [${prod.code}] ${prod.name}`;
    if (submitBtnEl) submitBtnEl.textContent = '💾 Lưu Tất Cả Thay Đổi';

    if (this.addProductModal) {
      this.addProductModal.classList.add('active');
    }
  },

  populateImportSelect() {
    if (!this.importProdSelect) return;
    const products = window.store.state.products || [];
    this.importProdSelect.innerHTML = products.map(p => `
      <option value="${p.id}">[${p.code}] ${p.name} (Hiện có: ${p.stock} ${p.unit || 'Cái'})</option>
    `).join('');
  },

  async handleProductFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('prod-edit-id')?.value;
    const code = document.getElementById('new-prod-code')?.value;
    const name = document.getElementById('new-prod-name')?.value;
    const category = document.getElementById('new-prod-category')?.value;
    const unit = document.getElementById('new-prod-unit')?.value;
    const costPrice = document.getElementById('new-prod-cost')?.value;
    const originalPrice = document.getElementById('new-prod-original-price')?.value;
    const promoPrice = document.getElementById('new-prod-promo-price')?.value;
    const stock = document.getElementById('new-prod-stock')?.value;
    const points = document.getElementById('new-prod-points')?.value;
    const imageUrl = document.getElementById('new-prod-image')?.value;

    const productData = {
      code,
      name,
      category,
      unit,
      costPrice: Number(costPrice) || 0,
      originalPrice: Number(originalPrice) || 0,
      promoPrice: Number(promoPrice) || 0,
      stock: Number(stock) || 0,
      points: Number(points) || 0,
      imageUrl: imageUrl ? imageUrl.trim() : ''
    };

    let res;
    if (editId && editId.trim() !== '') {
      res = await window.API.updateProduct(editId, productData);
    } else {
      res = await window.API.addProduct(productData);
    }

    if (res && res.success) {
      alert('🎉 ' + (res.message || 'Lưu thông tin sản phẩm thành công!'));
      this.closeAddModal();
      window.store.fetchAll();
    } else {
      alert('❌ ' + (res?.message || 'Có lỗi xảy ra khi lưu sản phẩm'));
    }
  },

  async handleImportStock(e) {
    e.preventDefault();
    const importData = {
      productId: document.getElementById('import-prod-select')?.value,
      qty: document.getElementById('import-qty')?.value,
      note: document.getElementById('import-note')?.value
    };

    const res = await window.API.importStock(importData);
    if (res && res.success) {
      alert('✅ ' + res.message);
      this.importStockModal?.classList.remove('active');
      this.importStockForm?.reset();
      window.store.fetchAll();
    } else {
      alert('❌ ' + (res?.message || 'Có lỗi xảy ra khi nhập kho'));
    }
  },

  render(state) {
    this.tableBody = document.getElementById('inventory-table-body');
    const { products, currentUser } = state;
    if (!this.tableBody) return;

    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    // Banner thông báo quyền cho Admin trong kho
    const noticeBanner = document.getElementById('inventory-admin-notice');
    if (noticeBanner) {
      noticeBanner.style.display = isAdmin ? 'block' : 'none';
    }

    if (!products || products.length === 0) {
      this.tableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: var(--text-muted); padding: 30px;">Chưa có sản phẩm nào trong kho</td></tr>';
      return;
    }

    const standardPointVal = window.store?.state?.commissionSettings?.standardPointValue || 500;

    this.tableBody.innerHTML = products.map(p => {
      const available = p.stock - (p.reserved || 0);
      const origPrice = p.originalPrice || p.sellingPrice || 0;
      const promoPrice = p.promoPrice || 0;
      const effSelling = p.sellingPrice || (promoPrice > 0 ? promoPrice : origPrice);
      const commVnd = (p.points || 0) * standardPointVal;

      const imgCell = p.imageUrl
        ? `<img src="${p.imageUrl}" alt="${p.name}" class="product-table-thumb" onerror="this.outerHTML='<div class=\\'product-table-thumb-empty\\'>🌿</div>';">`
        : `<div class="product-table-thumb-empty">🌿</div>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--accent-primary);">${p.code || 'N/A'}</td>
          <td>${imgCell}</td>
          <td style="font-weight: 600; min-width: 160px;">${p.name}</td>
          <td><span class="badge badge-secondary" style="font-size: 11px;">${p.category || 'Chung'}</span></td>
          <td>${(p.costPrice || 0).toLocaleString()} đ</td>
          <td style="font-weight: 600; color: var(--text-primary);">${origPrice.toLocaleString()} đ</td>
          <td>
            ${promoPrice > 0 
              ? `<span style="color: var(--success); font-weight: 800;">🔥 ${promoPrice.toLocaleString()} đ</span>`
              : `<span style="color: var(--text-muted); font-size: 12px;">Chưa cài</span>`
            }
          </td>
          <td style="font-weight: 800; color: var(--accent-primary); font-size: 15px;">${effSelling.toLocaleString()} đ</td>
          <td style="font-weight: 700; color: var(--accent-secondary);">${p.stock || 0} ${p.unit || 'Cái'}</td>
          <td>
            <span class="badge badge-warning">⏳ ${p.reserved || 0} ${p.unit || 'Cái'}</span>
          </td>
          <td>
            <span class="badge ${available > 0 ? 'badge-success' : 'badge-danger'}">
              ${available > 0 ? '✅' : '⚠️'} ${available} ${p.unit || 'Cái'}
            </span>
          </td>
          <td style="color: var(--success); font-weight: 700;">+${commVnd.toLocaleString()} đ <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">(${p.points || 0} pts)</span></td>
          <td>
            <button class="btn btn-primary btn-sm" title="${isAdmin ? 'Chỉnh sửa tất cả thông tin sản phẩm này' : 'Đăng nhập Admin để chỉnh sửa'}" onclick="InventoryView.openEditModal('${p.id}')">
              ✏️ Sửa Tất Cả
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.InventoryView = InventoryView;
