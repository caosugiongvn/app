const DriverView = {
  selectedStatusFilter: 'ALL',
  currentDeliverOrder: null,

  init() {
    this.ordersGrid = document.getElementById('driver-orders-grid');
    this.filterSelect = document.getElementById('driver-filter-select');
    this.driverSummaryContainer = document.getElementById('driver-summary-banner');

    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', () => {
        this.render(window.store.state);
      });
    }

    this.initModalEvents();
  },

  initModalEvents() {
    // Deliver Modal elements
    const deliverModal = document.getElementById('deliver-confirm-modal');
    const deliverForm = document.getElementById('deliver-confirm-form');
    const closeDeliverBtn = document.getElementById('close-deliver-modal-btn');
    const cancelDeliverBtn = document.getElementById('btn-cancel-deliver-modal');
    const cashInput = document.getElementById('deliver-cash-input');
    const transferInput = document.getElementById('deliver-transfer-input');

    if (closeDeliverBtn) closeDeliverBtn.addEventListener('click', () => this.closeDeliverModal());
    if (cancelDeliverBtn) cancelDeliverBtn.addEventListener('click', () => this.closeDeliverModal());

    const updateDebtCalc = () => {
      if (!this.currentDeliverOrder) return;
      const total = Number(this.currentDeliverOrder.totalAmount || 0);
      const cash = Number(cashInput?.value || 0);
      const transfer = Number(transferInput?.value || 0);
      const debt = Math.max(0, total - (cash + transfer));

      const debtCalcEl = document.getElementById('deliver-modal-debt-calc');
      if (debtCalcEl) {
        debtCalcEl.textContent = debt.toLocaleString() + ' đ';
        if (debt > 0) {
          debtCalcEl.style.color = 'var(--danger)';
        } else {
          debtCalcEl.style.color = 'var(--success)';
        }
      }
    };

    if (cashInput) cashInput.addEventListener('input', updateDebtCalc);
    if (transferInput) transferInput.addEventListener('input', updateDebtCalc);

    if (deliverForm) {
      deliverForm.addEventListener('submit', (e) => this.handleDeliverSubmit(e));
    }

    // Cancel Modal elements
    const cancelModal = document.getElementById('cancel-confirm-modal');
    const cancelForm = document.getElementById('cancel-confirm-form');
    const closeCancelBtn = document.getElementById('close-cancel-modal-btn');
    const cancelCancelBtn = document.getElementById('btn-cancel-cancel-modal');
    const reasonSelect = document.getElementById('cancel-reason-select');
    const customReasonInput = document.getElementById('cancel-reason-custom');

    if (closeCancelBtn) closeCancelBtn.addEventListener('click', () => this.closeCancelModal());
    if (cancelCancelBtn) cancelCancelBtn.addEventListener('click', () => this.closeCancelModal());

    if (reasonSelect) {
      reasonSelect.addEventListener('change', () => {
        if (reasonSelect.value === 'OTHER') {
          if (customReasonInput) customReasonInput.style.display = 'block';
        } else {
          if (customReasonInput) customReasonInput.style.display = 'none';
        }
      });
    }

    if (cancelForm) {
      cancelForm.addEventListener('submit', (e) => this.handleCancelSubmit(e));
    }
  },

  openDeliverModal(orderId) {
    const orders = window.store.state.orders || [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    this.currentDeliverOrder = order;

    const modal = document.getElementById('deliver-confirm-modal');
    const orderIdInput = document.getElementById('deliver-order-id');
    const modalOrderId = document.getElementById('deliver-modal-order-id');
    const modalCustomer = document.getElementById('deliver-modal-customer');
    const modalTotalAmount = document.getElementById('deliver-modal-total-amount');
    const cashInput = document.getElementById('deliver-cash-input');
    const transferInput = document.getElementById('deliver-transfer-input');
    const noteInput = document.getElementById('deliver-note-input');
    const debtCalcEl = document.getElementById('deliver-modal-debt-calc');

    if (orderIdInput) orderIdInput.value = order.id;
    if (modalOrderId) modalOrderId.textContent = order.id;
    if (modalCustomer) modalCustomer.textContent = `${order.customerName} (${order.customerPhone})`;
    if (modalTotalAmount) modalTotalAmount.textContent = (order.totalAmount || 0).toLocaleString() + ' đ';

    if (cashInput) cashInput.value = order.totalAmount || 0;
    if (transferInput) transferInput.value = 0;
    if (noteInput) noteInput.value = '';
    if (debtCalcEl) {
      debtCalcEl.textContent = '0 đ';
      debtCalcEl.style.color = 'var(--success)';
    }

    modal?.classList.add('active');
  },

  closeDeliverModal() {
    const modal = document.getElementById('deliver-confirm-modal');
    modal?.classList.remove('active');
    this.currentDeliverOrder = null;
  },

  async handleDeliverSubmit(e) {
    e.preventDefault();
    if (!this.currentDeliverOrder) return;

    const orderId = document.getElementById('deliver-order-id')?.value;
    const cashAmount = Number(document.getElementById('deliver-cash-input')?.value || 0);
    const transferAmount = Number(document.getElementById('deliver-transfer-input')?.value || 0);
    const paymentNote = document.getElementById('deliver-note-input')?.value || '';

    const totalAmount = Number(this.currentDeliverOrder.totalAmount || 0);
    const debtAmount = Math.max(0, totalAmount - (cashAmount + transferAmount));

    const paymentData = {
      cashAmount,
      transferAmount,
      debtAmount,
      paymentNote
    };

    const res = await window.API.deliverOrder(orderId, paymentData);
    if (res.success) {
      alert('🎉 ' + res.message);
      this.closeDeliverModal();
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  openCancelModal(orderId) {
    const orders = window.store.state.orders || [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('cancel-confirm-modal');
    const orderIdInput = document.getElementById('cancel-order-id');
    const modalOrderId = document.getElementById('cancel-modal-order-id');
    const modalCustomer = document.getElementById('cancel-modal-customer');
    const reasonSelect = document.getElementById('cancel-reason-select');
    const customReasonInput = document.getElementById('cancel-reason-custom');

    if (orderIdInput) orderIdInput.value = order.id;
    if (modalOrderId) modalOrderId.textContent = order.id;
    if (modalCustomer) modalCustomer.textContent = `${order.customerName} (${order.customerPhone})`;
    if (reasonSelect) reasonSelect.selectedIndex = 0;
    if (customReasonInput) {
      customReasonInput.value = '';
      customReasonInput.style.display = 'none';
    }

    modal?.classList.add('active');
  },

  closeCancelModal() {
    const modal = document.getElementById('cancel-confirm-modal');
    modal?.classList.remove('active');
  },

  async handleCancelSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById('cancel-order-id')?.value;
    const reasonSelect = document.getElementById('cancel-reason-select');
    const customReasonInput = document.getElementById('cancel-reason-custom');

    let reason = reasonSelect?.value || 'Giao hàng thất bại';
    if (reason === 'OTHER') {
      reason = customReasonInput?.value.trim() || 'Hủy đơn hàng';
    }

    const res = await window.API.cancelOrder(orderId, reason);
    if (res.success) {
      alert('⚠️ ' + res.message);
      this.closeCancelModal();
      window.store.fetchAll();
    } else {
      alert('❌ ' + res.message);
    }
  },

  setStatusFilter(status) {
    this.selectedStatusFilter = status;
    this.render(window.store.state);
  },

  selectDriver(driverId) {
    const { currentUser } = window.store.state;
    // Driver user is locked to their own orders only
    if (currentUser && currentUser.role === 'DRIVER') {
      return;
    }
    if (this.filterSelect) {
      this.filterSelect.value = driverId;
    }
    this.render(window.store.state);
  },

  render(state) {
    this.container = document.getElementById('driver-orders-container');
    const { orders, currentUser } = state;
    if (!this.ordersGrid) return;

    const isUserDriver = currentUser && currentUser.role === 'DRIVER';
    let myDriver = null;

    // Dynamically update section Header Title & Subtitle
    const titleEl = document.getElementById('driver-view-title');
    const subtitleEl = document.getElementById('driver-view-subtitle');

    if (isUserDriver) {
      myDriver = (drivers || []).find(d => {
        if (!d) return false;
        if (d.phone && currentUser.phone && d.phone.trim() === currentUser.phone.trim()) return true;
        if (d.name && currentUser.name && d.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
        return false;
      });

      if (titleEl) titleEl.textContent = `🚚 Đơn Hàng Giao Của Bạn: ${currentUser.name}`;
      if (subtitleEl) subtitleEl.textContent = `Danh sách đơn hàng được phân công cho riêng bạn. Vui lòng giao hàng và cập nhật tiền thu hộ COD.`;

      // Hide driver filter select dropdown completely for Driver accounts
      if (this.filterSelect) {
        this.filterSelect.style.display = 'none';
      }
    } else {
      if (titleEl) titleEl.textContent = `🚚 Quản Lý Giao Hàng Của Các Tài Xế`;
      if (subtitleEl) subtitleEl.textContent = `Chọn tài xế để xem danh sách và theo dõi trạng thái giao hàng của tài xế đó`;

      // Show driver filter select dropdown for Admin/Management
      if (this.filterSelect) {
        this.filterSelect.style.display = 'inline-block';
      }

      // Populate driver select dropdown if empty
      if (this.filterSelect && this.filterSelect.children.length <= 1) {
        this.filterSelect.innerHTML = '<option value="ALL">🌐 Tất cả tài xế</option>' + (drivers || []).map(d => `
          <option value="${d.id}">🚚 ${d.name}</option>
        `).join('');
      }
    }

    // Determine selected driver ID based on role permissions
    let selectedDriverId = 'ALL';
    if (isUserDriver) {
      selectedDriverId = myDriver ? myDriver.id : 'NONE';
    } else {
      selectedDriverId = this.filterSelect ? this.filterSelect.value : 'ALL';
    }

    // Filter orders strictly by driver
    let driverOrders = orders || [];
    if (isUserDriver) {
      const driverNameLower = (currentUser.name || '').trim().toLowerCase();
      const myDriverId = myDriver ? myDriver.id : null;

      driverOrders = (orders || []).filter(o => {
        if (!o) return false;
        if (!o.driverId && !o.driverName) return false;
        if (o.driverName === 'Chưa phân công') return false;

        // Match by Driver ID
        if (myDriverId && o.driverId === myDriverId) return true;

        // Match by exact Driver Name
        if (o.driverName && o.driverName.trim().toLowerCase() === driverNameLower) return true;

        return false;
      });
    } else if (selectedDriverId !== 'ALL') {
      driverOrders = (orders || []).filter(o => o.driverId === selectedDriverId);
    }

    // Selected driver details
    const activeDriver = isUserDriver ? myDriver : (drivers || []).find(d => d.id === selectedDriverId);

    // Calculate status breakdown stats for selected driver
    const pendingOrders = driverOrders.filter(o => o.status === 'PENDING_DELIVERY');
    const deliveredOrders = driverOrders.filter(o => o.status === 'DELIVERED');
    const cancelledOrders = driverOrders.filter(o => o.status === 'CANCELLED');
    
    // Financial breakdown for delivered orders
    const totalCash = deliveredOrders.reduce((sum, o) => sum + (o.cashAmount || (o.totalAmount || 0)), 0);
    const totalTransfer = deliveredOrders.reduce((sum, o) => sum + (o.transferAmount || 0), 0);
    const totalDebt = deliveredOrders.reduce((sum, o) => sum + (o.debtAmount || 0), 0);

    // Render Driver Summary Banner
    if (this.driverSummaryContainer) {
      this.driverSummaryContainer.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
          <div>
            <div style="font-size: 13px; color: var(--text-secondary);">${isUserDriver ? 'Tài xế giao hàng:' : 'Tài xế đang xem:'}</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--accent-primary);">
              🚚 ${isUserDriver ? currentUser.name : (activeDriver ? activeDriver.name : 'Tất Cả Tài Xế')}
            </div>
            ${activeDriver && activeDriver.vehicle ? `<div style="font-size: 12px; color: var(--text-muted);">Phương tiện: ${activeDriver.vehicle} | SĐT: ${activeDriver.phone}</div>` : (isUserDriver ? `<div style="font-size: 12px; color: var(--text-muted);">SĐT tài xế: ${currentUser.phone}</div>` : '')}
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted);">⏳ Chờ giao</div>
              <div style="font-size: 18px; font-weight: 800; color: var(--warning);">${pendingOrders.length}</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted);">✅ Thành công</div>
              <div style="font-size: 18px; font-weight: 800; color: var(--success);">${deliveredOrders.length}</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted);">💵 Tiền mặt</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--success);">${totalCash.toLocaleString()} đ</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted);">💳 Chuyển khoản</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--accent-secondary);">${totalTransfer.toLocaleString()} đ</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted);">⚠️ Nợ lại</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--danger);">${totalDebt.toLocaleString()} đ</div>
            </div>
          </div>
        </div>

        <!-- Driver Selection Pills (Only shown to Admin) -->
        ${!isUserDriver ? `
          <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Chọn nhanh tài xế:</span>
            <button class="btn ${selectedDriverId === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="DriverView.selectDriver('ALL')">
              🌐 Tất cả
            </button>
            ${(drivers || []).map(d => `
              <button class="btn ${selectedDriverId === d.id ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="DriverView.selectDriver('${d.id}')">
                🚚 ${d.name}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Status Filter Pills -->
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Lọc trạng thái:</span>
          <button class="btn ${this.selectedStatusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="DriverView.setStatusFilter('ALL')">
            Tất cả (${driverOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'PENDING_DELIVERY' ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="DriverView.setStatusFilter('PENDING_DELIVERY')">
            ⏳ Chờ giao (${pendingOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'DELIVERED' ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="DriverView.setStatusFilter('DELIVERED')">
            ✅ Đã giao (${deliveredOrders.length})
          </button>
          <button class="btn ${this.selectedStatusFilter === 'CANCELLED' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="DriverView.setStatusFilter('CANCELLED')">
            ❌ Đã hủy (${cancelledOrders.length})
          </button>
        </div>
      `;
    }

    // Filter by status tab selection
    let filteredByStatus = driverOrders;
    if (this.selectedStatusFilter !== 'ALL') {
      filteredByStatus = driverOrders.filter(o => o.status === this.selectedStatusFilter);
    }

    if (filteredByStatus.length === 0) {
      this.ordersGrid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">
          🚚 ${isUserDriver ? 'Bạn chưa có đơn hàng nào ở trạng thái này.' : 'Không tìm thấy đơn hàng nào ở trạng thái này cho tài xế đã chọn.'}
        </div>
      `;
      return;
    }

    this.ordersGrid.innerHTML = filteredByStatus.map(o => {
      const isPending = o.status === 'PENDING_DELIVERY';
      const isDelivered = o.status === 'DELIVERED';
      const isCancelled = o.status === 'CANCELLED';

      let statusBadge = '<span class="badge badge-warning">⏳ Chờ Giao Hàng</span>';
      if (isDelivered) statusBadge = '<span class="badge badge-success">✅ Đã Giao Thành Công</span>';
      if (isCancelled) statusBadge = '<span class="badge badge-danger">❌ Đã Hủy Đơn</span>';

      return `
        <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${isPending ? 'var(--warning)' : isDelivered ? 'var(--success)' : 'var(--danger)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <span style="font-weight: 800; font-size: 16px; color: var(--accent-primary);">${o.id}</span>
                ${!isUserDriver ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">🚚 ${o.driverName || 'Chưa phân công'}</span>` : ''}
              </div>
              ${statusBadge}
            </div>

            <!-- Customer & Delivery Time Info Box -->
            <div style="background: rgba(255, 255, 255, 0.03); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 12px; border: 1px solid var(--border-glass);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="font-weight: 700; font-size: 15px;">👤 Khách Hàng: ${o.customerName}</div>
                <a href="tel:${o.customerPhone}" class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 2px 8px;" title="Gọi điện cho khách">📞 Gọi Ngay</a>
              </div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">📱 SĐT: <strong>${o.customerPhone}</strong></div>
              <div style="font-size: 13px; color: var(--text-primary); margin-top: 4px; font-weight: 500;">📍 Địa chỉ: ${o.address}</div>
              <div style="background: rgba(99, 102, 241, 0.08); padding: 6px 10px; border-radius: 6px; margin-top: 8px; font-size: 12px; color: var(--accent-primary); font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <span>🕒 Thời gian giao dự kiến:</span>
                <span style="font-weight: 800;">${o.estimatedDeliveryTime || 'Chưa có hẹn giờ'}</span>
              </div>
            </div>

            <!-- Products List -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 600;">Sản phẩm giao:</div>
              ${(o.items || []).map(item => `
                <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--border-glass);">
                  <span>• ${item.productName}</span>
                  <span style="font-weight: 700; color: var(--accent-secondary);">x${item.qty}</span>
                </div>
              `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <div style="font-size: 11px; color: var(--text-muted);">CTV Lên đơn:</div>
                <div style="font-size: 12px; font-weight: 600;">${o.ctvName} (${o.ctvRegion})</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; color: var(--text-muted);">Tổng Tiền Thu COD:</div>
                <div style="font-size: 17px; font-weight: 800; color: var(--success);">${(o.totalAmount || 0).toLocaleString()} đ</div>
              </div>
            </div>

            <!-- Delivery Payment Breakdown if Delivered -->
            ${isDelivered ? `
              <div style="background: rgba(16, 185, 129, 0.08); padding: 10px; border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: var(--success); margin-bottom: 4px;">💰 Kết Quả Thu Tiền Đơn Hàng:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                  <div>💵 Tiền mặt: <strong>${(o.cashAmount || 0).toLocaleString()} đ</strong></div>
                  <div>💳 Chuyển khoản: <strong>${(o.transferAmount || 0).toLocaleString()} đ</strong></div>
                </div>
                ${(o.debtAmount || 0) > 0 ? `
                  <div style="font-size: 12px; color: var(--danger); font-weight: 700; margin-top: 4px;">⚠️ Nợ lại: ${(o.debtAmount).toLocaleString()} đ</div>
                ` : ''}
                ${o.paymentNote ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">📝 Ghi chú: ${o.paymentNote}</div>` : ''}
              </div>
            ` : ''}

            <!-- Cancellation Details if Cancelled -->
            ${isCancelled ? `
              <div style="background: rgba(239, 68, 68, 0.08); padding: 10px; border-radius: var(--radius-sm); border: 1px solid rgba(239, 68, 68, 0.2); margin-top: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: var(--danger); margin-bottom: 2px;">❌ Lý Do Hủy Đơn / Giao Thất Bại:</div>
                <div style="font-size: 12px; color: var(--text-primary); font-weight: 500;">${o.cancelReason || 'Không có lý do cụ thể'}</div>
              </div>
            ` : ''}
          </div>

          ${isPending ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px;">
              <button class="btn btn-success" onclick="DriverView.openDeliverModal('${o.id}')">
                ✅ Giao & Thu Tiền
              </button>
              <button class="btn btn-danger" onclick="DriverView.openCancelModal('${o.id}')">
                ❌ Hủy / Thất Bại
              </button>
            </div>
          ` : `
            <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 10px; font-style: italic;">
              ${isDelivered ? `Giao thành công lúc ${new Date(o.deliveredAt).toLocaleTimeString('vi-VN')} - ${new Date(o.deliveredAt).toLocaleDateString('vi-VN')}` : `Hủy lúc ${o.cancelledAt ? new Date(o.cancelledAt).toLocaleString('vi-VN') : ''}`}
            </div>
          `}
        </div>
      `;
    }).join('');
  }
};

window.DriverView = DriverView;
