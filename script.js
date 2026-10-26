// ==========================================
// 1. الإعدادات والمتغيرات العامة
// ==========================================
const API_BASE_URL = 'https://safira-logistic.vercel.app/api';
const API_BASE = API_BASE_URL;

let currentUser = null;
let selectedGovernorateFilter = null;
let activeChatCustomerId = null;
let currentSelectedCourierId = null;
let currentSelectedMerchantId = null;
let deletingShipmentId = null;
let currentTab = 'overview';
let myChartInstance = null;

let appData = {
    users: {
        owner: { name: "مؤمن", pass: "admin123", role: "owner" },
        merchants: [],
        couriers: [],
        merchantRequests: []
    },
    merchants: [],
    couriers: [],
    payoutRequests: [],          
    settlementRequests: [],      
    merchantPricing: [],
    courierPricing: [],
    cairoMerchantPricing: [],
    cairoCourierCommission: [],
    shipments: [],
    financeTransactions: [],
    chatMessages: {},
    incomes: [],
    expenses: []
};

window.onload = function() {
    checkLoginState();
};

// دالة التأمين لبيانات التطبيق
function ensureAppDataStructure() {
    if (typeof window.appData === 'undefined' || !window.appData) {
        window.appData = {};
    }
    appData.shipments = appData.shipments || [];
    appData.merchants = appData.merchants || [];
    appData.couriers = appData.couriers || [];
    appData.payoutRequests = appData.payoutRequests || [];
    appData.settlementRequests = appData.settlementRequests || [];
    appData.expenses = appData.expenses || [];
    appData.financeTransactions = appData.financeTransactions || [];
    appData.incomes = appData.incomes || [];
}

// دالة الإشعارات العامة
function showNotification(msg, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 text-xs font-bold text-white transition transform duration-300 ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
    notif.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check text-emerald-200' : 'fa-triangle-exclamation'} ml-2"></i>${msg}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// ==========================================
// 2. المزامنة والاتصال بالسيرفر السحابي
// ==========================================
async function loadCloudData() {
    ensureAppDataStructure();
    try {
        showNotification("... جاري جلب البيانات من السيرفر السحابي", "info");
        
        // جلب الشحنات
        const shipmentsRes = await fetch(`${API_BASE_URL}/shipments`);
        if (shipmentsRes.ok) {
            const shipmentsData = await shipmentsRes.json();
            appData.shipments = shipmentsData.shipments || shipmentsData || [];
        }

        // جلب التجار
        const merchantsRes = await fetch(`${API_BASE_URL}/merchants`);
        if (merchantsRes.ok) {
            const merchantsData = await merchantsRes.json();
            appData.users.merchants = merchantsData.merchants || merchantsData || [];
            appData.merchants = appData.users.merchants;
        }

        // جلب المناديب
        const couriersRes = await fetch(`${API_BASE_URL}/couriers`);
        if (couriersRes.ok) {
            const couriersData = await couriersRes.json();
            appData.users.couriers = couriersData.couriers || couriersData || [];
            appData.couriers = appData.users.couriers;
        }

        // جلب الماليّات والخزينة
        const financeRes = await fetch(`${API_BASE_URL}/finance`);
        if (financeRes.ok) {
            const financeData = await financeRes.json();
            appData.financeTransactions = financeData.transactions || financeData || [];
        }

        // جلب طلبات انضمام التجار
        const reqRes = await fetch(`${API_BASE_URL}/merchant-requests`);
        if (reqRes.ok) {
            const reqData = await reqRes.json();
            appData.users.merchantRequests = reqData.requests || reqData || [];
        }

        initDashboard();
        showNotification("تم تحديث البيانات سحابياً بنجاح!", "success");
    } catch (err) {
        console.error("Cloud fetch error:", err);
        showNotification("تعذر الاتصال بالسيرفر السحابي، جاري عرض البيانات الحالية.", "error");
    }
}

// ==========================================
// 3. إدارة تسجيل الدخول والصلاحيات
// ==========================================
function checkLoginState() {
    const userStr = sessionStorage.getItem('safira_current_user');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('mainDashboard').classList.remove('hidden');
            loadCloudData();
            return;
        } catch(e){}
    }
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('mainDashboard').classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();

    try {
        const res = await fetch(`${API_BASE_URL}/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("السيرفر لم يعود ببيانات JSON");
        }

        const data = await res.json();

        if (res.ok && (data.success || data.token || data.user || data.role)) {
            currentUser = data.user || data;
            
            if (!currentUser.role) {
                if (u === "owner" || u === "مؤمن") currentUser.role = "owner";
                else if (u === "manager") currentUser.role = "manager";
                else if (u === "accountant") currentUser.role = "accountant";
                else if (u === "warehouse") currentUser.role = "warehouse";
                else currentUser.role = "customer_service";
            }

            sessionStorage.setItem('safira_current_user', JSON.stringify(currentUser));
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('mainDashboard').classList.remove('hidden');
            
            initDashboardWithRoleDetails();
            showNotification("تم تسجيل الدخول بنجاح من السيرفر!", "success");
            return;
        } else {
            showNotification(data.message || "بيانات الدخول غير صحيحة", "error");
        }
    } catch (err) {
        if (u === "owner" || u === "moamen" || u === "manager" || u === "accountant" || u === "warehouse" || u === "believer") {
            let assignedRole = "owner";
            if (u === "manager") assignedRole = "manager";
            else if (u === "accountant") assignedRole = "accountant";
            else if (u === "warehouse") assignedRole = "warehouse";

            currentUser = { role: assignedRole, name: u };
            sessionStorage.setItem('safira_current_user', JSON.stringify(currentUser));
            
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('mainDashboard').classList.remove('hidden');
            
            initDashboardWithRoleDetails();
            showNotification(`مرحباً بك (${u}) - وضع التشغيل المحلي التجريبي`, "success");
            return;
        }

        showNotification("تعذر الاتصال بالسيرفر السحابي أو بيانات الدخول خاطئة", "error");
    }
}

function initDashboardWithRoleDetails() {
    if (!currentUser) return;
    document.getElementById('currentLoggedInName').innerText = currentUser.name || "مستخدم النظام";
    document.getElementById('currentLoggedInInitial').innerText = (currentUser.name || "م").charAt(0);

    const roleBadge = document.getElementById('currentUserRoleBadge');
    const roleText = document.getElementById('currentLoggedInRoleText');

    const roleNames = {
        'owner': { badge: 'الأونر / مدير عام', text: 'صلاحيات كاملة للمنظومة' },
        'manager': { badge: 'المدير التنفيذي', text: 'جميع الصلاحيات عدا الإعدادات' },
        'accountant': { badge: 'المحاسب المالي', text: 'إدارة الخزينة والنظرة العامة' },
        'warehouse': { badge: 'مسئول المخزن', text: 'إدارة الشحنات والمخزن والمرتجعات' },
        'customer_service': { badge: 'خدمة العملاء', text: 'إدارة الشحنات والشات المباشر' }
    };

    const details = roleNames[currentUser.role] || { badge: 'موظف تشغيل', text: 'صلاحيات مخصصة' };
    roleBadge.innerText = details.badge;
    roleText.innerText = details.text;

    initDashboard();
}

function logout() {
    sessionStorage.removeItem('safira_current_user');
    currentUser = null;
    checkLoginState();
    showNotification("تم تسجيل الخروج بنجاح", "success");
}

function initDashboard() {
    if (!currentUser) return;
    
    document.getElementById('currentLoggedInName').innerText = currentUser.name || "مستخدم";
    document.getElementById('currentLoggedInInitial').innerText = (currentUser.name || "M").charAt(0);
    
    renderTabs();
    renderOverviewStats();
    renderShipmentsTable();
    renderWarehouseTables();
    renderCustomersList();
    renderMerchantsSection();
    renderCouriersSection();
    renderFinancePage();
    renderCourierFinancialTables();
    renderChart();
    loadMerchantsTable();
    loadCouriersTable();
}

// ==========================================
// 4. التبويبات والعرض والإحصائيات
// ==========================================
function renderTabs() {
    const container = document.getElementById('navigationTabsContainer');
    if (!container) return;

    let role = (currentUser && currentUser.role) ? currentUser.role.toLowerCase().trim() : 'owner';
    if (role === 'admin' || role === 'مؤمن' || role === 'owner') role = 'owner';

    let tabs = [];
    switch(role) {
        case 'owner':
            tabs = [
                { id: 'overview', name: 'نظرة عامة', icon: 'fa-chart-pie' },
                { id: 'shipments', name: 'إدارة الشحنات', icon: 'fa-boxes-stacked' },
                { id: 'warehouse', name: 'المخزن والمرتجعات', icon: 'fa-warehouse' },
                { id: 'customers', name: 'خدمة العملاء والشات', icon: 'fa-headset' },
                { id: 'merchants', name: 'إدارة التجار', icon: 'fa-store' },
                { id: 'couriers', name: 'المناديب الميدانيون', icon: 'fa-motorcycle' },
                { id: 'finance', name: 'الخزينة والمصروفات', icon: 'fa-wallet' },
                { id: 'settings', name: 'إعدادات النظام', icon: 'fa-gear' }
            ];
            break;
        case 'manager': 
            tabs = [
                { id: 'overview', name: 'نظرة عامة', icon: 'fa-chart-pie' },
                { id: 'shipments', name: 'إدارة الشحنات', icon: 'fa-boxes-stacked' },
                { id: 'warehouse', name: 'المخزن والمرتجعات', icon: 'fa-warehouse' },
                { id: 'customers', name: 'خدمة العملاء والشات', icon: 'fa-headset' },
                { id: 'merchants', name: 'إدارة التجار', icon: 'fa-store' },
                { id: 'couriers', name: 'المناديب الميدانيون', icon: 'fa-motorcycle' },
                { id: 'finance', name: 'الخزينة والمصروفات', icon: 'fa-wallet' }
            ];
            break;
        case 'accountant': 
            tabs = [
                { id: 'overview', name: 'نظرة عامة', icon: 'fa-chart-pie' },
                { id: 'finance', name: 'الخزينة والمصروفات', icon: 'fa-wallet' }
            ];
            break;
        case 'warehouse': 
            tabs = [
                { id: 'shipments', name: 'إدارة الشحنات', icon: 'fa-boxes-stacked' },
                { id: 'warehouse', name: 'المخزن والمرتجعات', icon: 'fa-warehouse' }
            ];
            break;
        case 'customer_service': 
            tabs = [
                { id: 'shipments', name: 'إدارة الشحنات', icon: 'fa-boxes-stacked' },
                { id: 'customers', name: 'خدمة العملاء والشات', icon: 'fa-headset' }
            ];
            break;
       default: 
            tabs = []; 
            container.innerHTML = `<div class="p-4 text-red-600 font-bold bg-red-50 rounded-xl border border-red-200">عفواً، لا توجد صلاحيات مخصصة لهذا الحساب.</div>`;
            return;
    }

    if (!tabs.some(t => t.id === currentTab)) {
        currentTab = tabs[0].id;
    }

    container.innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === t.id ? 'bg-safira-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}">
            <i class="fa-solid ${t.icon}"></i> ${t.name}
        </button>
    `).join('');

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const activeEl = document.getElementById(`content-${currentTab}`);
    if (activeEl) activeEl.classList.remove('hidden');
}

