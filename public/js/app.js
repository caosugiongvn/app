// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initGlobalSyncVps();
    initGreeting();
    initNamePersonalization();
    initCounterAndCelebrate();
    initCanvasParticles();
    initAppViews();
});

/* ==========================================================================
   1. Theme Management (Dark / Light)
   ========================================================================== */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            const icon = themeToggleBtn.querySelector('.theme-icon');
            if (icon) icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
            showToast(newTheme === 'dark' ? '🌙 Đã chuyển sang Dark Mode' : '☀️ Đã chuyển sang Light Mode');
        });
    }
}

function initGlobalSyncVps() {
    const globalSyncBtn = document.getElementById('btn-sync-vps-global');
    if (globalSyncBtn) {
        globalSyncBtn.addEventListener('click', async () => {
            if (!confirm('Bạn có chắc chắn muốn kích hoạt Đồng bộ & Cập nhật Code từ Git Repository lên VPS Linux không?')) return;
            globalSyncBtn.disabled = true;
            globalSyncBtn.innerHTML = '<span>⏳ Đang kéo code VPS...</span>';
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
                globalSyncBtn.disabled = false;
                globalSyncBtn.innerHTML = '<span>🔄 Đồng bộ VPS</span>';
            }
        });
    }
}

/* ==========================================================================
   2. Dynamic Time-based Greeting
   ========================================================================== */
function initGreeting() {
    const timeBadge = document.getElementById('time-badge');
    const greetingPrefix = document.getElementById('greeting-prefix');
    const hour = new Date().getHours();

    let greetingText = 'Xin chào!';
    let prefix = 'Chào mừng';

    if (hour >= 5 && hour < 12) {
        greetingText = '🌅 Chúc bạn một buổi sáng tốt lành!';
        prefix = 'Buổi sáng vui vẻ,';
    } else if (hour >= 12 && hour < 18) {
        greetingText = '☀️ Chúc bạn một buổi chiều tràn đầy năng lượng!';
        prefix = 'Buổi chiều năng động,';
    } else {
        greetingText = '🌙 Chúc bạn một buổi tối thư giãn!';
        prefix = 'Buổi tối bình yên,';
    }

    if (timeBadge) timeBadge.textContent = greetingText;
    if (greetingPrefix) greetingPrefix.textContent = prefix;
}

/* ==========================================================================
   3. Name Personalization & localStorage
   ========================================================================== */
function initNamePersonalization() {
    const nameInput = document.getElementById('name-input');
    const saveBtn = document.getElementById('save-name-btn');
    const userDisplayName = document.getElementById('user-display-name');

    const savedName = localStorage.getItem('user_name');
    if (savedName && userDisplayName) {
        userDisplayName.textContent = savedName;
        if (nameInput) nameInput.value = savedName;
    }

    function saveName() {
        if (!nameInput) return;
        const inputVal = nameInput.value.trim();
        if (inputVal) {
            if (userDisplayName) userDisplayName.textContent = inputVal;
            localStorage.setItem('user_name', inputVal);
            showToast(`✨ Rất vui được gặp bạn, ${inputVal}!`);
        } else {
            if (userDisplayName) userDisplayName.textContent = 'Bạn';
            localStorage.removeItem('user_name');
            showToast('Đã khôi phục tên mặc định!');
        }
    }

    if (saveBtn) saveBtn.addEventListener('click', saveName);
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveName();
        });
    }
}

/* ==========================================================================
   4. Interactive Celebration Button & Counter
   ========================================================================== */
