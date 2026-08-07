const InventoryView = {
  editingProductId: null,

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
      this.addProductBtn.addEventListener('click', () => this.addProductModal.classList.add('active'));
    }
    if (this.closeAddProductBtn) {
      this.closeAddProductBtn.addEventListener('click', () => this.addProductModal.classList.remove('active'));
    }
    if (this.addProductForm) {
      this.addProductForm.addEventListener('submit', (e) => this.handleAddProduct(e));
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

  populateImportSelect() {
    if (!this.importProdSelect) return;
    const products = window.store.state.products;
    this.importProdSelect.innerHTML = products.map(p => `
      <option value="${p.id}">[${p.code}] ${p.name} (Hiện có: ${p.stock})</option>
    `).join('');
  },

  async handleAddProduct(e) {
    e.preventDefault();
    const productData = {
      code: document.getElementById('new-prod-code').value,
      name: document.getElementById('new-prod-name').value,
      costPrice: document.getElementById('new-prod-cost').value,
      sellingPrice: document.getElementById('new-prod-price').value,
      stock: document.getElementById('new-prod-stock').value,
      points: document.getElementById('new-prod-points').value
    };

    const res = await window.API.addProduct(productData);
    if (res.success) {
      alert('✅ ' + res.message);
      this.addProductModal.classList.remove('active');
      this.addProductForm.reset();
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  async handleImportStock(e) {
    e.preventDefault();
    const importData = {
      productId: document.getElementById('import-prod-select').value,
      qty: document.getElementById('import-qty').value,
      note: document.getElementById('import-note').value
    };

    const res = await window.API.importStock(importData);
    if (res.success) {
      alert('✅ ' + res.message);
      this.importStockModal.classList.remove('active');
      this.importStockForm.reset();
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  startInlineEdit(productId) {
    const user = window.store.state.currentUser;
    if (!user || user.role !== 'ADMIN') {
      alert('🔒 Bạn cần đăng nhập tài khoản Quản trị viên (Admin SĐT 0999999999) để chỉnh sửa Tên & Số lượng tồn kho!');
      if (window.authModal) window.authModal.openLogin();
      return;
    }
    this.editingProductId = productId;
    this.render(window.store.state);
  },

  cancelInlineEdit() {
    this.editingProductId = null;
    this.render(window.store.state);
  },

  async saveInlineEdit(productId) {
    const nameInput = document.getElementById(`edit-name-${productId}`);
    const stockInput = document.getElementById(`edit-stock-${productId}`);

    if (!nameInput || !stockInput) return;

    const newName = nameInput.value.trim();
    const newStock = parseInt(stockInput.value, 10);

    if (!newName) {
      alert('⚠️ Tên sản phẩm không được để trống!');
      return;
    }

    if (isNaN(newStock) || newStock < 0) {
      alert('⚠️ Số lượng tồn kho phải là số hợp lệ >= 0!');
      return;
    }

    const res = await window.API.updateProduct(productId, {
      name: newName,
      stock: newStock
    });

    if (res.success) {
      alert('🎉 ' + res.message);
      this.editingProductId = null;
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  render(state) {
    const { products, currentUser } = state;
    if (!this.tableBody) return;

    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    // Banner thông báo quyền cho Admin trong kho
    const noticeBanner = document.getElementById('inventory-admin-notice');
    if (noticeBanner) {
      noticeBanner.style.display = isAdmin ? 'block' : 'none';
    }

    if (products.length === 0) {
      this.tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">Chưa có sản phẩm nào</td></tr>';
      return;
    }

    this.tableBody.innerHTML = products.map(p => {
      const available = p.stock - p.reserved;
      const isEditing = this.editingProductId === p.id;

      if (isEditing) {
        return `
          <tr style="background: rgba(99, 102, 241, 0.12); border: 1px solid var(--accent-primary);">
            <td style="font-weight: 700; color: var(--accent-primary);">${p.code}</td>
            <td>
              <input type="text" id="edit-name-${p.id}" class="form-control" value="${p.name}" placeholder="Nhập tên sản phẩm" style="font-weight: 600; min-width: 180px;" onkeydown="if(event.key==='Enter') InventoryView.saveInlineEdit('${p.id}')">
            </td>
            <td>${p.costPrice.toLocaleString()} đ</td>
            <td style="font-weight: 600;">${p.sellingPrice.toLocaleString()} đ</td>
            <td>
              <input type="number" id="edit-stock-${p.id}" class="form-control" value="${p.stock}" min="0" style="font-weight: 700; width: 90px;" onkeydown="if(event.key==='Enter') InventoryView.saveInlineEdit('${p.id}')">
            </td>
            <td>
              <span class="badge badge-warning">⏳ ${p.reserved} ${p.unit}</span>
            </td>
            <td>
              <span class="badge ${available > 0 ? 'badge-success' : 'badge-danger'}">
                ${available > 0 ? '✅' : '⚠️'} ${available} ${p.unit}
              </span>
            </td>
            <td style="color: var(--success); font-weight: 700;">+${p.points} pts</td>
            <td>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-success btn-sm" onclick="InventoryView.saveInlineEdit('${p.id}')" title="Lưu thay đổi">💾 Lưu</button>
                <button class="btn btn-secondary btn-sm" onclick="InventoryView.cancelInlineEdit()" title="Hủy bỏ">✕ Hủy</button>
              </div>
            </td>
          </tr>
        `;
      }

      return `
        <tr>
          <td style="font-weight: 700; color: var(--accent-primary);">${p.code}</td>
          <td style="font-weight: 600;">${p.name}</td>
          <td>${p.costPrice.toLocaleString()} đ</td>
          <td style="font-weight: 600;">${p.sellingPrice.toLocaleString()} đ</td>
          <td style="font-weight: 700; color: var(--accent-secondary);">${p.stock} ${p.unit}</td>
          <td>
            <span class="badge badge-warning">⏳ ${p.reserved} ${p.unit}</span>
          </td>
          <td>
            <span class="badge ${available > 0 ? 'badge-success' : 'badge-danger'}">
              ${available > 0 ? '✅' : '⚠️'} ${available} ${p.unit}
            </span>
          </td>
          <td style="color: var(--success); font-weight: 700;">+${p.points} pts</td>
          <td>
            <button class="btn btn-secondary btn-sm" title="${isAdmin ? 'Chỉnh sửa tên & số lượng trực tiếp' : 'Yêu cầu quyền Admin để sửa'}" onclick="InventoryView.startInlineEdit('${p.id}')">
              ✏️ Sửa Tên / Số lượng
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.InventoryView = InventoryView;