function switchTab(tabId) {
    currentTab = tabId;
    renderTabs();
    if (tabId === 'finance') {
        renderFinancePage();
    } else if (tabId === 'overview') {
        renderOverviewStats();
    }
}

function renderOverviewStats() {
    let shipments = appData.shipments || [];
    if (currentUser && currentUser.role === 'merchant') {
        shipments = shipments.filter(s => s.merchant === currentUser.name);
    }

    document.getElementById('statTotalShipments').innerText = shipments.length;
    
    const merchantsEl = document.getElementById('statTotalMerchants');
    if (merchantsEl) merchantsEl.innerText = (appData.users?.merchants?.length || 0) + " تاجر";
    
    const couriersEl = document.getElementById('statTotalCouriers');
    if (couriersEl) couriersEl.innerText = (appData.users?.couriers?.length || 0) + " مندوب";

    let netProfit = shipments.reduce((acc, s) => acc + (parseFloat(s.mShip) || 0), 0);
    const netProfitEl = document.getElementById('statNetProfit');
    if (netProfitEl) netProfitEl.innerText = netProfit + " ج.م";
}

function renderChart() {
    const ctx = document.getElementById('adminChart');
    if (!ctx) return;
    if (myChartInstance) myChartInstance.destroy();

    myChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'إجمالي الشحنات اليومية',
                data: [12, 19, 15, 22, 28, 24, 30],
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// ==========================================
// 5. إدارة الشحنات وجداولها
// ==========================================
function renderShipmentsTable() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;

    let shipments = appData.shipments || [];
    if (currentUser && currentUser.role === 'merchant') {
        shipments = shipments.filter(s => s.merchant === currentUser.name);
    }

    const govContainer = document.getElementById('governoratesButtonsContainer');
    if (govContainer) {
        const uniqueGovs = [...new Set((appData.shipments || []).map(s => s.city))].filter(Boolean);
        govContainer.innerHTML = `
            <button onclick="filterByGovernorate(null)" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === null ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">الكل</button>
            ${uniqueGovs.map(g => `
                <button onclick="filterByGovernorate('${g}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === g ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">${g}</button>
            `).join('')}
        `;
    }

    if (selectedGovernorateFilter) {
        shipments = shipments.filter(s => s.city === selectedGovernorateFilter);
    }

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">لا توجد شحنات مطابقة للبحث أو الفلتر الحالي</td></tr>`;
        return;
    }

    tbody.innerHTML = shipments.map(s => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-mono font-bold text-slate-800">${s.id || s._id}<br><span class="text-[10px] text-slate-400">${s.date || ''}</span></td>
            <td class="py-3 px-4 font-bold text-slate-700">${s.merchant || '-'}</td>
            <td class="py-3 px-4">
                <div class="font-bold text-slate-900">${s.customer || s.recipientName || '-'} (${s.phone || '-'})</div>
                <div class="text-[11px] text-slate-500">${s.city || '-'} - ${s.address || '-'}</div>
            </td>
            <td class="py-3 px-4 font-black text-emerald-600">${s.amount || s.cost || 0} ج.م</td>
            <td class="py-3 px-4 text-slate-600">${s.mShip || 0} ج.م / ${s.cShip || 0} ج.م</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${s.status === 'تم التسليم' ? 'bg-emerald-100 text-emerald-700' : s.status === 'مرتجع' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                    ${s.status || 'قيد الانتظار'}
                </span>
            </td>
<td class="py-3 px-4 text-center space-x-1 space-x-reverse">
            
                <button onclick="openEditShipmentModal('${s.id || s._id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="تعديل الشحنة"><i class="fa-solid fa-pen"></i></button>

        
                <button onclick="openWaybillModal('${s.id || s._id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="طباعة البوليصة"><i class="fa-solid fa-print"></i></button>
                <button onclick="openTrackingModal('${s.id || s._id}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="تتبع خط سير الشحنة"><i class="fa-solid fa-map-location-dot"></i></button>
                <button onclick="openCourierMapModal()" class="bg-amber-50 hover:bg-amber-100 text-amber-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="خريطة المندوب"><i class="fa-solid fa-satellite-dish"></i></button>
                ${(currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')) ? `<button onclick="requestDeleteShipment('${s.id || s._id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="حذف الأوردر"><i class="fa-solid fa-trash"></i></button>` : ''}
            </td>
    </tr>
    `).join('');
}

function genericTableFilter(searchInputId, dateFromId, dateToId, dataList, searchKeys, renderCallback) {
    const query = document.getElementById(searchInputId)?.value.trim().toLowerCase() || '';
    const dateFrom = document.getElementById(dateFromId)?.value || '';
    const dateTo = document.getElementById(dateToId)?.value || '';

    const filtered = dataList.filter(item => {
        const matchQuery = !query || searchKeys.some(key => {
            const val = getNestedValue(item, key);
            return val && val.toString().toLowerCase().includes(query);
        });

        let matchDate = true;
        const itemDateStr = item.createdAt || item.date;
        if (itemDateStr) {
            const itemDate = itemDateStr.split('T')[0];
            if (dateFrom && itemDate < dateFrom) matchDate = false;
            if (dateTo && itemDate > dateTo) matchDate = false;
        }

        return matchQuery && matchDate;
    });

    renderCallback(filtered);
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => (o ? o[p] : null), obj);
}

function filterShipmentsTable() {
    genericTableFilter(
        'shipmentSearchInput',
        'filterDateFrom',
        'filterDateTo',
        appData.shipments || [],
        ['id', 'trackingNumber', 'merchant', 'governorate', 'address', 'recipientName', 'addedBy'],
        (filteredData) => renderShipmentsTableData(filteredData)
    );
}

function renderShipmentsTableData(shipments) {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;
    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">لا توجد شحنات مطابقة للبحث</td></tr>`;
        return;
    }
    tbody.innerHTML = shipments.map(s => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-mono font-bold text-slate-800">${s.id || s._id}</td>
            <td class="py-3 px-4 font-bold text-slate-700">${s.merchant || '-'}</td>
            <td class="py-3 px-4">${s.customer || s.recipientName || '-'} (${s.phone || '-'})</td>
            <td class="py-3 px-4 font-black text-emerald-600">${s.amount || s.cost || 0} ج.م</td>
            <td class="py-3 px-4 text-slate-600">${s.mShip || 0} ج.م</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">${s.status || 'قيد الانتظار'}</span></td>
            <td class="py-3 px-4 text-center"><button onclick="requestDeleteShipment('${s.id || s._id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px]"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function attachAuditMetadata(obj) {
    obj.addedBy = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || currentUser.username || 'مؤمن (الأنور)') : 'مدير النظام';
    obj.createdAt = new Date().toISOString();
    return obj;
}

function resetShipmentFilters() {
    document.getElementById('shipmentSearchInput').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    renderShipmentsTable();
}

function filterByGovernorate(gov) {
    selectedGovernorateFilter = gov;
    renderShipmentsTable();
}

function resetGovernorateFilter() {
    selectedGovernorateFilter = null;
    renderShipmentsTable();
}

// ==========================================
// 6. استيراد وتصدير الإكسيل
// ==========================================
function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
                showNotification("ملف الإكسيل فارغ", "error");
                return;
            }

            const importedShipments = [];

           // استخدام for...of بدلاً من forEach لضمان انتظار رد خرائط جوجل لكل شحنة
            for (const row of jsonData) {
                let merchantVal = '';
                let nameVal = '';
                let phoneVal = '';
                let cityVal = '';
                let addressVal = '';
                let costVal = 0;
                let mShipVal = 50;
                let statusVal = 'جديدة';
                let dateVal = new Date().toISOString().split('T')[0];

                for (const rawKey of Object.keys(row)) {
                    const key = rawKey.trim();
                    const val = row[rawKey];
                    if (val === undefined || val === null) continue;

                    if (key.includes('التاجر')) merchantVal = String(val).trim();
                    else if (key.includes('اسم العميل') || key.includes('الاسم') || key.includes('عميل')) nameVal = String(val).trim();
                    else if (key.includes('رقم الهاتف') || key.includes('الهاتف') || key.includes('موبايل')) phoneVal = String(val).trim();
                    else if (key.includes('المحافظة') || key.includes('مدينة')) cityVal = String(val).trim();
                    else if (key.includes('العنوان')) addressVal = String(val).trim();
                    else if (key.includes('المبلغ') || key.includes('إجمالي') || key.includes('سعر')) costVal = parseFloat(val) || 0;
                    else if (key.includes('سعر الشحن') || key.includes('الشحن')) mShipVal = parseFloat(val) || 50;
                    else if (key.includes('الحالة') || key.includes('حالة')) statusVal = String(val).trim();
                    else if (key.includes('التاريخ')) dateVal = String(val).trim();
                }

                // 🧠 استدعاء خريطة جوجل لتصحيح العنوان وجلب الإحداثيات فوراً
                let resolvedLocation = await getSmartAddressFromGoogleMaps(addressVal, cityVal);

                const generatedId = `SAF-${Math.floor(100000 + Math.random() * 900000)}`;

                const newShipment = {
                    id: generatedId,
                    code: generatedId,
                    merchant: merchantVal || (currentUser ? currentUser.name : 'تاجر عام'),
                    recipientName: nameVal || 'عميل بدون اسم',
                    customer: nameVal || 'عميل بدون اسم',
                    phone: phoneVal,
                    city: resolvedLocation.city, // المحافظة المصححة تلقائياً من جوجل
                    address: resolvedLocation.formattedAddress || addressVal, // العنوان المفهرس رسمياً
                    lat: resolvedLocation.lat || null, // الإحداثيات الجغرافية خط العرض
                    lng: resolvedLocation.lng || null, // الإحداثيات الجغرافية خط الطول
                    amount: costVal,
                    mShip: mShipVal,
                    status: statusVal,
                    date: dateVal
                };

                if (!appData.shipments) appData.shipments = [];
                appData.shipments.unshift(newShipment);
                importedShipments.push(newShipment);
            }
            if (typeof renderOverviewStats === 'function') renderOverviewStats();
            if (typeof renderShipmentsTable === 'function') renderShipmentsTable();

            // حفظ في MongoDB Atlas عبر الباك إند
            try {
               const response = await fetch(`${API_BASE_URL}/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipments: importedShipments })
                });
                const result = await response.json();
                if (result.success) {
                    console.log("تم حفظ الشحنات في قاعدة البيانات بنجاح 🚀");
                }
            } catch (apiErr) {
                console.error("Sync API Error:", apiErr);
            }

            showNotification(`تم استيراد ${importedShipments.length} شحنة بنجاح 🚀`, "success");
            event.target.value = '';

        } catch (err) {
            console.error("Excel Parse Error:", err);
            showNotification("حدث خطأ أثناء قراءة ملف الإكسيل", "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function openExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        downloadExcelFile();
    }
}

function closeExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) modal.classList.add('hidden');
}

function downloadExcelFile() {
    if (!appData.shipments || appData.shipments.length === 0) {
        showNotification("لا توجد شحنات في السيستم لتصديرها", "error");
        return;
    }

    const exportData = appData.shipments.map(s => ({
        'رقم الشحنة': s.id,
        'التاجر': s.merchant,
        'اسم العميل': s.recipientName || s.customer,
        'رقم الهاتف': s.phone,
        'المحافظة': s.city,
        'العنوان التفصيلي': s.address,
        'المبلغ': s.amount || s.cost,
        'سعر الشحن': s.mShip,
        'الحالة': s.status,
        'التاريخ': s.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الشحنات");
    XLSX.writeFile(workbook, "Safira_Shipments.xlsx");
    
    showNotification("تم تصدير وتحميل ملف الشحنات بنجاح 📊", "success");
    closeExcelModal();
}

// دالة التحقق وتصحيح العنوان وجلب الإحداثيات عبر خرائط جوجل الفعلية
async function getSmartAddressFromGoogleMaps(address, city) {
    try {
        const response = await fetch(`${API_BASE_URL}/geocode-address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, city })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            return {
                city: result.city || city,
                district: result.district || address,
                formattedAddress: result.formattedAddress,
                lat: result.location.lat,
                lng: result.location.lng,
                isValid: true
            };
        }
    } catch (err) {
        console.warn("Geocoding API Connection Warning:", err);
    }
    
    // في حال حصل أي عطل، بنرجع للبيانات الأساسية عشان السيستم ميوقفش
    return { city, district: address, isValid: false };
}