function initCounterAndCelebrate() {
    const celebrateBtn = document.getElementById('celebrate-btn');
    const clickCounter = document.getElementById('click-counter');

    let count = parseInt(localStorage.getItem('welcome_clicks') || '0', 10);
    updateCounterDisplay(count);

    if (celebrateBtn) {
        celebrateBtn.addEventListener('click', (e) => {
            count++;
            localStorage.setItem('welcome_clicks', count);
            updateCounterDisplay(count);

            createBurstEffect(e.clientX, e.clientY);
            
            const messages = [
                '🎉 Cảm ơn bạn đã ghé thăm!',
                '🌟 Chúc bạn một ngày thật may mắn!',
                '⚡ Bạn thật tuyệt vời!',
                '🚀 Hãy cùng tạo nên những điều tuyệt diệu!'
            ];
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            showToast(randomMsg);
        });
    }

    function updateCounterDisplay(num) {
        if (clickCounter) {
            clickCounter.innerHTML = `Đã chào: <strong>${num}</strong> lần`;
        }
    }
}

/* ==========================================================================
   5. Toast Notification System
   ========================================================================== */
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

/* ==========================================================================
   6. Click Burst Particles Effect
   ========================================================================== */
function createBurstEffect(x, y) {
    const particleCount = 18;
    const colors = ['#6366f1', '#06b6d4', '#a855f7', '#ec4899', '#f59e0b'];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${Math.random() * 8 + 4}px`;
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '50%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 90 + 30;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        document.body.appendChild(particle);

        const animation = particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 400,
            easing: 'cubic-bezier(0, .9, .57, 1)',
            fill: 'forwards'
        });

        animation.onfinish = () => particle.remove();
    }
}

/* ==========================================================================
   7. Background Canvas Particle System
   ========================================================================== */
function initCanvasParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor(width / 25), 45);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            alpha: Math.random() * 0.5 + 0.2
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const theme = document.documentElement.getAttribute('data-theme');
        const particleColor = theme === 'dark' ? '99, 102, 241' : '79, 70, 229';

        for (let i = 0; i < count; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
            ctx.fill();

            // Connect nearby particles
            for (let j = i + 1; j < count; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(${particleColor}, ${0.15 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    draw();
}

/* ==========================================================================
   8. Application View & Tab Switcher Integration
   ========================================================================== */
function initAppViews() {
    if (window.priceListView && typeof window.priceListView.init === 'function') window.priceListView.init();
    if (window.DashboardView && typeof window.DashboardView.init === 'function') window.DashboardView.init();
    if (window.InventoryView && typeof window.InventoryView.init === 'function') window.InventoryView.init();
    if (window.CTVView && typeof window.CTVView.init === 'function') window.CTVView.init();
    if (window.DriverView && typeof window.DriverView.init === 'function') window.DriverView.init();
    if (window.RemoteConnect && typeof window.RemoteConnect.init === 'function') window.RemoteConnect.init();
    if (window.MessengerView && typeof window.MessengerView.init === 'function') window.MessengerView.init();

    const roleBtns = document.querySelectorAll('.role-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabViews.forEach(view => {
                if (view.id === `view-${tabName}`) {
                    view.style.display = 'block';
                    view.classList.add('active');
                } else {
                    view.style.display = 'none';
                    view.classList.remove('active');
                }
            });

            if (tabName === 'pricelist' && window.priceListView) {
                window.priceListView.render();
            } else if (tabName === 'users' && window.userView) {
                window.userView.render();
            } else if (tabName === 'messenger' && window.MessengerView) {
                window.MessengerView.loadSettings();
            }
        });
    });

    if (window.store) {
        window.store.subscribe((state) => {
            if (window.priceListView && typeof window.priceListView.render === 'function') window.priceListView.render();
            if (window.DashboardView && typeof window.DashboardView.render === 'function') window.DashboardView.render(state);
            if (window.InventoryView && typeof window.InventoryView.render === 'function') window.InventoryView.render(state);
            if (window.CTVView && typeof window.CTVView.render === 'function') window.CTVView.render(state);
            if (window.DriverView && typeof window.DriverView.render === 'function') window.DriverView.render(state);
            if (window.userView && typeof window.userView.render === 'function') window.userView.render();
        });

        window.store.fetchAll();

        // Auto-refresh state every 10 seconds for real-time remote updates
        setInterval(() => {
            window.store.fetchAll();
        }, 10000);
    }
}
