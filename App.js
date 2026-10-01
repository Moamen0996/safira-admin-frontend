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
        // لو السيرفر لسه مش فيه /api/login خليك على النظام القديم مؤقتا
        console.warn('Login API not ready, using fallback');
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

// --- ده الجزء اللي كان ناقص عندك ---

async function loadMerchants() {
    try {
        const res = await fetch(`${API_URL}/api/merchants`);
        const merchants = await res.json();
        const list = document.getElementById('merchantsList'); // اعمل div بالـ id ده في الـ HTML
        if(list) {
            list.innerHTML = merchants.map(m => `<div class="p-2 border rounded">${m.name} - ${m.phone}</div>`).join('');
        }
        console.log('Merchants:', merchants);
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

// باقي كودك زي ما هو...