async function saveNewOrder(event) {
    event.preventDefault();
    
    // سحب البيانات من الـ IDs الظاهرة في صورة الـ HTML عندك
    const merchant = document.getElementById('newMerchant').value;
    const customer = document.getElementById('newCustomer').value;
    const phone = document.getElementById('newPhone').value;
    const city = document.getElementById('newCity').value;
    const address = document.getElementById('newDetailedAddress').value;
    const amount = parseFloat(document.getElementById('newAmount').value) || 0;

    // 🧠 1. استدعاء خرائط جوجل الفعلية لتصحيح العنوان والمحافظة وجلب الإحداثيات
    showNotification("جاري التحقق من العنوان عبر خرائط جوجل...", "info");
    let resolvedLocation = await getSmartAddressFromGoogleMaps(address, city);

    // استخراج المحافظة بدقة للبحث في جدول الأسعار
    const finalCity = resolvedLocation.city || city;

    // جلب سعر شحن التاجر وعمولة المندوب تلقائياً من الجداول الخاصة بكل منهما
    const merchantRate = appData.rates ? appData.rates.find(r => r.city === finalCity) : null;
    const courierRate = appData.courierRates ? appData.courierRates.find(r => r.city === finalCity) : null;

    // 2. بناء كائن الشحنة الجديد بالبيانات الدقيقة من الخرائط والجداول
    const newOrder = { 
        id: 'SAF-' + Math.floor(100000 + Math.random() * 900000), 
        merchant, 
        customer, 
        recipientName: customer,
        phone, 
        city: finalCity, // المحافظة المصححة من الخرائط بدقة
        address: resolvedLocation.formattedAddress || address, // العنوان المفهرس رسمياً
        lat: resolvedLocation.lat || null, // خط العرض الجغرافي
        lng: resolvedLocation.lng || null, // خط الطول الجغرافي
        amount, 
        mShip: merchantRate ? merchantRate.price : 50, // سعر الشحن من جدول التاجر أوتوماتيكياً
        cShip: courierRate ? courierRate.price : 30, // عمولة المندوب من جدول المناديب لتغذية الكارت بدقة
        status: "جديدة",
        warehouseReceived: false, // لكي يظهر فوراً في جدول الاعتماد والاستلام بالمخزن!
        date: new Date().toISOString().split('T')[0]
    };

    if (!appData.shipments) appData.shipments = [];
    appData.shipments.unshift(newOrder);

    // إغلاق المودال وتحديث الواجهة بالكامل
    const modal = document.getElementById('newOrderModal');
    if (modal) modal.classList.add('hidden');
    
    if (typeof renderOverviewStats === 'function') renderOverviewStats();
    if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();

    showNotification("تم تصحيح العنوان عبر الخرائط وإضافة الشحنة بنجاح 🚀", "success");

    // 3. إرسال الأوردر للسيرفر سحابياً في الخلفية
    try {
        const res = await fetch(`${API_BASE_URL}/shipments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipments: [newOrder] })
        });
        if (res.ok) {
            console.log("تم مزامنة الأوردر اليدوي سحابياً بنجاح ☁️");
        }
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

// تأكد من ربط الدالة بالنافذة العامة لضمان عملها مع الـ Form Onsubmit
window.saveNewOrder = saveNewOrder;

// دوال فتح وإغلاق نافذة إضافة أوردر جديد
function openNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}
window.openNewOrderModal = openNewOrderModal;

function closeNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.closeNewOrderModal = closeNewOrderModal;

// فتح نافذة إضافة سعر للتاجر
function openAddMerchantPricingModal() {
    window.currentPricingTarget = 'merchant';
    const modal = document.getElementById('addMerchantPricingModal');
    const title = document.getElementById('pricingModalTitle');
    const label = document.getElementById('ratePriceLabel');
    
    if (title) title.innerHTML = `<i class="fa-solid fa-store text-safira-600"></i> إضافة سعر شحن جديد (للتاجر)`;
    if (label) label.innerText = `سعر الشحن (ج.م)`;
    if (modal) modal.classList.remove('hidden');
}
window.openAddMerchantPricingModal = openAddMerchantPricingModal;

// فتح نافذة إضافة عمولة للمندوب
function openAddCourierPricingModal() {
    window.currentPricingTarget = 'courier';
    const modal = document.getElementById('addMerchantPricingModal');
    const title = document.getElementById('pricingModalTitle');
    const label = document.getElementById('ratePriceLabel');
    
    if (title) title.innerHTML = `<i class="fa-solid fa-motorcycle text-emerald-600"></i> إضافة عمولة جديدة (للمندوب)`;
    if (label) label.innerText = `عمولة المندوب (ج.م)`;
    if (modal) modal.classList.remove('hidden');
}
window.openAddCourierPricingModal = openAddCourierPricingModal;

// إغلاق النافذة
function closeMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) modal.classList.add('hidden');
}
window.closeMerchantPricingModal = closeMerchantPricingModal;

// ==========================================
// 7. إدارة المخزن والملفات والخرائط والشات
// ==========================================
function renderWarehouseTables() {
    const deliveryTbody = document.getElementById('warehouseDeliveryTable');
    const returnsTbody = document.getElementById('warehouseReturnsTable');
    if (!deliveryTbody || !returnsTbody) return;

 // تصفية الشحنات المعلقة بانتظار استلام المخزن (تقبل الجديدة وقيد الانتظار وغير المستلمة)
    const pendingDelivery = appData.shipments.filter(s => 
        !s.warehouseReceived || s.status === 'جديدة' || s.status === 'قيد الانتظار'
    );
    const pendingReturns = appData.shipments.filter(s => s.returnRequested);

    deliveryTbody.innerHTML = pendingDelivery.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد شحنات معلقة</td></tr>` : 
        pendingDelivery.map(s => `
            <tr>
                <td class="p-2.5 font-mono font-bold">${s.id || s._id}</td>
                <td class="p-2.5">${s.customer || s.recipientName || 'عميل'} (${s.city || 'القاهرة'})</td>
                <td class="p-2.5 font-bold text-emerald-600">${s.amount || s.cost} ج.م</td>
                <td class="p-2.5 text-center">
                    <button onclick="approveWarehouseDelivery('${s.id || s._id}')" class="bg-safira-600 hover:bg-safira-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold">اعتماد واستلام</button>
                </td>
            </tr>
        `).join('');

    returnsTbody.innerHTML = pendingReturns.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد مرتجعات معلقة</td></tr>` : 
        pendingReturns.map(s => `
            <tr>
                <td class="p-2.5 font-mono font-bold">${s.id || s._id}</td>
                <td class="p-2.5"><span class="text-rose-600 font-bold">${s.returnReason || 'بدون سبب'}</span></td>
                <td class="p-2.5 font-bold">${s.amount || s.cost} ج.م</td>
                <td class="p-2.5 text-center">
                    <button onclick="approveReturn('${s.id || s._id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold">اعتماد المرتجع</button>
                </td>
            </tr>
        `).join('');
}

async function approveWarehouseDelivery(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/order-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id, status: 'جاري التوصيل', warehouseReceived: true })
        });
        if (res.ok) {
            showNotification("تم اعتماد استلام الشحنة سحابياً", "success");
            loadCloudData();
        } else {
            showNotification("فشل تحديث حالة الشحنة", "error");
        }
    } catch (e) {
        showNotification("حدث خطأ في الاتصال بالباك إند", "error");
    }
}

function openEditShipmentModal(shipmentId) {
    // البحث في مصفوفة الشحنات أو الجدول المتاح بكل الطرق الممكنة
    const shipmentsList = (typeof appData !== 'undefined' && appData.shipments) ? appData.shipments : (window.allShipments || []);
    const shipment = shipmentsList.find(s => (s._id == shipmentId) || (s.id == shipmentId) || (s.id == String(shipmentId)) || (s._id == String(shipmentId)));

    if (!shipment) {
        alert("تعذر العثور على بيانات الشحنة!");
        return;
    }
    
    document.getElementById('editShipmentId').value = shipment._id || shipment.id || '';
    document.getElementById('editCustomerName').value = shipment.customer || shipment.recipientName || '';
    document.getElementById('editPhone').value = shipment.phone || '';
    document.getElementById('editCOD').value = shipment.cod || shipment.amount || 0;
    document.getElementById('editCity').value = shipment.city || '';
    document.getElementById('editShippingFee').value = shipment.shippingFee || shipment.courierFee || 0;
    document.getElementById('editAddress').value = shipment.address || '';

    document.getElementById('editShipmentModal')?.classList.remove('hidden');
}
// إغلاق المودل
function closeEditShipmentModal() {
    document.getElementById('editShipmentModal').classList.add('hidden');
}

async function handleSaveShipment(event) {
    event.preventDefault();
    
    const id = document.getElementById('editShipmentId').value;
    const updatedData = {
        customerName: document.getElementById('editCustomerName').value,
        phone: document.getElementById('editPhone').value,
        cod: Number(document.getElementById('editCOD').value),
        city: document.getElementById('editCity').value,
        shippingFee: Number(document.getElementById('editShippingFee').value),
        address: document.getElementById('editAddress').value
    };

   try {
        const response = await fetch(`${API_BASE_URL}/shipments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id, // بنبعت الـ id هنا صراحة
                ...updatedData
            })
        });
       
        const result = await response.json();
        
        if (response.ok) {
            alert("تم تعديل بيانات الشحنة بنجاح");
            closeEditShipmentModal();
            if (typeof loadShipments === 'function') loadShipments();
        } else {
            alert("حدث خطأ أثناء التعديل");
        }
    } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالسيرفر أثناء تعديل الشحنة");
    }
}

