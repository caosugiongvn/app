const RemoteConnect = {
  init() {
    this.btn = document.getElementById('remote-connect-btn');
    this.modal = document.getElementById('remote-modal');
    this.closeBtn = document.getElementById('close-remote-modal-btn');
    this.qrImg = document.getElementById('qr-code-img');
    this.urlList = document.getElementById('remote-url-list');

    if (this.btn) {
      this.btn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
  },

  async open() {
    if (this.modal) this.modal.classList.add('active');

    const res = await window.API.getNetworkInfo();
    if (res.success && res.data) {
      if (this.qrImg) this.qrImg.src = res.data.qrCodeDataUrl;
      if (this.urlList) {
        this.urlList.innerHTML = res.data.interfaces.map(item => `
          <div style="margin-bottom: 6px;">
            🌐 <strong style="color: var(--text-primary);">${item.interface}:</strong> 
            <a href="${item.url}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">${item.url}</a>
          </div>
        `).join('');
      }
    }
  },

  close() {
    if (this.modal) this.modal.classList.remove('active');
  }
};

window.RemoteConnect = RemoteConnect;
