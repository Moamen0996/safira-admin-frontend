window.loadMerchants = loadMerchants;
window.loadCloudData = loadCloudData;

const API_URL = 'https://safira-logistic-production.up.railway.app';

async function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    if(!user || !pass) return alert('دخل البيانات');
    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if(res.ok) {
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('mainDashboard').classList.remove('hidden');
            initDashboard();
        } else {
            alert(data.message || 'بيانات الدخول غلط');
        }
    } catch (e) {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        initDashboard();
    }
}

function logout() {
    document.getElementById('mainDashboard').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('content-' + tabId);
    if (target) target.classList.remove('hidden');
}

function initDashboard() {
    renderNavigationTabs();
    loadShipments();
    loadMerchants();
    loadCouriers();
    renderAdminChart();
}

async function loadMerchants() {
    try {
        const res = await fetch(`${API_URL}/api/merchants`);
        const merchants = await res.json();
        console.log('Merchants:', merchants);
        const list = document.getElementById('merchantsList');
        if(list) list.innerHTML = merchants.map(m => `<div class="p-2 border rounded">${m.name} - ${m.phone}</div>`).join('');
    } catch(e) { console.error('Merchants error', e); }
}

async function loadCouriers() {
    try {
        const res = await fetch(`${API_URL}/api/couriers`);
        const couriers = await res.json();
        console.log('Couriers:', couriers);
    } catch(e) { console.error('Couriers error', e); }
}

async function loadShipments() {
    try {
        const res = await fetch(`${API_URL}/api/shipments`);
        const shipments = await res.json();
        console.log('Shipments:', shipments);
    } catch(e) { console.error('Shipments error', e); }
}

function renderNavigationTabs() {
    const tabs = [
        { id: 'overview', name: 'الرئيسية والإحصائيات', icon: 'fa-chart-pie' },
        { id: 'shipments', name: 'الشحنات والأوردرات', icon: 'fa-boxes-stacked' },
        { id: 'customers', name: 'خدمة العملاء', icon: 'fa-headset' },
        { id: 'merchants', name: 'التجار', icon: 'fa-store' },
        { id: 'couriers', name: 'المناديب', icon: 'fa-motorcycle' },
        { id: 'finance', name: 'الخزينة والحسابات', icon: 'fa-wallet' },
        { id: 'settings', name: 'الإعدادات والصلاحيات', icon: 'fa-sliders' }
    ];
    const container = document.getElementById('navigationTabsContainer');
    if (!container) return;
    container.innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" class="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-safira-50 text-slate-700 hover:text-safira-600 border border-slate-200 transition flex items-center gap-2 shadow-sm">
            <i class="fa-solid ${t.icon}"></i> ${t.name}
        </button>
    `).join('');
}

async function addMerchant(event) {
    event.preventDefault();
    const name = document.getElementById('mName').value;
    const phone = document.getElementById('mPhone').value;
    try {
        const response = await fetch(`${API_URL}/api/merchants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });
        if (response.ok) {
            alert('تم إضافة التاجر بنجاح');
            document.getElementById('addMerchantForm').reset();
            loadMerchants();
        }
    } catch (error) { console.error(error); }
}

async function addCourier(event) {
    event.preventDefault();
    const name = document.getElementById('cName').value;
    const phone = document.getElementById('cPhone').value;
    try {
        const response = await fetch(`${API_URL}/api/couriers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });
        if (response.ok) {
            alert('تم إضافة المندوب بنجاح');
            document.getElementById('addCourierForm').reset();
            loadCouriers();
        }
    } catch (error) { console.error(error); }
}

function renderAdminChart() {
    const ctx = document.getElementById('adminChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'الشحنات الأسبوعية',
                data: [120, 190, 150, 220, 280, 310, 250],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function openExcelModal() { document.getElementById('excelModal').classList.remove('hidden'); }
function closeExcelModal() { document.getElementById('excelModal').classList.add('hidden'); }