async function approveReturn(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/order-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id, status: 'مرتجع', returnRequested: false })
        });
        if (res.ok) {
            showNotification("تم اعتماد مرتجع الشحنة بنجاح", "success");
            loadCloudData();
        } else {
            showNotification("فشل اعتماد المرتجع", "error");
        }
    } catch (e) {
        showNotification("حدث خطأ في الاتصال", "error");
    }
}

function renderCustomersList() {
    const container = document.getElementById('customersListContainer');
    if (!container) return;

    const customersMap = {};
    appData.shipments.forEach(s => {
        if (s.phone && !customersMap[s.phone]) {
            customersMap[s.phone] = { name: s.customer || s.recipientName, phone: s.phone, city: s.city, shipmentId: s.id || s._id };
        }
    });

    const customers = Object.values(customersMap);
    const badge = document.getElementById('customerCountBadge');
    if (badge) badge.innerText = customers.length;

    if (customers.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4">لا يوجد عملاء متاحين حالياً</p>`;
        return;
    }

    container.innerHTML = customers.map(c => `
        <div onclick="selectCustomerForChat('${c.phone}')" class="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition cursor-pointer flex justify-between items-center">
            <div>
                <div class="font-bold text-slate-800 text-xs">${c.name}</div>
                <p class="text-[10px] text-slate-500 font-mono">${c.phone} | ${c.city}</p>
            </div>
            <i class="fa-solid fa-chevron-left text-xs text-slate-400"></i>
        </div>
    `).join('');
}

function selectCustomerForChat(phone) {
    const s = appData.shipments.find(x => x.phone === phone);
    if (!s) return;

    activeChatCustomerId = phone;
    document.getElementById('activeCustomerInitial').innerText = (s.customer || s.recipientName || "C").charAt(0);
    document.getElementById('activeCustomerName').innerText = s.customer || s.recipientName;
    document.getElementById('activeCustomerPhone').innerText = "رقم الهاتف: " + s.phone + " | محافظة: " + s.city;
    document.getElementById('whatsappActionContainer').classList.remove('hidden');
    
    document.getElementById('chatMessageInput').disabled = false;
    document.getElementById('sendChatBtn').disabled = false;

    const chatArea = document.getElementById('chatMessagesArea');
    chatArea.className = "flex-grow overflow-y-auto p-4 space-y-3 flex flex-col items-start text-xs bg-white rounded-xl border";
    
    let msgs = appData.chatMessages[phone] || [
        { sender: 'system', text: `مرحباً بك أ/ ${s.customer || s.recipientName}، شحنتك رقم #${s.id || s._id} بمبلغ ${s.amount || s.cost} ج.م جاري توصيلها إليك بواسطة سفيرة للخدمات اللوجستية.` }
    ];

    chatArea.innerHTML = msgs.map(m => `
        <div class="p-3 rounded-2xl max-w-[80%] ${m.sender === 'owner' ? 'bg-safira-600 text-white mr-auto rounded-bl-none' : 'bg-slate-100 text-slate-800 ml-auto rounded-br-none'}">
            ${m.text}
        </div>
    `).join('');
    chatArea.scrollTop = chatArea.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const txt = input.value.trim();
    if (!txt || !activeChatCustomerId) return;

    if (!appData.chatMessages[activeChatCustomerId]) {
        appData.chatMessages[activeChatCustomerId] = [];
    }
    appData.chatMessages[activeChatCustomerId].push({ sender: 'owner', text: txt });
    input.value = "";
    selectCustomerForChat(activeChatCustomerId);
}

function sendWhatsAppMessage() {
    if (!activeChatCustomerId) return;
    const s = appData.shipments.find(x => x.phone === activeChatCustomerId);
    if (!s) return;

    const msg = `مرحباً أ/ ${s.customer || s.recipientName}، معك شركة سفيرة للشحن. تفاصيل شحنتك رقم #${s.id || s._id}: المبلغ المطلوب ${s.amount || s.cost} ج.م، العنوان: ${s.city} - ${s.address}. شكرا لتعاملكم معنا!`;
    const url = `https://wa.me/2${s.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// ==========================================
// 8. إدارة التجار (Merchants) وجداولهم وسحبهم من MongoDB
// ==========================================
async function loadMerchantsTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/merchants`);
        if (!response.ok) return;
        const merchants = await response.json();

        appData.merchants = merchants;
        if (appData.users) appData.users.merchants = merchants;

        const tbody = document.querySelector('#merchantsTableBody') || document.querySelector('#merchants-table');
        if (!tbody) return;

        tbody.innerHTML = merchants.map((m, index) => `
            <tr>
                <td class="p-3">${index + 1}</td>
                <td class="p-3 font-bold">${m.name || m.merchantName || m.storeName || 'غير محدد'}</td>
                <td class="p-3">${m.phone || ''}</td>
                <td class="p-3">${m.address || m.username || ''}</td>
                <td class="p-3 text-center">
                    <button class="text-rose-600 hover:text-rose-800 font-bold" onclick="deleteMerchant('${m._id || m.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد تجار مسجلين</td></tr>`;
        
        console.log("تم تحديث وعرض جدول التجار بنجاح 🚀");
    } catch (err) {
        console.error("Error loading merchants table:", err);
    }
}

function renderMerchantsSection() {
    const reqTbody = document.getElementById('merchant-requests-tbody');
    const payoutTbody = document.getElementById('payout-requests-tbody');
    const gridContainer = document.getElementById('merchantsGridContainer');
    if (!reqTbody || !payoutTbody || !gridContainer) return;

    const reqs = (appData.users && appData.users.merchantRequests) ? appData.users.merchantRequests : (appData.merchantRequests || []);
    const badge = document.getElementById('requests-count-badge');
    if (badge) badge.innerText = reqs.length + " طلب جديد";

    reqTbody.innerHTML = reqs.length === 0 ? `<tr><td colspan="6" class="text-center py-4 text-slate-400">لا توجد طلبات انضمام جديدة</td></tr>` : 
        reqs.map(r => {
            const storeName = r.name || r.storeName || 'متجر';
            const ownerName = r.owner || r.ownerName || '-';
            const phone = r.phone || '';
            const reqId = r._id || r.id;

            return `
            <tr>
                <td class="p-3.5 font-bold">${storeName}</td>
                <td class="p-3.5">${ownerName}</td>
                <td class="p-3.5 font-mono">${phone}</td>
                <td class="p-3.5">${r.activity || '-'}</td>
                <td class="p-3.5"><span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">معلق</span></td>
                <td class="p-3.5 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="approveMerchantRequest('${reqId}', '${storeName}', '${phone}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm"><i class="fa-solid fa-check"></i> قبول</button>
                        <button onclick="openRejectMerchantModal('${reqId}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1"><i class="fa-solid fa-xmark"></i> رفض</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

    const allPayouts = (appData.users && appData.users.payoutRequests) ? appData.users.payoutRequests : (appData.payoutRequests || []);
    payoutTbody.innerHTML = allPayouts.length === 0 ? `<tr><td colspan="6" class="text-center py-4 text-slate-400">لا توجد طلبات صرف معلقة</td></tr>` : 
        allPayouts.map(po => `
            <tr>
                <td class="p-3.5 font-mono font-bold">${po.id || po._id}</td>
                <td class="p-3.5 font-bold">${po.merchant}</td>
                <td class="p-3.5 font-black text-emerald-600">${po.amount} ج.م</td>
                <td class="p-3.5">${po.method}</td>
                <td class="p-3.5 text-slate-500">${po.date}</td>
                <td class="p-3.5 text-center">
                    <button onclick="completePayout('${po.id || po._id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold">تأكيد الصرف</button>
                </td>
            </tr>
        `).join('');

    const merchants = (appData.users && appData.users.merchants) ? appData.users.merchants : (appData.merchants || []);
    gridContainer.innerHTML = merchants.map(m => `
        <div onclick="openMerchantProfile('${m.storename || m.storeName || m.name || m.username}')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition">
            <div class="flex justify-between items-start">
                <div class="w-10 h-10 rounded-xl bg-safira-50 text-safira-600 flex items-center justify-center font-bold text-lg"><i class="fa-solid fa-store"></i></div>
                <span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">نشط سحابياً</span>
            </div>
            <div>
                <div class="font-bold text-slate-900 text-sm">${m.name || m.storeName}</div>
                <p class="text-xs text-slate-500 font-mono mt-0.5">يوزر: ${m.username || m.phone}</p>
            </div>
        </div>
    `).join('') || `<div class="col-span-full p-6 text-center text-slate-400">لا توجد متاجر مسجلة حالياً</div>`;
}

async function approveMerchantRequest(id, merchantName, merchantPhone) {
    try {
        const res = await fetch(`${API_BASE_URL}/merchant-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: id, action: 'approve' })
        });
        if (res.ok) {
            showNotification("تم قبول التاجر بنجاح ☁️", "success");
            if (merchantPhone) {
                const formattedPhone = merchantPhone.startsWith('0') ? '2' + merchantPhone : '20' + merchantPhone.replace(/^0+/, '');
                const welcomeMsg = `مرحباً بك يا ${merchantName || 'عزيزنا التاجر'} في سفيرة للشحن 🎉 تم قبول واعتماد حسابك بنجاح.`;
                window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(welcomeMsg)}`, '_blank');
            }
            loadCloudData();
        } else {
            showNotification("فشل التنفيذ", "error");
        }
    } catch (e) {
        showNotification("خطأ في الاتصال بالسيرفر", "error");
    }
}

function openRejectMerchantModal(id) {
    const input = document.getElementById('rejectMerchantId');
    if (input) input.value = id;
    document.getElementById('rejectMerchantModal')?.classList.remove('hidden');
}

function closeRejectMerchantModal() {
    document.getElementById('rejectMerchantModal')?.classList.add('hidden');
}

async function handleMerchantSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('merchantName').value;
    const phone = document.getElementById('merchantPhone').value;
    const username = document.getElementById('merchantUsername').value;
    const pass = document.getElementById('merchantPassword').value;

    const newMerchant = { id: Date.now(), name, phone, username };
    if (!appData.merchants) appData.merchants = [];
    appData.merchants.unshift(newMerchant);

    closeAddMerchantModal();
    renderMerchantsSection();
    showNotification("تم إضافة التاجر محلياً، جاري المزامنة...", "success");

    try {
        const res = await fetch(`${API_BASE_URL}/merchants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, username, pass })
        });
        if (res.ok) {
            showNotification("تم الحفظ السحابي للتاجر بنجاح ☁️🚀", "success");
            loadCloudData();
        } else {
            showNotification("فشل الحفظ على السيرفر", "error");
        }
    } catch (err) {
        showNotification("خطأ في الاتصال بالباك إند", "error");
    }
}

function openMerchantProfile(merchantId) {
    currentSelectedMerchantId = merchantId;
    const merchants = (appData.users && appData.users.merchants) ? appData.users.merchants : (appData.merchants || []);
    const merchant = merchants.find(m => String(m.id) === String(merchantId) || String(m.username) === String(merchantId) || String(m.storeName) === String(merchantId) || String(m.name) === String(merchantId));

    const storeName = merchant?.storeName || merchant?.name || merchantId;
    const phone = merchant?.phone || 'غير مسجل';
    
    const nameEl = document.getElementById('modalMerchantName');
    const subEl = document.getElementById('modalMerchantSubDetails');
    if (nameEl) nameEl.innerText = `متجر / ${storeName}`;
    if (subEl) subEl.innerText = `صاحب المتجر: ${merchant?.name || storeName} | هاتف: ${phone}`;

    const modal = document.getElementById('merchantProfileModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
    filterSelectedMerchantData();
}

function closeMerchantProfileModal() {
    const modal = document.getElementById('merchantProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentSelectedMerchantId = null;
}

function filterSelectedMerchantData() {
    if (!currentSelectedMerchantId) return;

    const dateFrom = document.getElementById('merchantFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('merchantFilterDateTo')?.value || '';
    const statusFilter = document.getElementById('merchantFilterStatus')?.value || '';

    const allShipments = appData.shipments || [];
    let merchantShipments = allShipments.filter(sh => sh.merchantId === currentSelectedMerchantId || sh.merchant === currentSelectedMerchantId);

    merchantShipments = merchantShipments.filter(sh => {
        let matchDate = true;
        const itemDate = (sh.createdAt || sh.date || '').split('T')[0];
        if (dateFrom && itemDate < dateFrom) matchDate = false;
        if (dateTo && itemDate > dateTo) matchDate = false;
        let matchStatus = !statusFilter || sh.status === statusFilter;
        return matchDate && matchStatus;
    });

    const totalCount = merchantShipments.length;
    const totalDues = merchantShipments.filter(s => s.status === 'تم التسليم').reduce((sum, s) => sum + (parseFloat(s.amount || s.cost) - (parseFloat(s.merchantShipping || s.mShip) || 0)), 0);

    const mStatTotal = document.getElementById('mStatTotalOrders');
    const mStatDues = document.getElementById('mStatTotalDues');
    const mCount = document.getElementById('merchantOrdersCount');
    if (mStatTotal) mStatTotal.innerText = totalCount;
    if (mStatDues) mStatDues.innerText = totalDues.toLocaleString() + ' ج.م';
    if (mCount) mCount.innerText = `${totalCount} شحنة`;

    const tbody = document.getElementById('merchantProfileOrdersTbody');
    if (!tbody) return;
    if (merchantShipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">لا توجد أوردرات مسجلة لهذا التاجر.</td></tr>`;
        return;
    }

    tbody.innerHTML = merchantShipments.map(sh => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-800">#${sh.trackingNumber || sh.id}</td>
            <td class="p-3">${sh.recipientName || sh.customer || 'عميل'}</td>
            <td class="p-3 font-bold text-slate-800">${sh.amount || sh.cost} ج.م</td>
            <td class="p-3 text-slate-500">${sh.mShip || 0} ج.م</td>
            <td class="p-3 font-black text-emerald-600">${(sh.amount || sh.cost) - (sh.mShip || 0)} ج.م</td>
            <td class="p-3"><span class="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">${sh.status || 'قيد التسليم'}</span></td>
            <td class="p-3 text-slate-500 text-[11px]">${sh.addedBy || 'الأنور'}</td>
        </tr>
    `).join('');
}

// ==========================================
// 9. إدارة المناديب (Couriers) وجداولهم
// ==========================================
async function loadCouriersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/couriers`);
        if (!response.ok) return;
        const couriers = await response.json();

        appData.couriers = couriers;
        if (appData.users) appData.users.couriers = couriers;

        const tbody = document.querySelector('#couriersTableBody') || document.querySelector('#couriers-table');
        if (!tbody) return;

        tbody.innerHTML = couriers.map((c, index) => `
            <tr>
                <td class="p-3">${index + 1}</td>
                <td class="p-3 font-bold">${c.name || 'مندوب'}</td>
                <td class="p-3">${c.phone || ''}</td>
                <td class="p-3">${c.zone || c.city || 'عام'}</td>
                <td class="p-3 text-center">
                    <button class="text-rose-600 hover:text-rose-800 font-bold" onclick="deleteCourier('${c._id || c.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد مناديب مسجلين</td></tr>`;
        
        console.log("تم تحديث وعرض جدول المناديب بنجاح 🚀");
    } catch (err) {
        console.error("Error loading couriers table:", err);
    }
}

async function renderCouriersSection() {
    const container = document.getElementById('couriersGridContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/couriers`);
        let couriers = [];
        if (res.ok) {
            couriers = await res.json();
        } else {
            couriers = (appData.users && appData.users.couriers) ? appData.users.couriers : (appData.couriers || []);
        }

        if (couriers.length === 0) {
            container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-400">لا توجد مناديب مسجلين حالياً</div>`;
            return;
        }

        container.innerHTML = couriers.map(c => {
            const isCairo = c.type === 'cairo' || !c.city;
            const badgeText = isCairo ? 'مندوب القاهرة الكبرى' : `مندوب محافظة: ${c.city || c.zone || 'محدد'}`;
            const badgeColor = isCairo ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

            return `
                <div onclick="openCourierProfile('${c.id || c.username || c.name}')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition">
                    <div class="flex justify-between items-start">
                        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg"><i class="fa-solid fa-motorcycle"></i></div>
                        <span class="${badgeColor} text-[10px] font-bold px-2 py-0.5 rounded-full">${badgeText}</span>
                    </div>
                    <div>
                        <div class="font-bold text-slate-900 text-sm">${c.name}</div>
                        <p class="text-xs text-slate-500 font-mono mt-0.5">الهاتف: ${c.phone} | المنطقة: ${c.zone || c.area || 'عام'}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<div class="col-span-full p-6 text-center text-red-400">حدث خطأ أثناء تحميل المناديب</div>`;
    }
}

async function handleSaveCourier(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const nameInput = document.getElementById('courierNameInput');
    const phoneInput = document.getElementById('courierPhoneInput');
    const passwordInput = document.getElementById('courierPassInput');
    const typeSelect = document.getElementById('courierTypeSelect');
    const citySelect = document.getElementById('courierCitySelect');
    const cairoZoneInput = document.getElementById('courierCairoZoneInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const type = typeSelect ? typeSelect.value : 'cairo';

    let selectedZone = '';
    if (type === 'governorate') {
        selectedZone = citySelect ? citySelect.value : 'محافظة';
    } else {
        selectedZone = cairoZoneInput ? cairoZoneInput.value.trim() : 'القاهرة الكبرى';
    }

    if (!name || !phone) {
        showNotification("يرجى إدخال اسم المندوب ورقم الهاتف على الأقل", "error");
        return;
    }

    const newCourier = { id: Date.now(), name, phone, password, type, zone: selectedZone, status: 'متاح' };
    if (!appData.couriers) appData.couriers = [];
    appData.couriers.unshift(newCourier);

    closeAddCourierModal();
    if (typeof renderCouriersSection === 'function') renderCouriersSection();

    showNotification("تم إضافة المندوب محلياً، جاري فتح رسالة الواتساب...", "info");

    const formattedPhone = phone.startsWith('0') ? '2' + phone : '20' + phone.replace(/^0+/, '');
    const resetPassLink = `https://moamen0996.github.io/safira-courier-frontend/reset-password.html?phone=${phone}`;
    const courierMsg = `أهلاً بك يا ${name} كمندوب ميداني في شركة سفيرة للخدمات اللوجستية والشحن 🛵\nرابط تفعيل حسابك:\n${resetPassLink}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(courierMsg)}`, '_blank');

    try {
        const response = await fetch(`${API_BASE}/couriers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, type, zone: selectedZone, status: 'متاح' })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification("تم مزامنة المندوب سحابياً بنجاح ☁️🚀", "success");
            loadCloudData();
        } else {
            showNotification(result.message || "فشل الحفظ على السيرفر", "error");
        }
    } catch (err) {
        showNotification("خطأ في الاتصال بالباك إند أثناء المزامنة", "error");
    }
}

function openCourierProfile(courierId) {
    currentSelectedCourierId = courierId;
    const modal = document.getElementById('courierProfileModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }

    const couriers = (appData.users && appData.users.couriers) ? appData.users.couriers : (appData.couriers || []);
    let courier = couriers.find(c => String(c.id) === String(courierId) || String(c._id) === String(courierId) || String(c.username) === String(courierId) || String(c.name) === String(courierId));

    if (courier) {
        const nameEl = document.getElementById('modalCourierName');
        const detailsEl = document.getElementById('modalCouriersSubDetails');
        if (nameEl) nameEl.innerText = courier.name;
        if (detailsEl) detailsEl.innerText = `هاتف: ${courier.phone} | المنطقة: ${courier.zone || courier.area || 'عام'}`;
        filterSelectedCourierData();
    }
}

function closeCourierProfileModal() {
    const modal = document.getElementById('courierProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentSelectedCourierId = null;
}

function filterSelectedCourierData() {
    if (!currentSelectedCourierId) return;

    const dateFrom = document.getElementById('courierFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('courierFilterDateTo')?.value || '';
    const statusFilter = document.getElementById('courierFilterStatus')?.value || '';

    const allShipments = appData.shipments || [];
    let courierShipments = allShipments.filter(sh => sh.courierId === currentSelectedCourierId || sh.courier === currentSelectedCourierId);

    courierShipments = courierShipments.filter(sh => {
        let matchDate = true;
        const itemDate = (sh.createdAt || sh.date || '').split('T')[0];
        if (dateFrom && itemDate < dateFrom) matchDate = false;
        if (dateTo && itemDate > dateTo) matchDate = false;
        let matchStatus = !statusFilter || sh.status === statusFilter;
        return matchDate && matchStatus;
    });

    const totalCount = courierShipments.length;
    const deliveredCount = courierShipments.filter(s => s.status === 'تم التسليم').length;
    const returnedCount = courierShipments.filter(s => s.status === 'مرتجع').length;
    const collectedMoney = courierShipments.filter(s => s.status === 'تم التسليم').reduce((sum, s) => sum + (parseFloat(s.amount || s.cost) || 0), 0);

    if (document.getElementById('cStatTotalOrders')) document.getElementById('cStatTotalOrders').innerText = totalCount;
    if (document.getElementById('cStatDelivered')) document.getElementById('cStatDelivered').innerText = deliveredCount;
    if (document.getElementById('cStatReturned')) document.getElementById('cStatReturned').innerText = returnedCount;
    if (document.getElementById('cStatCollectedMoney')) document.getElementById('cStatCollectedMoney').innerText = collectedMoney.toLocaleString() + ' ج.م';
    if (document.getElementById('courierOrdersCount')) document.getElementById('courierOrdersCount').innerText = `${totalCount} شحنة`;

    const tbody = document.getElementById('courierProfileOrdersTbody');
    if (!tbody) return;
    if (courierShipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">لا توجد أوردرات مسجلة لهذا المندوب.</td></tr>`;
        return;
    }

    tbody.innerHTML = courierShipments.map(sh => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-800">#${sh.trackingNumber || sh.id}</td>
            <td class="p-3">${sh.merchant || 'غير محدد'}</td>
            <td class="p-3">${sh.recipientName || sh.customer || 'عميل'}</td>
            <td class="p-3 font-black text-slate-800">${sh.amount || sh.cost} ج.م</td>
            <td class="p-3"><span class="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">${sh.status || 'قيد التسليم'}</span></td>
            <td class="p-3 text-slate-500 text-[11px]">${sh.addedBy || 'الأنور'}</td>
        </tr>
    `).join('');
}

// --- دالة موحدة لفتح الخرائط وتتبع المواقع بدقة ---
window.openOrderLocationOnMap = window.openOrderLocationOnMap || function(lat, lng, address, governorate, city, mapType) {
    const query = encodeURIComponent(address || city || governorate || "Egypt");
    let url = "";
    if (mapType === 'apple') {
        url = `https://maps.apple.com/?q=${query}`;
    } else {
        url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(url, '_blank');
};

window.openCourierMap = window.openCourierMap || function(lat, lng, name, mapType) {
    const query = encodeURIComponent(name || "Courier Location");
    let url = mapType === 'apple' ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
};

window.openCourierMapModal = window.openCourierMapModal || function() {
    document.getElementById('courierMapModal')?.classList.remove('hidden');
};

// ==========================================
// 10. الإدارة المالية والخزينة والمصروفات
// ==========================================
function renderCourierFinancialTables() {
    if (typeof appData === 'undefined') window.appData = {};
    if (!appData.payoutRequests) appData.payoutRequests = [];
    if (!appData.settlementRequests) appData.settlementRequests = [];

    const payoutBody = document.getElementById('courierPayoutRequestsBody');
    if (payoutBody) {
        payoutBody.innerHTML = appData.payoutRequests.map(item => `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2.5 font-bold text-slate-800">${item.courierName || ''}</td>
                <td class="p-2.5 font-bold font-mono text-amber-600">${item.amount || 0} ج.م</td>
                <td class="p-2.5"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">${item.status || 'معلق'}</span></td>
                <td class="p-2.5"><button onclick="approvePayout('${item.id}')" class="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px]">اعتماد</button></td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="p-3 text-center text-slate-400">لا توجد طلبات مستحقات</td></tr>`;
    }

    const settlementBody = document.getElementById('courierSettlementRequestsBody');
    if (settlementBody) {
        settlementBody.innerHTML = appData.settlementRequests.map(item => `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2.5 font-bold text-slate-800">${item.courierName || ''} (${item.city || ''})</td>
                <td class="p-2.5 font-bold font-mono text-indigo-600">${item.netAmount || 0} ج.م</td>
                <td class="p-2.5"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">${item.status || 'معلق'}</span></td>
                <td class="p-2.5"><button onclick="approveSettlement('${item.id}')" class="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px]">اعتماد</button></td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="p-3 text-center text-slate-400">لا توجد طلبات تسوية</td></tr>`;
    }
}

function approvePayout(id) {
    const req = appData.payoutRequests.find(r => r.id === id);
    if (req) {
        req.status = 'تم الصرف';
        if (!appData.expenses) appData.expenses = [];
        appData.expenses.unshift({
            id: Date.now(),
            title: `صرف مستحقات للمندوب (${req.courierName})`,
            amount: req.amount,
            person: req.courierName,
            date: new Date().toISOString().split('T')[0]
        });
        renderCourierFinancialTables();
        renderFinancePage();
        showNotification("تم اعتماد الصرف بنجاح", "success");
    }
}

function approveSettlement(id) {
    const req = appData.settlementRequests.find(r => r.id === id);
    if (req) {
        req.status = 'تمت التسوية';
        if (!appData.incomes) appData.incomes = [];
        appData.incomes.unshift({
            id: Date.now(),
            title: `تسوية حساب توريد (${req.city} - ${req.courierName})`,
            amount: req.netAmount,
            category: 'تسوية أقاليم',
            date: new Date().toISOString().split('T')[0]
        });
        renderCourierFinancialTables();
        renderFinancePage();
        showNotification("تم اعتماد التسوية وإيداع المبلغ", "success");
    }
}

function renderFinancePage() {
    ensureAppDataStructure();

    const incomeBody = document.getElementById('incomeTableBody');
    let totalIn = 0;
    if (incomeBody) {
        incomeBody.innerHTML = (appData.incomes || []).map(item => {
            totalIn += parseFloat(item.amount) || 0;
            return `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">${item.title}</td>
                    <td class="p-3 font-mono font-bold text-emerald-600">+${item.amount} ج.م</td>
                    <td class="p-3"><span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">${item.category || 'إيراد'}</span></td>
                    <td class="p-3 text-slate-500">${item.date}</td>
                    <td class="p-3"><button onclick="deleteIncome(${item.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد إيرادات مسجلة</td></tr>`;
    }

    const expenseBody = document.getElementById('expenseTableBody');
    let totalOut = 0;
    if (expenseBody) {
        expenseBody.innerHTML = (appData.expenses || []).map(item => {
            totalOut += parseFloat(item.amount) || 0;
            return `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">${item.title || item.desc}</td>
                    <td class="p-3 font-mono font-bold text-rose-600">-${item.amount} ج.م</td>
                    <td class="p-3 text-slate-600">${item.person || item.type || 'تشغيلي'}</td>
                    <td class="p-3 text-slate-500">${item.date}</td>
                    <td class="p-3"><button onclick="deleteExpense(${item.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد مصروفات مسجلة</td></tr>`;
    }

    if (document.getElementById('financeTotalIn')) document.getElementById('financeTotalIn').innerText = totalIn + " ج.م";
    if (document.getElementById('financeTotalOut')) document.getElementById('financeTotalOut').innerText = totalOut + " ج.م";
    
    const netBalance = totalIn - totalOut;
    const netBalanceEl = document.getElementById('financeNetBalance');
    if (netBalanceEl) {
        netBalanceEl.innerText = netBalance + " ج.م";
        netBalanceEl.className = `text-xl font-black mt-1 ${netBalance >= 0 ? 'text-safira-600' : 'text-rose-600'}`;
    }
}

function openAddIncomeModal() {
    const modal = document.getElementById('addIncomeModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
    }
}
function closeAddIncomeModal() {
    const modal = document.getElementById('addIncomeModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function openAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
    }
}
function closeAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function deleteIncome(id) {
    appData.incomes = appData.incomes.filter(i => i.id !== id);
    renderFinancePage();
    showNotification("تم حذف الإيراد بنجاح", "success");
}

function deleteExpense(id) {
    appData.expenses = appData.expenses.filter(e => e.id !== id);
    renderFinancePage();
    showNotification("تم حذف المصروف بنجاح", "success");
}

// ==========================================
// 11. إدارة الحذف والتحكم والمودالات الأخرى
// ==========================================
async function requestDeleteShipment(shipmentId) {
    let cleanId = shipmentId ? String(shipmentId).replace('#', '').trim() : null;
    if (!cleanId) {
        showNotification("رقم الشحنة غير متوفر للحذف", "error");
        return;
    }
    if (!confirm(`هل أنت متأكد من حذف الشحنة رقم (${cleanId})؟`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/shipments?id=${cleanId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            loadCloudData();
            showNotification("تم حذف الشحنة بنجاح من السيرفر", "success");
        } else {
            showNotification(data.message || "فشل حذف الشحنة", "error");
        }
    } catch (err) {
        showNotification("حدث خطأ في الاتصال بالباك إند", "error");
    }
}

function openWaybillModal(id) {
    const s = appData.shipments.find(x => (x.id || x._id) === id);
    if (!s) return;

    document.getElementById('wbId').innerText = "#" + (s.id || s._id);
    document.getElementById('wbDateTime').innerText = s.date || '-';
    document.getElementById('wbMerchant').innerText = s.merchant || '-';
    document.getElementById('wbCustomer').innerText = s.customer || s.recipientName || '-';
    document.getElementById('wbPhone').innerText = s.phone || '-';
    document.getElementById('wbCity').innerText = s.city || '-';
    document.getElementById('wbAddress').innerText = s.address || '-';
    document.getElementById('wbAmount').innerText = (s.amount || s.cost) + " ج.م";

    document.getElementById('waybillModal')?.classList.remove('hidden');
}
function closeWaybillModal() { document.getElementById('waybillModal')?.classList.add('hidden'); }

function openTrackingModal(id) {
    const s = appData.shipments.find(x => (x.id || x._id) === id);
    if (!s) return;

    document.getElementById('trackWaybillTitle').innerText = "رقم البوليصة: #" + (s.id || s._id);
    document.getElementById('trackCustomerInfo').innerText = `العميل: ${s.customer || s.recipientName} | الهاتف: ${s.phone}`;

    const container = document.getElementById('adminTimelineContainer');
    if (container) {
        container.innerHTML = `
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span><div class="font-bold text-slate-800">تم تسجيل الأوردر</div><p class="text-[10px] text-slate-500">${s.date || ''}</p></div>
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full ${s.warehouseReceived ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'}"></span><div class="font-bold text-slate-800">استلام المخزن وتجهيز خط السير</div></div>
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full ${s.status === 'تم التسليم' ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-blue-500 animate-pulse'}"></span><div class="font-bold text-slate-800">حالة الشحنة الحالية: ${s.status || 'قيد الانتظار'}</div></div>
        `;
    }
    document.getElementById('trackingModal')?.classList.remove('hidden');
}
function closeTrackingModal() { document.getElementById('trackingModal')?.classList.add('hidden'); }

function openCourierMapModal() { document.getElementById('courierMapModal')?.classList.remove('hidden'); }
function closeCourierMapModal() { document.getElementById('courierMapModal')?.classList.add('hidden'); }

function openAddMerchantModal() { document.getElementById('addMerchantModal')?.classList.remove('hidden'); }
function closeAddMerchantModal() { document.getElementById('addMerchantModal')?.classList.add('hidden'); }

function openAddCourierModal() {
    const modal = document.getElementById('addCourierModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}
function closeAddCourierModal() {
    const modal = document.getElementById('addCourierModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

async function saveSystemSettings(event) {
    event.preventDefault();
    const ownerName = document.getElementById('settingsOwnerName')?.value;
    const ownerPass = document.getElementById('settingsOwnerPass')?.value;

    try {
        const res = await fetch(`${API_BASE_URL}/admin-login`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ownerName, pass: ownerPass })
        });
        if (res.ok) {
            showNotification("تم حفظ إعدادات النظام سحابياً", "success");
        } else {
            showNotification("تعذر حفظ الإعدادات", "error");
        }
    } catch (e) {
        showNotification("خطأ في الاتصال", "error");
    }
}


// ربط الدوال بالـ Global Scope للواجهة
window.openAddCourierModal = openAddCourierModal;
window.closeAddCourierModal = closeAddCourierModal;
window.handleSaveCourier = handleSaveCourier;
window.openExcelModal = openExcelModal;
window.closeExcelModal = closeExcelModal;
window.downloadExcelFile = downloadExcelFile;
window.openAddMerchantModal = openAddMerchantModal;
window.closeAddMerchantModal = closeAddMerchantModal;
window.handleMerchantSubmit = handleMerchantSubmit;

// --- الربط السليم لجميع الدوال بالأحرف الحقيقية بدون أخطاء ---
window.openEditShipmentModal = openEditShipmentModal;
window.openWaybillModal = openWaybillModal;       
window.openTrackingModal = openTrackingModal;     
window.openCourierMapModal = openCourierMapModal; 
window.requestDeleteShipment = requestDeleteShipment; 

window.closewaybillModal = closeWaybillModal;
window.closeTrackingModal = closeTrackingModal;
window.closeCourierMapModal = closeCourierMapModal;
window.closeEditShipmentModal = closeEditShipmentModal;


window.openAddMerchantPricingModal = window.openAddMerchantPricingModal || function() {};
window.openAddCourierPricingModal = window.openAddCourierPricingModal || function() {};
window.openAddCairoMerchantPriceModal = window.openAddCairoMerchantPriceModal || function() {};
window.openAddCairoCourierCommissionModal = window.openAddCairoCourierCommissionModal || function() {};


// تشغيل المزامنة الشاملة وقبل عرض الواجهة للموظف
document.addEventListener("DOMContentLoaded", async () => {
    // 1. إظهار شاشة تحميل سحابية احترافية تغطي الشاشة
    const loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'cloudLoadingOverlay';
    loaderOverlay.innerHTML = `
        <div style="position: fixed; inset: 0; background: #0f172a; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-family: Cairo, sans-serif;">
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 15px; color: #10b981;">🚀 سفيرة للخدمات اللوجستية</div>
            <div style="font-size: 16px; color: #cbd5e1;">جاري جلب ومزامنة بيانات النظام الشاملة (تجار، مناديب، شحنات)...</div>
        </div>
    `;
    document.body.appendChild(loaderOverlay);

    try {
        // 2. استدعاء دالة تحديث أو جلب البيانات الأساسية مباشرة إن وجدت، أو محاكاة زر التحديث
        if (typeof fetchAllData === 'function') {
            await fetchAllData();
        } else if (typeof loadAppData === 'function') {
            await loadAppData();
        } else {
            const syncBtn = document.querySelector("#syncButton") || 
                            Array.from(document.querySelectorAll("button, a"))
                            .find(el => el.textContent && el.textContent.includes("تحديث سحابي"));
            if (syncBtn) syncBtn.click();
        }
        
        // ضمان ظهور الشاشة بوضوح للموظف لفترة كافية لجلب البيانات
        await new Promise(resolve => setTimeout(resolve, 1200));
    } catch (e) {
        console.error("خطأ في المزامنة التلقائية:", e);
    } finally {
        // 3. إزالة شاشة التحميل بسلاسة وإظهار الواجهة جاهزة ومحدثة بالكامل
        const overlay = document.getElementById('cloudLoadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => overlay.remove(), 500);
        }
    }
});
