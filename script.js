// منع تهنيجة التابين
window.addEventListener('storage', (e) => {
    if (e.key === 'safira_app_data') {
        console.log('البيانات اتغيرت في تاب تاني - بحدث');
        location.reload();
    }
});

window.transferredShipmentsCache = JSON.parse(localStorage.getItem('safira_transferred_cache') || '[]');  

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

async function loadCloudData() {
    if (typeof ensureAppDataStructure === 'function') ensureAppDataStructure();
    
    try {
        showNotification("... جاري جلب البيانات من السيرفر السحابي", "info");
        
        // 1. محاولة جلب الشحنات سحابياً
        const shipmentsRes = await fetch(`${API_BASE_URL}/shipments`);
        if (shipmentsRes.ok) {
            const data = await shipmentsRes.json();
            const list = data.shipments || data.data || data || [];
            if (list.length > 0) appData.shipments = list;
        }

        // 2. محاولة جلب المناديب سحابياً
        const couriersRes = await fetch(`${API_BASE_URL}/couriers`);
        if (couriersRes.ok) {
            const data = await couriersRes.json();
            const list = data.couriers || data.data || data || [];
            if (list.length > 0) {
                appData.couriers = list;
                if (!appData.users) appData.users = {};
                appData.users.couriers = list;
            }
        }

        // 3. محاولة جلب التجار سحابياً
        const merchantsRes = await fetch(`${API_BASE_URL}/merchants`);
        if (merchantsRes.ok) {
            const data = await merchantsRes.json();
            const list = data.merchants || data.data || data || [];
            if (list.length > 0) {
                appData.merchants = list;
                if (!appData.users) appData.users = {};
                appData.users.merchants = list;
            }
        }

        // لكي لا تظل الجداول فارغة إذا كانت مصفوفة الشحنات أو المناديب فارغة تماماً، نقوم بتحميلها احتياطياً من localStorage
if (!appData.shipments || appData.shipments.length === 0) {
    const localData = localStorage.getItem('safira_app_data') || localStorage.getItem('app_shipping_data');
    if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.shipments) {
      
            appData.shipments = parsed.shipments.filter(s => {
    const status = (s.status || '').trim();
    // المرتجع / الرفض بيرجع للمخزون - مش بيتمسح
    if (status === 'مرتجع' || status === 'رفض الاستلام') return true;
    // اللي بيتمسح بس هو اللي اتسلم فعلا او مع المندوب فعلا
    if (status === 'تم التسليم') return false;
    if (status === 'مع المندوب' || status === 'جاري التوصيل') return false;
    return true;
  });
  }  
 if (parsed.couriers) {
      appData.couriers = parsed.couriers;
            if (!appData.users) appData.users = {};
            appData.users.couriers = parsed.couriers;
        }
    }
}

        console.log("البيانات الحالية المعروضة في النظام:", appData);

        if (typeof initDashboard === 'function') initDashboard();
        
        // تحديث جميع الجداول والمناديب في الواجهة فوراً
        if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
        if (typeof renderWarehouseTables === 'function') renderWarehouseTables();

        showNotification("تم تحديث البيانات بنجاح!", "success");
    } catch (err) {
        console.error("Cloud fetch error:", err);
        // التراجع عن الخطأ وقراءة التخزين المحلي للمتصفح مباشرة
        const localData = localStorage.getItem('safira_app_data') || localStorage.getItem('app_shipping_data');
        if (localData) {
            const parsed = JSON.parse(localData);
            appData.shipments = parsed.shipments || [];
            appData.couriers = parsed.couriers || [];
        }
        if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
        if (typeof renderWarehouseTables === 'function') renderWarehouseTables();
        showNotification("تم العرض من التخزين المحلي بسبب مشكلة بالاتصال.", "warning");
    }
}
window.loadCloudData = loadCloudData;

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
// 2. دالة عرض الجدول السريعة والديناميكية للأسعار
// ==========================================
function renderShipmentsTable() {
    let tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) {
        const table = document.querySelector('table');
        if (table) {
            tbody = document.createElement('tbody');
            tbody.id = 'shipmentsTableBody';
            table.appendChild(tbody);
        } else {
            return;
        }
    }

    let shipments = appData.shipments || [];
    if (currentUser && currentUser.role === 'merchant') {
        shipments = shipments.filter(s => s.merchant === currentUser.name);
    }

    const govContainer = document.getElementById('governoratesButtonsContainer');
    if (govContainer) {
        const uniqueGovs = [...new Set(shipments.map(s => s.city))].filter(Boolean);
        govContainer.innerHTML = `
            <button onclick="filterByGovernorate(null)" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === null ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">الكل (${shipments.length})</button>
            ${uniqueGovs.map(g => `
                <button onclick="filterByGovernorate('${g}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === g ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">${g}</button>
            `).join('')}
        `;
    }

    if (selectedGovernorateFilter) {
        shipments = shipments.filter(s => s.city === selectedGovernorateFilter);
    }

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 font-bold text-sm">لا توجد شحنات مسجلة في النظام حالياً أو مطابقة للفلتر</td></tr>`;
        return;
    }

    let rowsHTML = '';
    for (let i = 0; i < shipments.length; i++) {
        let s = shipments[i];
        
        // حساب السعر ديناميكياً ودقيقاً لكل منطقة ومحافظة
        const computedRates = getRatesForLocation(s.city, s.region || s.address);
        let mShip = (s.mShip !== undefined && s.mShip !== 0) ? s.mShip : computedRates.merchantPrice;
        // cShip موجود في الداتا بس مش هيظهر في الجدول حسب طلبك
        let amountVal = s.amount || s.cod || s.cost || s.total || 0;
        let detailedAddr = s.address || s.detailedAddress || s.newDetailedAddress || '';
        let notesVal = s.notes || s.note || s.remarks || '-';
        // سبب الحالة / رأي العميل - بيجي من أي حقل من دول
        let statusReason = s.statusReason || s.statusNote || s.returnReason || s.rejectReason || s.deliveryNote || s.customerFeedback || s.customerOpinion || '';
        let statusLabel = s.status || 'جديدة';
        let isReturned = statusLabel.includes('مرتجع') || statusLabel.includes('رفض') || statusLabel.includes('رفض الاستلام') || statusLabel.includes('ملغي');
        let isDelivered = statusLabel.includes('تم التسليم');

        rowsHTML += `
            <tr onclick="openShipmentDetailsModal('${s.id || s._id}')" class="hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer" title="انقر لعرض تفاصيل الشحنة">
                <td class="py-3 px-4 font-mono font-bold text-slate-800 text-xs">${s.code || s.id || s._id}<br><span class="text-[10px] text-slate-400">${s.date || ''}</span></td>
                <td class="py-3 px-4 font-bold text-slate-700 text-xs">${s.merchant || '-'}</td>
                <td class="py-3 px-4">
                    <div class="font-bold text-slate-900 text-xs">${s.customer || s.recipientName || '-'}</div>
                    <div class="text-[11px] text-slate-500">
                        📞 ${s.phone || s.customerPhone || '-'} | 📍 ${s.city || 'القاهرة'}${s.region ? ' - ' + s.region : ''}
                    </div>
                    <div class="text-[11px] text-slate-700 font-semibold">${detailedAddr || '-'}</div>
                </td>
                <td class="py-3 px-4 font-black text-emerald-600 text-xs">${amountVal} ج.م</td>
                <td class="py-3 px-4 font-semibold text-slate-700 text-xs">${mShip} ج.م</td>
                <td class="py-3 px-4 max-w-[150px]"><div class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">${notesVal}</div></td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isDelivered ? 'bg-emerald-100 text-emerald-700' : isReturned ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                        ${statusLabel}
                    </span>
                    ${statusReason ? `<div class="text-[11px] mt-1 ${isReturned ? 'text-rose-600 font-bold' : isDelivered ? 'text-emerald-700' : 'text-slate-600'}">${isReturned ? 'السبب: ' : isDelivered ? 'رأي العميل: ' : 'ملاحظة الحالة: '}${statusReason}</div>` : `<div class="text-[10px] text-slate-400 mt-1">- لا يوجد سبب مسجل -</div>`}
                </td>
                <td class="py-3 px-4 text-center space-x-1 space-x-reverse">
                    <button onclick="event.stopPropagation(); openEditShipmentModal('${s.id || s._id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="تعديل الشحنة"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="event.stopPropagation(); openWaybillModal('${s.id || s._id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="طباعة البوليصة"><i class="fa-solid fa-print"></i></button>
                    <button onclick="event.stopPropagation(); openTrackingModal('${s.id || s._id}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="تتبع خط سير الشحنة"><i class="fa-solid fa-map-location-dot"></i></button>
                    <button onclick="event.stopPropagation(); openCourierMapModal()" class="bg-amber-50 hover:bg-amber-100 text-amber-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="خريطة المندوب"><i class="fa-solid fa-satellite-dish"></i></button>
                    ${(currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')) ? `<button onclick="event.stopPropagation(); requestDeleteShipment('${s.id || s._id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="حذف الأوردر"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `;
    }

    tbody.innerHTML = rowsHTML;
}

window.renderShipmentsTable = renderShipmentsTable;
window.handleSavePricingRate = handleSavePricingRate;

// دالة فتح تفاصيل الشحنة والأوردر عند النقر عليه - نسخة دورة الشحنة الكاملة
window.openShipmentDetailsModal = function(waybillId) {
    const shipments = appData.shipments || [];
    const shipment = shipments.find(s => (s.waybill === waybillId || s.id == waybillId));
    if (!shipment) {
        showNotification("عذراً، بيانات الشحنة غير متوفرة", "error");
        return;
    }

    let modalId = 'shipmentDetailsModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    let detailedAddr = shipment.address || shipment.detailedAddress || shipment.newDetailedAddress || '-';
    let regionVal = shipment.region || shipment.area || shipment.zone || '-';
    let notesVal = shipment.notes || shipment.note || shipment.remarks || '-';
    let statusReason = shipment.statusReason || shipment.statusNote || shipment.returnReason || shipment.rejectReason || shipment.deliveryNote || shipment.customerFeedback || shipment.customerOpinion || '';
    let curStatus = shipment.status || 'قيد الدفع والتوصيل';
    let isReturned = curStatus.includes('مرتجع') || curStatus.includes('رفض') || curStatus.includes('ملغي');
    let isDelivered = curStatus.includes('تم التسليم');

    // ===== helpers =====
    const fmt = (v) => v ? v : '—';
    const fmtDate = (v) => {
        if (!v) return '—';
        try { return new Date(v).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }); } catch(e){ return v; }
    };
    const who = (v, fallback) => v || fallback || 'النظام / الإدارة';
    const money = (v) => (Number(v || 0)).toLocaleString('ar-EG') + ' ج.م';

    // ===== المحاولات =====
    // لو عندك history هنطلع المحاولات منه، لو لا هنبنيها من الحقول القديمة
    let history = shipment.history || shipment.logs || shipment.timeline || [];
    let attempts = shipment.attempts || [];
    if (!attempts.length && history.length) {
        attempts = history.filter(h => (h.type === 'attempt' || (h.status && h.status.includes('محاولة')) || h.action === 'attempt')).map((h,i)=>({
            n: i+1, date: h.date || h.at || h.createdAt, status: h.status || h.to || h.action, note: h.note || h.reason || h.statusNote || ''
        }));
    }
    // fallback: لو مفيش attempts بس فيه محاولة واحدة مسجلة في الحالة
    if (!attempts.length && shipment.attemptCount) {
        attempts = [{ n: 1, date: shipment.lastAttemptAt || shipment.deliveryDate, status: curStatus, note: statusReason }];
    }
    const attemptsCount = attempts.length || shipment.attemptCount || shipment.tries || 0;

    // ===== دورة الشحنة - Timeline =====
    // بنبنيها من الحقول اللي عندك، ولو history موجود بنكمله بيه
    const steps = [
        { label: 'إنشاء الشحنة / إسناد للتطبيق', date: shipment.date || shipment.createdAt || shipment.addedAt, who: who(shipment.addedBy || shipment.creator, 'الإدارة'), done: !!(shipment.date || shipment.createdAt), icon: 'fa-file-circle-plus', desc: 'اتعملت واتسندت للتطبيق' },
        { label: 'اعتماد الشحنة / إسناد للمندوب', date: shipment.approvedAt || shipment.assignedAt || shipment.courierAssignedAt, who: who(shipment.approvedBy || shipment.assignedBy, 'الإدارة'), done: !!(shipment.courier || shipment.approvedAt || shipment.assignedAt), icon: 'fa-user-check', desc: shipment.courier ? `اتسندت للمندوب: ${shipment.courier}` : 'لسه متسندتش لمندوب' },
        { label: 'استلام المندوب للشحنة', date: shipment.courierReceivedAt || shipment.courierPickupAt || shipment.assignedAt, who: shipment.courier || 'بدون مندوب', done: !!(shipment.courierReceivedAt || shipment.courierPickupAt || shipment.courier), icon: 'fa-truck-fast', desc: shipment.courier ? `المندوب ${shipment.courier} استلمها` : 'المندوب لسه مستلمش' },
        { label: `المحاولات (${attemptsCount})`, date: shipment.lastAttemptAt || (attempts.length ? attempts[attempts.length-1].date : null), who: shipment.courier || 'المندوب', done: attemptsCount > 0, icon: 'fa-phone', desc: attemptsCount > 0 ? `اتحاول عليها ${attemptsCount} مرة` : 'مفيش محاولات مسجلة' },
        { label: isReturned ? 'مرتجع / رفض الاستلام' : 'تم التسليم', date: isReturned ? (shipment.returnDate || shipment.returnedAt || shipment.courierReturnedAt) : shipment.deliveryDate, who: shipment.courier || 'المندوب', done: !!(isReturned || isDelivered), icon: isReturned ? 'fa-rotate-left' : 'fa-circle-check', desc: isReturned ? (shipment.returnReason || statusReason || 'مرتجع') : (shipment.deliveryDate ? `اتسلمت - ${shipment.paymentMethod || shipment.payMethod || 'طريقة التحصيل غير مسجلة'}` : 'لسه متسلمتش') },
        { label: 'تسليم المندوب للشركة (المخزن)', date: shipment.courierReturnedAt || shipment.warehouseReceivedAt || shipment.returnToWarehouseAt, who: shipment.courier || 'المندوب', done: !!(shipment.courierReturnedAt || shipment.warehouseReceivedAt || shipment.warehouseApprovedAt), icon: 'fa-warehouse', desc: 'المندوب سلم المرتجع للمخزن' },
        { label: 'اعتماد المرتجع في المخزن', date: shipment.warehouseApprovedAt || shipment.returnApprovedAt, who: who(shipment.warehouseApprovedBy || shipment.returnApprovedBy, ''), done: !!(shipment.warehouseApprovedAt || shipment.returnApprovedAt || shipment.warehouseApproved), icon: 'fa-stamp', desc: shipment.warehouseApproved ? 'تم اعتماد المرتجع' : 'لسه متعتمدش في المخزن' },
        { label: 'تسليم المرتجع للتاجر', date: shipment.merchantHandoverAt || shipment.deliveredToMerchantAt || shipment.returnToMerchantAt, who: who(shipment.merchantHandoverBy || shipment.returnedToMerchantBy, ''), done: !!(shipment.merchantHandoverAt || shipment.deliveredToMerchantAt), icon: 'fa-store', desc: 'اتسلمت للتاجر' },
        { label: 'اعتماد استلام التاجر', date: shipment.merchantReceivedAt || shipment.merchantApprovedAt, who: who(shipment.merchantReceivedBy || shipment.merchantApprovedBy, 'التاجر'), done: !!(shipment.merchantReceivedAt || shipment.merchantApprovedAt || shipment.merchantConfirmed), icon: 'fa-handshake', desc: 'التاجر أكد استلام المرتجع' },
    ];

    const timelineHTML = steps.map((st, i) => `
        <div class="flex gap-3 relative">
            ${i < steps.length-1 ? `<div class="absolute right-[13px] top-7 bottom-0 w-0.5 ${st.done ? 'bg-emerald-300' : 'bg-slate-200'}"></div>` : ''}
            <div class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] z-10 ${st.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}">
                <i class="fa-solid ${st.done ? 'fa-check' : st.icon}"></i>
            </div>
            <div class="flex-1 pb-4 ${st.done ? '' : 'opacity-50'}">
                <div class="flex justify-between items-start gap-2">
                    <span class="font-bold text-slate-800">${st.label}</span>
                    <span class="text-[10px] text-slate-400 whitespace-nowrap">${st.date ? fmtDate(st.date) : 'لم يحدث بعد'}</span>
                </div>
                <div class="text-slate-500 mt-0.5">${st.desc} • <b class="text-slate-700">${st.who}</b></div>
            </div>
        </div>
    `).join('');

    const attemptsHTML = attempts.length ? attempts.map(a => `
        <div class="flex justify-between items-center bg-white border rounded-xl px-3 py-2">
            <span class="font-bold">محاولة ${a.n}</span>
            <span class="text-slate-500">${fmtDate(a.date)}</span>
            <span class="font-bold text-amber-700">${a.status || '-'}</span>
            <span class="text-slate-600 flex-1 text-right mr-2">${a.note || ''}</span>
        </div>
    `).join('') : `<div class="text-center text-slate-400 py-2">لا توجد محاولات مسجلة - هيتحسب من أول تغيير حالة بعد كده</div>`;

    // ===== الفلوس والخصم =====
    const payMethod = shipment.paymentMethod || shipment.payMethod || shipment.collectionMethod || (isDelivered ? 'غير مسجل' : '-');
    const hasDeduction = Number(shipment.deduction || shipment.discount || shipment.penalty || 0) > 0;
    const deductionAmt = Number(shipment.deduction || shipment.discount || shipment.penalty || 0);
    const deductionReason = shipment.deductionReason || shipment.deductionNote || '';

    const modalHTML = `
        <div id="${modalId}" class="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border max-h-[90vh] overflow-y-auto text-xs">
                
                <div class="flex justify-between items-center border-b pb-3">
                    <div class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <i class="fa-solid fa-file-invoice text-safira-600"></i> تفاصيل الشحنة رقم: <span class="text-safira-600">${shipment.waybill || shipment.code || shipment.id || '-'}</span>
                        <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">${attemptsCount ? `عدد المحاولات: ${attemptsCount}` : 'بدون محاولات'}</span>
                    </div>
                    <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-slate-600 text-lg"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">اسم العميل</span><span class="font-bold text-slate-800 text-sm">${shipment.customer || shipment.clientName || 'غير محدد'}</span></div>
                    <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">رقم الهاتف</span><span class="font-bold text-slate-800 text-sm" dir="ltr">${shipment.phone || shipment.clientPhone || 'غير محدد'}</span></div>
                    <div class="bg-slate-50 p-3 rounded-xl border col-span-2"><span class="text-slate-400 block mb-1">المحافظة / المنطقة</span><span class="font-bold text-slate-800">${shipment.city || '-'} - ${regionVal}</span><span class="text-slate-400 block mt-1">العنوان التفصيلي</span><span class="font-bold text-slate-800">${detailedAddr}</span></div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-amber-50 p-3 rounded-xl border border-amber-200"><span class="text-amber-700 block mb-1">التاجر / المتجر</span><span class="font-bold text-slate-800">${shipment.customMerchant || shipment.merchant || 'غير محدد'}</span></div>
                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-200"><span class="text-blue-700 block mb-1">تمت الإضافة بواسطة</span><span class="font-bold text-slate-800">${shipment.addedBy || shipment.creator || 'النظام / الإدارة'}</span></div>
                </div>

                <div class="bg-amber-50 p-3 rounded-xl border border-amber-200"><span class="text-amber-700 block mb-1 font-bold">📝 ملاحظات الشحنة</span><span class="font-bold text-slate-800">${notesVal}</span></div>

                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">حالة الشحنة</span><span class="font-bold text-safira-600">${curStatus}</span></div>
                    <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">تاريخ ووقت الإضافة</span><span class="font-bold text-slate-800">${shipment.date || shipment.createdAt || 'وقت سابق'}</span></div>
                    <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">تاريخ التسليم والمندوب</span><span class="font-bold text-slate-800">${shipment.deliveryDate || 'لم تسلم بعد'} (${shipment.courier || 'بدون مندوب'})</span></div>
                </div>

                <div class="bg-slate-50 p-3 rounded-xl border"><span class="text-slate-400 block mb-1">${isReturned ? '❌ سبب المرتجع / الرفض' : isDelivered ? '⭐ رأي العميل' : '💬 ملاحظة الحالة'}</span><span class="font-bold ${isReturned ? 'text-rose-600' : isDelivered ? 'text-emerald-700' : 'text-slate-800'}">${statusReason || '- لا يوجد سبب مسجل -'}</span></div>

                <!-- ===== دورة الشحنة الكاملة ===== -->
                <div class="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div class="font-bold text-slate-800 text-sm flex justify-between"><span>🛣️ دورة الشحنة الكاملة</span><span class="text-[10px] font-normal text-slate-400">من الإنشاء حتى استلام التاجر</span></div>
                    <div class="pt-2">${timelineHTML}</div>
                </div>

                <!-- ===== المحاولات ===== -->
                <div class="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 space-y-2">
                    <div class="font-bold text-amber-800 text-sm">📞 المحاولات - عدد المحاولات: ${attemptsCount} | عدد الحالات: ${history.length || 1}</div>
                    ${attemptsHTML}
                </div>

                <!-- ===== تغيير الحالة + سبب الحالة ===== -->
                <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-3">
                    <div class="font-bold text-indigo-800 text-sm">🔄 تغيير حالة الشحنة</div>
                    <div><label class="block text-slate-500 mb-1">الحالة الجديدة</label>
                        <select id="statusSelect-${modalId}" onchange="updateStatusReasonLabel('${modalId}')" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800">
                            <option value="جديدة" ${curStatus==='جديدة'?'selected':''}>جديدة</option>
                            <option value="قيد الانتظار" ${curStatus==='قيد الانتظار'?'selected':''}>قيد الانتظار</option>
                            <option value="مع المندوب" ${curStatus==='مع المندوب'?'selected':''}>مع المندوب</option>
                            <option value="جاري التوصيل" ${curStatus==='جاري التوصيل'?'selected':''}>جاري التوصيل</option>
                            <option value="تم التسليم" ${curStatus==='تم التسليم'?'selected':''}>تم التسليم</option>
                            <option value="مرتجع" ${curStatus==='مرتجع'?'selected':''}>مرتجع</option>
                            <option value="رفض الاستلام" ${curStatus==='رفض الاستلام'?'selected':''}>رفض الاستلام</option>
                            <option value="ملغي" ${curStatus==='ملغي'?'selected':''}>ملغي</option>
                        </select>
                    </div>
                    <div><label id="statusReasonLabel-${modalId}" class="block text-slate-500 mb-1">${isDelivered ? 'رأي العميل (ايه رأيه في المنتج / الخدمة؟)' : isReturned ? 'سبب المرتجع / الرفض (ليه رجع؟)' : 'ملاحظة الحالة / سبب التغيير'}</label>
                        <textarea id="statusReasonInput-${modalId}" rows="2" placeholder="${isDelivered ? 'مثال: عجبه المنتج، عايز يطلب تاني...' : isReturned ? 'مثال: العميل مش بيرد، العنوان غلط، رفض يدفع...' : 'اكتب سبب تغيير الحالة...'}" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800">${statusReason}</textarea>
                    </div>
                    ${isDelivered ? `
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-slate-500 mb-1">طريقة التحصيل</label>
                            <select id="payMethod-${modalId}" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold">
                                <option value="">اختر...</option>
                                <option value="نقدي" ${payMethod==='نقدي'?'selected':''}>نقدي</option>
                                <option value="انستا باي" ${payMethod.includes('انستا')?'selected':''}>انستا باي</option>
                                <option value="محفظة" ${payMethod==='محفظة'?'selected':''}>محفظة</option>
                            </select>
                        </div>
                        <div><label class="block text-slate-500 mb-1">خصم على التاجر (لو فيه)</label>
                            <input id="deduction-${modalId}" type="number" value="${deductionAmt}" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold" placeholder="0" />
                        </div>
                    </div>` : ''}
                    <button onclick="saveShipmentStatusWithReason('${shipment.id || shipment._id}', '${modalId}')" class="w-full bg-safira-600 hover:bg-safira-700 text-white font-bold py-2.5 rounded-xl transition">حفظ الحالة + السبب</button>
                    <div class="text-[10px] text-slate-400 text-center">حفظ الحالة هيسجل تلقائي في دورة الشحنة: التاريخ + مين + من ايه لـ ايه</div>
                </div>

                <!-- ===== الأسعار + التحصيل + الخصم ===== -->
                <div class="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 grid grid-cols-3 gap-3 text-center">
                    <div><span class="text-slate-500 block text-[10px]">مبلغ الشحنة المطلوبة</span><span class="font-bold text-emerald-700 text-sm">${shipment.amount || shipment.cod || shipment.total || 0} ج.م</span><span class="block text-[10px] text-slate-500 mt-1">طريقة التحصيل: <b class="text-slate-800">${payMethod}</b></span></div>
                    <div><span class="text-slate-500 block text-[10px]">شحن التاجر</span><span class="font-bold text-blue-700 text-sm">${shipment.ship || shipment.mShip || shipment.shippingFee || 0} ج.م</span><span class="block text-[10px] mt-1 ${hasDeduction ? 'text-rose-600 font-bold' : 'text-slate-400'}">${hasDeduction ? `اتخصم: ${money(deductionAmt)}` : 'مفيش خصم'}</span></div>
                    <div><span class="text-slate-500 block text-[10px]">صافي مستحق التاجر</span><span class="font-bold text-slate-800 text-sm">${(Number(shipment.amount || shipment.cod || shipment.total || 0) - Number(shipment.ship || shipment.mShip || 0) - deductionAmt)} ج.م</span><span class="block text-[10px] text-slate-500 mt-1">${deductionReason ? `سبب الخصم: ${deductionReason}` : ''}</span></div>
                </div>

                <div class="flex justify-end pt-2"><button onclick="document.getElementById('${modalId}').remove()" class="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">إغلاق</button></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// يغير لابل خانة السبب حسب الحالة المختارة
window.updateStatusReasonLabel = function(modalId) {
    const sel = document.getElementById('statusSelect-' + modalId);
    const label = document.getElementById('statusReasonLabel-' + modalId);
    const input = document.getElementById('statusReasonInput-' + modalId);
    if (!sel || !label || !input) return;
    const v = sel.value;
    if (v === 'تم التسليم') {
        label.innerText = 'رأي العميل (ايه رأيه في المنتج / الخدمة؟)';
        input.placeholder = 'مثال: عجبه المنتج، عايز يطلب تاني...';
    } else if (v === 'مرتجع' || v === 'رفض الاستلام' || v === 'ملغي') {
        label.innerText = 'سبب المرتجع / الرفض (ليه رجع؟)';
        input.placeholder = 'مثال: العميل مش بيرد، العنوان غلط، رفض يدفع...';
    } else {
        label.innerText = 'ملاحظة الحالة / سبب التغيير';
        input.placeholder = 'اكتب سبب تغيير الحالة...';
    }
};

// حفظ الحالة + السبب
window.saveShipmentStatusWithReason = async function(shipmentId, modalId) {
    const sel = document.getElementById('statusSelect-' + modalId);
    const reasonInput = document.getElementById('statusReasonInput-' + modalId);
    if (!sel) return;
    const newStatus = sel.value;
    const reason = reasonInput ? reasonInput.value.trim() : '';
    if ((newStatus === 'مرتجع' || newStatus === 'رفض الاستلام' || newStatus === 'ملغي') && !reason) {
        showNotification('لازم تكتب سبب المرتجع / الرفض', 'error');
        return;
    }
    const s = (appData.shipments || []).find(x => (x.id == shipmentId || x._id == shipmentId));
    if (!s) return;
    s.status = newStatus;
    s.statusReason = reason;
    s.statusNote = reason;
    if (newStatus === 'مرتجع' || newStatus === 'رفض الاستلام') s.returnReason = reason;
    if (newStatus === 'تم التسليم') { s.customerFeedback = reason; s.customerOpinion = reason; s.deliveryNote = reason; s.deliveryDate = new Date().toLocaleString('ar-EG'); }
    // حفظ سحابي لو موجود
    try {
        if (typeof API_BASE_URL !== 'undefined') {
            await fetch(`${API_BASE_URL}/shipments/${s._id || s.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(s) });
        }
    } catch(e) {}
    try { localStorage.setItem('safira_app_data', JSON.stringify(appData)); } catch(e) {}
    document.getElementById(modalId).remove();
    if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
    if (typeof renderLogisticDistributionTable === 'function') renderLogisticDistributionTable();
    showNotification('تم تحديث الحالة + السبب بنجاح', 'success');
};

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

    // ظبط الـ thead اوتوماتيك - 8 اعمدة
    let tableEl = tbody.closest('table');
    if (tableEl) {
      let theadEl = tableEl.querySelector('thead');
      if (!theadEl) {
        theadEl = document.createElement('thead');
        tableEl.prepend(theadEl);
      }
      theadEl.innerHTML = `
        <tr class="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
          <th class="p-3">رقم الشحنة والتاريخ</th>
          <th class="p-3">التاجر</th>
          <th class="p-3">العميل والمحافظة / العنوان التفصيلي</th>
          <th class="p-3">المبلغ المطلوب</th>
          <th class="p-3">شحن التاجر</th>
          <th class="p-3">الملاحظات</th>
          <th class="p-3">الحالة / سبب الحالة</th>
          <th class="p-3 text-center">إجراءات</th>
        </tr>`;
    }

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-400">لا توجد شحنات مطابقة للبحث</td></tr>`;
        return;
    }
    tbody.innerHTML = shipments.map(s => {
        let amountVal = s.amount || s.cod || s.cost || s.total || 0;
        let detailedAddr = s.address || s.detailedAddress || s.newDetailedAddress || '';
        let notesVal = s.notes || s.note || s.remarks || '-';
        let statusReason = s.statusReason || s.statusNote || s.returnReason || s.rejectReason || s.deliveryNote || s.customerFeedback || s.customerOpinion || '';
        let statusLabel = s.status || 'قيد الانتظار';
        let isReturned = statusLabel.includes('مرتجع') || statusLabel.includes('رفض') || statusLabel.includes('ملغي');
        let isDelivered = statusLabel.includes('تم التسليم');
        return `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-mono font-bold text-slate-800">${s.code || s.id || s._id}<br><span class="text-[10px] text-slate-400">${s.date || ''}</span></td>
            <td class="py-3 px-4 font-bold text-slate-700">${s.merchant || '-'}</td>
            <td class="py-3 px-4">
              <div class="font-bold text-slate-900 text-xs">${s.customer || s.recipientName || '-'} (${s.phone || '-'})</div>
              <div class="text-[11px] text-slate-500">📍 ${s.city || 'القاهرة'}${s.region ? ' - ' + s.region : ''}</div>
              <div class="text-[11px] text-slate-700 font-semibold">${detailedAddr || '-'}</div>
            </td>
            <td class="py-3 px-4 font-black text-emerald-600">${amountVal} ج.م</td>
            <td class="py-3 px-4 text-slate-600">${s.mShip || s.shippingFee || 0} ج.م</td>
            <td class="py-3 px-4 max-w-[150px]"><div class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">${notesVal}</div></td>
            <td class="py-3 px-4">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isDelivered ? 'bg-emerald-100 text-emerald-700' : isReturned ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${statusLabel}</span>
              ${statusReason ? `<div class="text-[11px] mt-1 ${isReturned ? 'text-rose-600 font-bold' : isDelivered ? 'text-emerald-700' : 'text-slate-600'}">${isReturned ? 'السبب: ' : isDelivered ? 'رأي العميل: ' : 'ملاحظة الحالة: '}${statusReason}</div>` : `<div class="text-[10px] text-slate-400 mt-1">- لا يوجد سبب مسجل -</div>`}
            </td>
            <td class="py-3 px-4 text-center"><button onclick="requestDeleteShipment('${s.id || s._id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px]"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `;
    }).join('');
}

function attachAuditMetadata(obj) {
    obj.addedBy = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || currentUser.username || 'مؤمن') : 'مدير النظام';
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
// دالة البحث الذكي المحدثة (للتجار والمناديب بدقة تامة)
// ==========================================
function getRatesForLocation(city, region) {
    let merchantPrice = 0;
    let courierPrice = 0;

    try {
        // محاولة جلب البيانات من appData أو التخزين المحلي مباشرة
        const data = (typeof window.appData !== 'undefined' && window.appData) ? window.appData : getData();
        const merchantRates = data.rates || [];
        const courierRates = data.courierRates || [];

        const cTrim = city ? city.trim().toLowerCase() : '';
        const rTrim = region ? region.trim().toLowerCase() : '';

        // 1. البحث عن سعر التاجر (بالمحافظة والمنطقة معاً أولاً)
        let mMatch = merchantRates.find(r => 
            r.city && r.city.trim().toLowerCase() === cTrim && 
            r.region && r.region.trim().toLowerCase() === rTrim
        );
        // لو مشمولة بالمحافظة فقط أو "عام للمحافظة"
        if (!mMatch) {
            mMatch = merchantRates.find(r => 
                r.city && r.city.trim().toLowerCase() === cTrim && 
                (!r.region || r.region === 'عام للمحافظة' || r.region.trim() === '')
            );
        }
        if (mMatch) merchantPrice = parseFloat(mMatch.price) || 0;

        // 2. البحث عن عمولة المندوب (بالمحافظة والمنطقة معاً أولاً)
        let cMatch = courierRates.find(r => 
            r.city && r.city.trim().toLowerCase() === cTrim && 
            r.region && r.region.trim().toLowerCase() === rTrim
        );
        // لو مشمولة بالمحافظة فقط أو "عام للمحافظة"
        if (!cMatch) {
            cMatch = courierRates.find(r => 
                r.city && r.city.trim().toLowerCase() === cTrim && 
                (!r.region || r.region === 'عام للمحافظة' || r.region.trim() === '')
            );
        }
        if (cMatch) courierPrice = parseFloat(cMatch.price) || 0;

    } catch (err) {
        console.error("خطأ في جلب الأسعار:", err);
    }

    return { merchantPrice, courierPrice };
}

// ==========================================
// استيراد الإكسيل بقراءة دقيقة للمنطقة والأسعار
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

            for (const row of jsonData) {
                let merchantVal = '';
                let nameVal = '';
                let phoneVal = '';
                let cityVal = '';
                let regionVal = '';
                let addressVal = '';
                let costVal = 0;
                let statusVal = 'جديدة';
                let dateVal = new Date().toISOString().split('T')[0];

                // فحص كل عمود في الإكسيل بمرونة تامة
                for (const rawKey of Object.keys(row)) {
                    const key = rawKey.trim().toLowerCase();
                    const val = row[rawKey];
                    if (val === undefined || val === null) continue;

                    const strVal = String(val).trim();

                    if (key.includes('تاجر') || key.includes('التاجر')) {
                        merchantVal = strVal;
                    } else if (key.includes('اسم العميل') || key.includes('الاسم') || key.includes('عميل')) {
                        nameVal = strVal;
                    } else if (key.includes('هاتف') || key.includes('موبايل') || key.includes('رقم')) {
                        phoneVal = strVal;
                    } else if (key.includes('محافظة') || key.includes('مدينة')) {
                        cityVal = strVal;
                    } else if (key.includes('منطقة') || key.includes('الحي') || key.includes('المنطقة')) {
                        regionVal = strVal;
                    } else if (key.includes('عنوان') || key.includes('التفصيلي')) {
                        addressVal = strVal;
                    } else if (key.includes('مبلغ') || key.includes('إجمالي') || key.includes('سعر مطلوب')) {
                        costVal = parseFloat(val) || 0;
                    } else if (key.includes('حالة')) {
                        statusVal = strVal;
                    } else if (key.includes('تاريخ')) {
                        dateVal = strVal;
                    }
                }

                // سحب السعر والعمولة أوتوماتيك بناءً على المحافظة والمنطقة معاً
                const computedRates = getRatesForLocation(cityVal, regionVal);
                let mShipVal = computedRates.merchantPrice;
                let courierFeeVal = computedRates.courierPrice;

                const generatedId = `SAF-${Math.floor(100000 + Math.random() * 900000)}`;

                const newShipment = {
                    id: generatedId,
                    code: generatedId,
                    merchant: merchantVal || (currentUser ? currentUser.name : 'تاجر عام'),
                    recipientName: nameVal || 'عميل بدون اسم',
                    customer: nameVal || 'عميل بدون اسم',
                    phone: phoneVal,
                    city: cityVal,
                    region: regionVal || 'عام للمحافظة',
                    address: addressVal,
                    amount: costVal,
                    mShip: mShipVal,         
                    cShip: courierFeeVal, // تم توحيدها لتطابق العرض في الجدول
                    status: statusVal,
                    date: dateVal
                };

                if (!appData.shipments) appData.shipments = [];
                appData.shipments.unshift(newShipment);
                importedShipments.push(newShipment);
            }

            if (typeof renderOverviewStats === 'function') renderOverviewStats();
            if (typeof renderShipmentsTable === 'function') renderShipmentsTable();

            // حفظ في قاعدة البيانات سحابياً وتحديث الجدول فوراً
            try {
                await fetch(`${API_BASE_URL}/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipments: importedShipments })
                });
            } catch (apiErr) {
                console.error("Sync API Error:", apiErr);
            }

            try {
                await saveData(appData);
                if (typeof renderShipmentsTable === 'function') {
                    await renderShipmentsTable();
                }
                
                showNotification(`تم استيراد ${importedShipments.length} شحنة بنجاح وربط الأسعار والمناديب 🚀`, "success");
                event.target.value = '';
            } catch (err) {
                console.error("Save Data Error:", err);
                showNotification("حدث خطأ أثناء حفظ البيانات", "error");
            }

        } catch (err) {
            console.error("Excel Parse Error:", err);
            showNotification("حدث خطأ أثناء قراءة ملف الإكسيل", "error");
        }
    };
    reader.readAsArrayBuffer(file);
}
window.handleExcelUpload = handleExcelUpload;

            
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

// ==========================================
// لوحة التوزيع اللوجستي وشحن المناديب (مظبوط)
// ==========================================
function renderLogisticDistributionTable() {
  const tableBody = document.getElementById('logistic-distribution-table-body') 
                 || document.getElementById('logisticDistributionTableBody');
  if (!tableBody) return;

  // 1. التوزيع = بس الشحنات اللي لسه متوزعتش، مش المرتجع ولا الملغي ولا اللي مع المندوب
  const activeShipments = (appData.shipments || []).filter(s => {
    const st = String(s.status || '').trim();
    if (st === 'مرتجع' || st === 'رفض الاستلام' || st === 'ملغي' || st === 'تم التسليم' || st === 'تم الاعتماد') return false;
    if (st === 'مع المندوب' || st === 'with-courier' || st === 'جاري التوصيل') return false;
    if (s.courierAssigned || s.courier || s.deliveryAgent) return false;
    return true;
  });

  if (activeShipments.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-8">لا توجد شحنات متاحة في المخزون للتوزيع اللوجستي حالياً</td></tr>';
    const c = document.getElementById('statTotalCount');
    const a = document.getElementById('statTotalAmount');
    if (c) c.innerText = '0';
    if (a) a.innerText = '0 ج.م';
    if (typeof updateSelectionStats === 'function') updateSelectionStats();
    return;
  }

  let totalAmt = activeShipments.reduce((sum, s) => sum + (parseFloat(s.amount || s.cod || s.cost || s.total) || 0), 0);
  const c2 = document.getElementById('statTotalCount');
  const a2 = document.getElementById('statTotalAmount');
  if (c2) c2.innerText = activeShipments.length;
  if (a2) a2.innerText = totalAmt.toLocaleString() + ' ج.م';
    
  const courierSelect = document.getElementById('bulkCourierSelect');
  if (courierSelect && appData.couriers) {
    courierSelect.innerHTML = `<option value="">اختر المندوب للتحويل الجماعي...</option>` + 
      appData.couriers.map(c => `<option value="${c.name}">${c.name} (${c.phone || ''})</option>`).join('');
  }

  tableBody.innerHTML = activeShipments.map(s => {
    const sid = s.id || s._id || s.waybill;
    const waybill = s.waybill || s.code || s.id || s._id || '-';
    const addedTime = s.addedAt ? new Date(s.addedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : (s.date || 'اليوم');
    const addedByWho = s.addedBy || 'التاجر / الإدارة';
    const detailedAddr = s.address || s.detailedAddress || s.newDetailedAddress || '-';
    const notesVal = s.notes || s.note || s.remarks || '-';
    // شحن التاجر: جرب كل الاسماء المحتملة عشان ميطلعش فاضي
    const mShipVal = s.mShip ?? s.shippingFee ?? s.shippingCost ?? s.merchantShipping ?? s.shipCost ?? 50;
    const amountVal = s.amount || s.cod || s.cost || s.total || 0;
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
        <td class="p-3 text-center"><input type="checkbox" class="shipment-row-checkbox" value="${sid}" onclick="updateSelectionStats()"></td>
        <td class="p-3 font-mono font-bold text-slate-800">
          ${waybill}
          <br><span class="text-[10px] text-slate-400">إضافة: ${addedTime}</span>
          <br><span class="text-[10px] text-indigo-600 font-semibold">بواسطة: ${addedByWho}</span>
        </td>
        <td class="p-3 font-bold text-slate-700">${s.merchant || s.store || '-'}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${s.customer || s.customerName || s.recipientName || '-'} (${s.phone || '-'})</div>
          <div class="text-[11px] text-slate-500">${s.city || s.governorate || '-'} - ${s.region || '-'}</div>
          <div class="text-[11px] text-slate-700 font-semibold">${detailedAddr}</div>
        </td>
        <td class="p-3 font-black text-emerald-600">${amountVal} ج.م</td>
        <td class="p-3 font-bold text-slate-700">${mShipVal} ج.م</td>
        <td class="p-3 max-w-[160px]"><div class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">${notesVal}</div></td>
        <td class="p-3">
          <select id="courier-assign-${sid}" class="bg-slate-50 border border-slate-300 rounded-lg text-xs p-1.5 font-bold text-slate-700 w-full">
            <option value="">اختر مندوب...</option>
            ${(appData.couriers || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </td>
        <td class="p-3 text-center">
          <button onclick="transferSingleShipment('${sid}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition">
            إسناد
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectionStats();
}
window.renderLogisticDistributionTable = renderLogisticDistributionTable;

window.toggleSelectAllShipments = function(masterCheckbox) {
    const checkboxes = document.querySelectorAll('#logisticDistributionTableBody input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.offsetParent !== null) {
            cb.checked = masterCheckbox.checked;
        }
    });
    
    // استدعاء دالة تحديث الإحصائيات فوراً لتحديث العدادات والمبلغ
    if (typeof updateSelectionStats === 'function') {
        updateSelectionStats();
    }
};
window.toggleSelectAllShipments = toggleSelectAllShipments;

// تحديث مؤشرات الشحنات المحددة (العدد والمبلغ) //
function updateSelectionStats() {
    const checkboxes = document.querySelectorAll('#logisticDistributionTableBody input[type="checkbox"]:checked');
    let selectedCount = checkboxes.length;
    let selectedAmount = 0;

    checkboxes.forEach(cb => {
        const sId = cb.value;
        const shipment = (appData.shipments || []).find(s => (s.id == sId || s._id == sId || s.waybill == sId));
        if (shipment) {
            selectedAmount += parseFloat(shipment.amount || shipment.cost || 0);
        }
    });

    const statCountEl = document.getElementById('statSelectedCount');
    const statAmountEl = document.getElementById('statSelectedAmount');

    if (statCountEl) statCountEl.innerText = selectedCount;
    if (statAmountEl) statAmountEl.innerText = selectedAmount.toLocaleString() + ' ج.م';
}
window.updateSelectionStats = updateSelectionStats;

async function transferSingleShipment(shipmentId) {
    const select = document.getElementById(`courier-assign-${shipmentId}`) || document.querySelector(`select[data-shipment-id="${shipmentId}"]`);
    const courierName = select ? select.value : '';
    if (!courierName) {
        showNotification("يرجى اختيار المندوب أولاً", "error");
        return;
    }

    const cleanId = String(shipmentId || '').trim();
    let shipment = (appData.shipments || []).find(s =>
        String(s.id).trim() === cleanId ||
        String(s._id).trim() === cleanId ||
        String(s.waybill).trim() === cleanId
    );
    if (!shipment) return;

    const oldStatus = shipment.status;
    const oldCourier = shipment.courierAssigned;

    shipment.courierAssigned = courierName;
    shipment.courier = courierName;
    shipment.deliveryAgent = courierName;
    shipment.status = 'مع المندوب';

    if (typeof renderLogisticDistributionTable === 'function') renderLogisticDistributionTable();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();

    // ده هو الحفظ السحابي الحقيقي - بيحفظ appData كله في main_sync عن طريق saveData الجديدة
    await saveData(appData);

    // تحديث زيادة لجدول shipments لوحده، بالاسم الصح اللي السيرفر مستنيه orderId
    try {
        const apiBase = window.API_URL || 'https://safira-logistic.vercel.app/api';
        await fetch(`${apiBase}/shipments-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: shipment.waybill || shipment.id || shipment._id,
                status: 'مع المندوب',
                location: courierName
            })
        });
    } catch (e) { console.log('status sync skip', e); }

    showNotification(`تم إسناد الشحنة إلى المندوب ${courierName} بنجاح`, "success");
}
window.transferSingleShipment = transferSingleShipment;


async function assignSingleCourier(shipmentId) {
    const selectElement = document.getElementById(`courier-assign-${shipmentId}`) || document.querySelector(`select[data-shipment-id="${shipmentId}"]`);
    const courierName = selectElement ? selectElement.value : '';

    if (!courierName) {
        showNotification("يرجى اختيار المندوب أولاً", "error");
        return;
    }

    const apiBase = window.API_URL || 'https://safira-logistic.vercel.app/api';
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';

    // 🚀 الحل الجذري: حذف الشحنة فوراً من مصفوفة العرض المحلية عشان تختفي من الجدول اللحظة دي
    if (appData && appData.shipments) {
        appData.shipments = appData.shipments.filter(s => 
            String(s.id || s._id || s.waybill || '').trim() !== String(shipmentId || '').trim()
        );
    }

    // إعادة رسم الجدول فوراً لتختفي الشحنة أمام عينك
    if (typeof renderLogisticDistributionTable === 'function') renderLogisticDistributionTable();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();

    showNotification(`تم إسناد الشحنة إلى المندوب ${courierName} بنجاح 🚀`, "success");

    // إرسال التحديث للسيرفر في الخلفية
    try {
        await fetch(`${apiBase}/shipments`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: shipmentId,
                _id: shipmentId,
                courierAssigned: courierName,
                courier: courierName,
                deliveryAgent: courierName,
                status: 'مع المندوب'
            })
        });
    } catch (e) {
        console.error("Assign error:", e);
    }
}
window.assignSingleCourier = assignSingleCourier;


async function bulkTransferToCourier() {
    const courierSelect = document.getElementById('bulkCourierSelect');
    const courierName = courierSelect ? courierSelect.value : '';

    if (!courierName) {
        showNotification("يرجى اختيار المندوب للتحويل الجماعي", "error");
        return;
    }

    const checkboxes = document.querySelectorAll('#logisticDistributionTableBody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification("يرجى تحديد شحنة واحدة على الأقل للتحويل", "error");
        return;
    }

    let count = 0;
    const apiBase = window.API_URL || 'https://safira-logistic.vercel.app/api';
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';

    for (let cb of checkboxes) {
        const sId = cb.value;
        let shipment = (appData.shipments || []).find(s => 
            String(s.id).trim() === String(sId).trim() || 
            String(s._id).trim() === String(sId).trim() || 
            String(s.waybill).trim() === String(sId).trim()
        );
        
        if (shipment) {
            shipment.courierAssigned = courierName;
            shipment.courier = courierName;
            shipment.deliveryAgent = courierName;
            shipment.status = 'مع المندوب';
            shipment.lastModifiedBy = (currentUser && currentUser.name) ? currentUser.name : 'مسؤول النظام';
            shipment.lastModifiedAt = new Date().toISOString();

            // إضافة الشحنة للقائمة السوداء والكاش المحلي
            const currentId = String(shipment.id || shipment._id || shipment.waybill || sId).trim();
            if (currentId) {
                if (!window.transferredShipmentsCache) window.transferredShipmentsCache = [];
                if (!window.transferredShipmentsCache.includes(currentId)) {
                    window.transferredShipmentsCache.push(currentId);
                    localStorage.setItem('safira_transferred_cache', JSON.stringify(window.transferredShipmentsCache));
                }
            }

            count++;

            try {
                await fetch(`${apiBase}/shipments`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: shipment._id || shipment.id || sId,
                        _id: shipment._id || shipment.id || sId,
                        waybill: shipment.waybill,
                        courierAssigned: courierName,
                        courier: courierName,
                        deliveryAgent: courierName,
                        status: 'مع المندوب'
                    })
                });
            } catch (e) {
                console.error("Cloud sync auth error:", e);
            }
        }
    }

    // تصفية وإزالة الشحنات المحولة من المصفوفة المحلية فوراً لتختفي من الجدول تماماً
    const transferredIds = Array.from(checkboxes).map(cb => String(cb.value).trim());
    if (appData && appData.shipments) {
        appData.shipments = appData.shipments.filter(s => {
            const sId = String(s.id || s._id || s.waybill || '').trim();
            return !transferredIds.includes(sId);
        });
    }

    // حفظ محلي وتحديث واجهة المخزن لتختفي الشحنات فوراً
    if (typeof saveData === 'function') {
        saveData(appData);
    } else {
        localStorage.setItem('safira_app_data', JSON.stringify(appData));
    }

    showNotification(`تم إسناد وتحويل ${count} شحنة إلى المندوب ${courierName} بنجاح 🚀`, "success");

    if (typeof refreshDistributionAndWarehouseUI === 'function') {
        refreshDistributionAndWarehouseUI();
    }
}
window.bulkTransferToCourier = bulkTransferToCourier;

// دالة منفصلة لتحديث واجهة الجداول وتصفية الشحنات المحولة لمنع التكرار
function refreshDistributionAndWarehouseUI() {
    const masterCb = document.getElementById('selectAllShipments');
    if (masterCb) masterCb.checked = false;

    if (typeof renderLogisticDistributionTable === 'function') {
        renderLogisticDistributionTable(); // ستستبعد تلقائياً الشحنات التي حالتها 'مع المندوب'
    }
    if (typeof renderWarehouseTables === 'function') {
        renderWarehouseTables();
    }
    if (typeof updateSelectionStats === 'function') {
        updateSelectionStats();
    }
}
window.bulkTransferToCourier = bulkTransferToCourier;


// تعريف دالة تنظيف البيانات لمنع بقاء الشحنات المحولة في جدول المخزن
function sanitizeShipmentsData() {
    if (!appData || !appData.shipments) return;
    
    appData.shipments = appData.shipments.map(s => {
        const status = (s.status || '').trim();
        const courier = s.courierAssigned || s.deliveryAgent || s.courier;
        
        if (courier && (!status || status === 'جديدة' || status === 'قيد الانتظار')) {
            s.status = 'مع المندوب';
        }
        return s;
    });
}
window.sanitizeShipmentsData = sanitizeShipmentsData;


// تصدير الشحنات المحددة إلى Excel
function exportSelectedShipmentsExcel() {
    const checkboxes = document.querySelectorAll('.shipment-checkbox:checked');
    if (checkboxes.length === 0) {
        showNotification("يرجى تحديد شحنات لتصديرها", "error");
        return;
    }

    let selectedShipments = [];
    checkboxes.forEach(cb => {
        const sId = cb.value;
        const shipment = (appData.shipments || []).find(s => (s.id === sId || s._id === sId));
        if (shipment) selectedShipments.push(shipment);
    });

    // تحويل البيانات لملف CSV / Excel بسيط ومباشر
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "رقم البوليصة,التاجر,العميل,الهاتف,المحافظة,المنطقة,المبلغ,تاريخ الإضافة,أضيف بواسطة\n";

    selectedShipments.forEach(s => {
        csvContent += `"${s.id || s._id}","${s.merchant || '-'}","${s.customer || s.recipientName || '-'}","${s.phone || '-'}","${s.city || '-'}","${s.region || s.address || '-'}","${s.amount || s.cost || 0}","${s.date || ''}","${s.addedBy || '-'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Safira_Shipments_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("تم تصدير الشحنات المحددة بنجاح 📊", "success");
}
window.exportSelectedShipmentsExcel = exportSelectedShipmentsExcel;


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
    
    // سحب اسم التاجر بطريقة ذكية (سواء من القائمة المسجلة أو خانة التاجر الخارجي)
    const merchant = getSelectedMerchantName();
    if (!merchant) {
        showNotification("يرجى اختيار أو كتابة اسم التاجر", "error");
        return;
    }

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

    // جلب سعر شحن التاجر وعمولة المندوب من الجداول السحابية مع بحث مرن
    const merchantRate = (appData.rates || []).find(r => r.city && r.city.trim().toLowerCase() === finalCity.trim().toLowerCase());
    const courierRate = (appData.courierRates || []).find(r => r.city && r.city.trim().toLowerCase() === finalCity.trim().toLowerCase());

    // أسعار افتراضية ذكية حسب المحافظة في حال عدم وجود تسعير مخصص في الإعدادات
    const isCairoGiza = finalCity.includes('القاهرة') || finalCity.includes('الجيزة');
    const defaultMerchantPrice = isCairoGiza ? 45 : 60;
    const defaultCourierPrice = isCairoGiza ? 30 : 40;

    // 2. بناء كائن الشحنة الجديد بالبيانات الدقيقة
    const newOrder = { 
        id: 'SAF-' + Math.floor(100000 + Math.random() * 900000), 
        merchant, 
        customer, 
        recipientName: customer,
        phone, 
        city: finalCity, 
        address: resolvedLocation.formattedAddress || address, 
        lat: resolvedLocation.lat || null, 
        lng: resolvedLocation.lng || null, 
        amount, 
        mShip: merchantRate ? Number(merchantRate.price) : defaultMerchantPrice, 
        cShip: courierRate ? Number(courierRate.price) : defaultCourierPrice,     
        status: "جديدة",
        warehouseReceived: false, 
        date: new Date().toISOString().split('T')[0]
    };

    if (!appData.shipments) appData.shipments = [];
    appData.shipments.unshift(newOrder);

    // 3. تخزين الأوردر في كارت الذاكرة الخاص بالتاجر لتتبع تاريخه وبياناته
    if (typeof recordMerchantShipmentToMemory === 'function') {
        recordMerchantShipmentToMemory(newOrder);
    }

    // إغلاق المودال وتحديث الواجهة بالكامل
    const modal = document.getElementById('newOrderModal');
    if (modal) {
        modal.classList.add('hidden');
        // تفريغ الحقول بعد الإغلاق
        const form = document.getElementById('saveNewOrderForm') || event.target;
        if (form) form.reset();
        const customInput = document.getElementById('customMerchantInput');
        if (customInput) customInput.classList.add('hidden');
    }
    
    if (typeof renderOverviewStats === 'function') renderOverviewStats();
    if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();

    showNotification("تم تصحيح العنوان عبر الخرائط وإضافة الشحنة بنجاح 🚀", "success");

    // 4. إرسال الأوردر للسيرفر سحابياً في الخلفية
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

// ربط الدالة بالنافذة العامة لضمان عملها مع الـ Form Onsubmit
window.saveNewOrder = saveNewOrder;

// دوال فتح وإغلاق نافذة إضافة أوردر جديد
function openNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) {
        modal.classList.remove('hidden');
        // تحديث القائمة المنسدلة للتاجر عند فتح النافذة لضمان ظهور أحدث التجار المسجلين
        if (typeof populateMerchantDropdowns === 'function') {
            populateMerchantDropdowns();
        }
    }
}
window.openNewOrderModal = openNewOrderModal;
window.openNewOrderModal = openNewOrderModal;

function closeNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.closeNewOrderModal = closeNewOrderModal;

async function getData() {
    const base = window.API_URL || window.API_BASE_URL || 'https://safira-logistic.vercel.app/api';
    // 1. اقرا المحلي الاول - ده اللي فيه اخر حاجة حفظتها انت
    let localData = { rates: [], courierRates: [], shipments: [] };
    try {
        const local = localStorage.getItem('app_shipping_data');
        if (local) localData = JSON.parse(local);
    } catch(e){}

    // 2. حاول تجيب السحابي
    try {
        const response = await fetch(`${base}/rates`);
        if (response.ok) {
            const result = await response.json();
            const serverData = {
                rates: result.rates || result.data?.rates || [],
                courierRates: result.courierRates || result.data?.courierRates || [],
                shipments: result.shipments || result.data?.shipments || []
            };
            // لو السيرفر فاضي والمحلي فيه بيانات - خد المحلي، متاخدش الفاضي
            if (serverData.rates.length === 0 && localData.rates?.length > 0) serverData.rates = localData.rates;
            if (serverData.courierRates.length === 0 && localData.courierRates?.length > 0) serverData.courierRates = localData.courierRates;
            if (serverData.shipments.length === 0 && localData.shipments?.length > 0) serverData.shipments = localData.shipments;

            // ادمج باقي الحقول من المحلي عشان getData كانت بتمسح كل حاجة تانية زي المناديب
            const merged = { ...localData, ...serverData };
            // لو السيرفر فيه شحنات اكتر خدها، لو المحلي فيه اسعار اكتر خدها
            if ((localData.rates?.length || 0) > (serverData.rates?.length || 0)) merged.rates = localData.rates;
            if ((localData.courierRates?.length || 0) > (serverData.courierRates?.length || 0)) merged.courierRates = localData.courierRates;

            window.appData = merged;
            return merged;
        }
    } catch (err) {
        console.error("خطأ في الجلب السحابي:", err);
    }
    
    // لو السيرفر مردش خالص - ارجع للمحلي
    window.appData = localData;
    return localData;
}
window.getData = getData;

async function saveData(data) {
  window.appData = data;
  try { localStorage.setItem('app_shipping_data', JSON.stringify(data)); } catch(e){}

  const apiBase = window.API_URL || window.API_BASE_URL || 'https://safira-logistic.vercel.app/api';
  try {
    const res = await fetch(`${apiBase}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) console.error('SYNC FAILED:', res.status);
    else console.log('SYNC OK - اتحفظ سحابي في main_sync');
  } catch (e) {
    console.error('Sync Error:', e);
  }

 try {
    await fetch(`${apiBase}/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates: data.rates || [], courierRates: data.courierRates || [] })
    });
  } catch(e){}
}
window.saveData = saveData;


// دالة عرض جدول أسعار التجار (تمت إضافتها لتجنب خطأ التوقف)
async function renderMerchantPricingTable() {
    const tbody = document.getElementById('merchantPricingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = await getData();
    const rates = data.rates || [];

    if (rates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-slate-400">لا توجد أسعار مسجلة حالياً</td></tr>`;
        return;
    }

    rates.forEach((item, index) => {
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-medium text-slate-800">${item.city || '—'}</td>
                <td class="p-3 text-slate-600">${item.region || 'عام للمحافظة'}</td>
                <td class="p-3 text-slate-600">${item.shippingType || 'عادي'}</td>
                <td class="p-3 font-semibold text-indigo-600">${item.price || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteMerchantRate(${index})" class="text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}
window.renderMerchantPricingTable = renderMerchantPricingTable;

// دالة عرض جدول عمولات المناديب
async function renderCourierPricingTable() {
    const tbody = document.getElementById('courierPricingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = await getData();
    const courierRates = data.courierRates || [];

    if (courierRates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-slate-400">لا توجد عمولات مسجلة حالياً</td></tr>`;
        return;
    }

    courierRates.forEach((item, index) => {
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-medium text-slate-800">${item.city || '—'}</td>
                <td class="p-3 text-slate-600">${item.region || 'عام للمحافظة'}</td>
                <td class="p-3 text-slate-600">${item.shippingType || 'عادي'}</td>
                <td class="p-3 font-semibold text-emerald-600">${item.price || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteCourierRate(${index})" class="text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}
window.renderCourierPricingTable = renderCourierPricingTable;

// دوال فتح وإغلاق النوافذ المنبثقة
function openAddMerchantPricingModal() {
    window.currentPricingTarget = 'merchant';
    const modal = document.getElementById('addMerchantPricingModal');
    const title = document.getElementById('pricingModalTitle');
    const label = document.getElementById('ratePriceLabel');
    
    if (title) title.innerHTML = `<i class="fa-solid fa-store text-indigo-600"></i> إضافة سعر شحن جديد (للتاجر)`;
    if (label) label.innerText = `سعر الشحن (ج.م)`;
    if (modal) modal.classList.remove('hidden');
}
window.openAddMerchantPricingModal = openAddMerchantPricingModal;

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

function closeMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) modal.classList.add('hidden');
}
window.closeMerchantPricingModal = closeMerchantPricingModal;

// دالة إغلاق النافذة المنبثقة (تشمل التجار والمناديب)
function closeMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) modal.classList.add('hidden');
}
window.closeMerchantPricingModal = closeMerchantPricingModal;
window.closeCourierPricingModal = closeMerchantPricingModal; // ربط دالة المندوب بنفس دالة الإغلاق لتجنب أي خطأ

// ==========================================
// 1. ربط الأسعار الحقيقية بدقة من مصفوفة التسعير الفعلية
// ==========================================
function getRatesForLocation(city, region) {
    if (!appData) appData = {};
    if (!appData.pricingRates) appData.pricingRates = [];
    if (!appData.courierRates) appData.courierRates = [];

    const cleanCity = (city || '').trim().toLowerCase();
    const cleanRegion = (region || '').trim().toLowerCase();

    // البحث الدقيق في أسعار التجار المسجلة في الإعدادات
    let merchantRate = appData.pricingRates.find(r => {
        const rCity = (r.city || '').trim().toLowerCase();
        const rRegion = (r.region || '').trim().toLowerCase();
        return rCity === cleanCity && (rRegion === cleanRegion || rRegion.includes('عام') || !rRegion);
    });

    // البحث الدقيق في عمولات المناديب المسجلة في الإعدادات
    let courierRate = appData.courierRates.find(r => {
        const rCity = (r.city || '').trim().toLowerCase();
        const rRegion = (r.region || '').trim().toLowerCase();
        return rCity === cleanCity && (rRegion === cleanRegion || rRegion.includes('عام') || !rRegion);
    });

    return {
        merchantPrice: merchantRate ? Number(merchantRate.price || merchantRate.rate || 50) : 50,
        courierPrice: courierRate ? Number(courierRate.price || courierRate.rate || 35) : 35
    };
}
window.getRatesForLocation = getRatesForLocation;

function closePricingModal() {
    const modal = document.getElementById('pricingModal') || document.getElementById('pricingRateModal');
    if (modal) modal.classList.add('hidden');
}
async function deleteMerchantRate(index) {
    let data = await getData();
    if (data.rates) {
        data.rates.splice(index, 1);
        await saveData(data);
        await renderMerchantPricingTable();
    }
}
window.deleteMerchantRate = deleteMerchantRate;

async function deleteCourierRate(index) {
    let data = await getData();
    if (data.courierRates) {
        data.courierRates.splice(index, 1);
        await saveData(data);
        await renderCourierPricingTable();
    }
}
window.deleteCourierRate = deleteCourierRate;
    
document.addEventListener("DOMContentLoaded", async function () {
    window.appData = await getData();

    // تأكد من إخفاء نافذة إضافة الأوردر تلقائياً عند تحميل الصفحة
    const newOrderModal = document.getElementById('newOrderModal');
    if (newOrderModal) {
        newOrderModal.classList.add('hidden');
    }

    // تعبئة قائمة التجار المنسدلة تلقائياً
    if (typeof populateMerchantDropdowns === 'function') {
        populateMerchantDropdowns();
    }

    if (typeof renderMerchantPricingTable === 'function') await renderMerchantPricingTable();
    if (typeof renderCourierPricingTable === 'function') await renderCourierPricingTable();
    if (typeof renderShipmentsTable === 'function') await renderShipmentsTable();
});

// ==========================================
// دالة حفظ أسعار الشحنات والعمولات الجديدة (للتجار والمناديب)
// ==========================================
async function handleSavePricingRate(event) {
    if (event) event.preventDefault();

    const cityInput = document.getElementById('pricingCity') || document.getElementById('rateCity');
    const regionInput = document.getElementById('pricingRegion') || document.getElementById('rateRegion');
    const typeInput = document.getElementById('pricingType') || document.getElementById('rateType');
    const priceInput = document.getElementById('pricingPrice') || document.getElementById('ratePrice');

    const city = cityInput ? cityInput.value : '';
    const region = regionInput ? regionInput.value : 'عام للمحافظة';
    const shippingType = typeInput ? typeInput.value : 'عادي';
    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;

    if (!city || price <= 0) {
        if (typeof showNotification === 'function') {
            showNotification("يرجى إدخال المحافظة والسعر بشكل صحيح", "error");
        }
        return;
    }

    let data = await getData();

    const newRateItem = {
        city,
        region,
        shippingType,
        price
    };

    if (window.currentPricingTarget === 'courier') {
        if (!data.courierRates) data.courierRates = [];
        data.courierRates.push(newRateItem);
    } else {
        if (!data.rates) data.rates = [];
        data.rates.push(newRateItem);
    }

    await saveData(data);

    // إغلاق النافذة وتحديث الجداول فوراً
    closeMerchantPricingModal();
    if (typeof renderMerchantPricingTable === 'function') await renderMerchantPricingTable();
    if (typeof renderCourierPricingTable === 'function') await renderCourierPricingTable();

    if (typeof showNotification === 'function') {
        showNotification("تم حفظ وتحديث التسعير بنجاح 🚀", "success");
    }
}
window.handleSavePricingRate = handleSavePricingRate;


// ==========================================
// 1. دالة البحث الدقيق عن الأسعار للمحافظة والمنطقة
// ==========================================
function getRatesForLocation(city, region) {
    if (!appData) appData = {};
    if (!appData.pricingRates) appData.pricingRates = [];
    if (!appData.courierRates) appData.courierRates = [];

    const cleanCity = (city || '').trim().toLowerCase();
    const cleanRegion = (region || '').trim().toLowerCase();

    // البحث في أسعار التجار
    let merchantRateObj = appData.pricingRates.find(r => 
        (r.city || '').trim().toLowerCase() === cleanCity && 
        ((r.region || '').trim().toLowerCase() === cleanRegion || !r.region || r.region.includes('عام'))
    );

    // البحث في عمولات المناديب
    let courierRateObj = appData.courierRates.find(r => 
        (r.city || '').trim().toLowerCase() === cleanCity && 
        ((r.region || '').trim().toLowerCase() === cleanRegion || !r.region || r.region.includes('عام'))
    );

    return {
        merchantPrice: merchantRateObj ? Number(merchantRateObj.price || merchantRateObj.rate || 50) : 50,
        courierPrice: courierRateObj ? Number(courierRateObj.price || courierRateObj.rate || 35) : 35
    };
}
window.getRatesForLocation = getRatesForLocation;


// ===== جدول اعتماد المرتجع من المندوب - جديد =====
function renderWarehouseReturnsTable(){
  var el = document.getElementById('warehouseReturnsTable');
  if(!el) return;
  var q = (document.getElementById('wrApproveSearch')?.value||'').trim();
  var st = document.getElementById('wrApproveStatusFilter')?.value||'';
  var cf = document.getElementById('wrApproveCourierFilter')?.value||'';

  var list = typeof getWarehouseReturns==='function' ? getWarehouseReturns() : (appData.shipments||[]);

  // فلتر المناديب
  var cfEl = document.getElementById('wrApproveCourierFilter');
  if(cfEl && cfEl.options.length<=1){
    var couriers = [...new Set(list.map(s=>s.courier||s.courierName).filter(Boolean))];
    couriers.forEach(c=>{ var o=document.createElement('option'); o.value=c; o.textContent=c; cfEl.appendChild(o); });
  }

  var filtered = list.filter(s=>{
    var isApproved = s.warehouseApproved || s.status==='في المخزن';
    if(st==='pending' && isApproved) return false;
    if(st==='approved' && !isApproved) return false;
    if(cf && (s.courier||s.courierName)!==cf) return false;
    if(q && !((s.code||s.id||'').toString().includes(q))) return false;
    return true;
  });

  var pendEl = document.getElementById('wrPendingCount');
  var apprEl = document.getElementById('wrApprovedCount');
  if(pendEl) pendEl.textContent = list.filter(s=>!(s.warehouseApproved||s.status==='في المخزن')).length;
  if(apprEl) apprEl.textContent = list.filter(s=>(s.warehouseApproved||s.status==='في المخزن')).length;

  el.innerHTML = filtered.map(function(s){
    var code = s.code||s.id;
    var isApproved = s.warehouseApproved || s.status==='في المخزن';
    return '<tr class="hover:bg-slate-50 '+(isApproved?'bg-green-50/40':'')+'">'
      + '<td class="p-2.5 font-bold">'+code+'</td>'
      + '<td class="p-2.5">'+(s.merchant||s.merchantName||'-')+'</td>'
      + '<td class="p-2.5">'+(s.customer||s.customerName||'-')+' / '+(s.phone||s.customerPhone||'-')+' / '+(s.area||'')+' / '+(s.city||'')+'</td>'
      + '<td class="p-2.5">'+(s.courier||s.courierName||'-')+'</td>'
      + '<td class="p-2.5">'+(s.returnReason||s.status)+' - '+(s.notes||s.note||'')+'</td>'
      + '<td class="p-2.5 font-bold">'+(s.cod||s.amount||0)+'</td>'
      + '<td class="p-2.5">'+formatDateTime(s.courierChangedAt||s.statusChangedAt||s.returnedAt)+'</td>'
      + '<td class="p-2.5 font-bold">'+formatDateTime(s.warehouseApprovedAt||s.approvedAt)+'</td>'
      + '<td class="p-2.5">'+(s.warehouseApprovedBy||s.approvedBy||'-')+'</td>'
      + '<td class="p-2.5"><span class="'+(isApproved?'text-green-700 bg-green-100 px-2 py-1 rounded':'text-amber-700 bg-amber-100 px-2 py-1 rounded')+'">'+(isApproved?'تم الاعتماد ✅':'بانتظار الاعتماد')+'</span></td>'
      + '<td class="p-2.5"><select onchange="changeWarehouseReturnStatus(\''+code+'\',this.value)" class="bg-slate-50 border rounded-lg text-xs px-2 py-1"><option value="">تغيير...</option><option>رفض الاستلام</option><option>مرتجع</option><option>تهرب عند الوصول</option><option>تعذر الوصول</option><option>مؤجل 7 ايام</option><option>تم التسليم</option></select></td>'
      + '<td class="p-2.5 text-center">'+(isApproved ? '<span class="text-green-600 font-bold text-[11px]">معتمد<br>'+formatDateTime(s.warehouseApprovedAt)+'<br>'+(s.warehouseApprovedBy||'')+'</span>' : '<button onclick="approveWarehouseReturn(\''+code+'\')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">اعتماد</button>')+'</td>'
      + '</tr>';
  }).join('') || '<tr><td colspan="12" class="p-4 text-center text-slate-400">مفيش مرتجعات بالفلتر ده</td></tr>';
}

function approveWarehouseReturn(code){
  var s = (appData.shipments||[]).find(function(x){ return (x.code||x.id)==code; });
  if(!s) return;
  s.warehouseApproved = true;
  s.warehouseApprovedAt = new Date().toISOString();
  s.warehouseReceivedAt = s.warehouseApprovedAt;
  s.warehouseApprovedBy = getCurrentUserName ? getCurrentUserName() : 'المخزن';
  s.status = 'في المخزن';
  saveDataSafe();
  renderWarehouseReturns();
  renderWarehouseReturnsTable();
}

// ==========================================
// دالة جدول التوزيع والمخزن (مظبوطة 9 خانات)
// ==========================================
function renderWarehouseTables() {
    const upperTableBody = document.getElementById('logisticDistributionTableBody');
    if (!upperTableBody) return;

    let shipments = (typeof appData !== 'undefined' && appData.shipments) ? appData.shipments : (window.allShipments || []);
    
   shipments = shipments.filter(s => {
    const st = String(s.status || '').trim();
    if (st !== 'بانتظار التوزيع') return false;
    if (s.courierAssigned || s.courier || s.deliveryAgent) return false;
    return true;
});

    let couriersList = [];
    if (typeof appData !== 'undefined') {
        couriersList = appData.couriers || (appData.users && appData.users.couriers) || [];
    }

    if (!shipments || shipments.length === 0) {
        upperTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400 text-xs font-bold">لا توجد شحنات متاحة حالياً</td></tr>`;
        const c0 = document.getElementById('statTotalCount'); if (c0) c0.textContent = '0';
        const a0 = document.getElementById('statTotalAmount'); if (a0) a0.textContent = '0 ج.م';
        return;
    }

    upperTableBody.innerHTML = shipments.map((s) => {
        const sid = s.id || s._id || s.waybill;
        const waybill = s.waybill || s.code || s.id || s._id || '-';
        const addedTime = s.addedAt ? new Date(s.addedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : (s.date || 'اليوم');
        const addedByWho = s.addedBy || 'التاجر / الإدارة';
        const detailedAddr = s.address || s.detailedAddress || s.newDetailedAddress || '-';
        const notesVal = s.notes || s.note || s.remarks || '-';
        const mShipVal = s.mShip ?? s.shippingFee ?? s.shippingCost ?? s.merchantShipping ?? 90;
        const amountVal = s.amount || s.cod || s.cost || s.total || 0;
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 text-center"><input type="checkbox" class="warehouse-checkbox shipment-row-checkbox" value="${sid}" onchange="updateSelectedWarehouseTotals()"></td>
            <td class="p-3 font-mono font-bold text-slate-800">${waybill}<br><span class="text-[10px] text-slate-400">إضافة: ${addedTime}</span><br><span class="text-[10px] text-indigo-600 font-semibold">بواسطة: ${addedByWho}</span></td>
            <td class="p-3 font-bold text-slate-700">${s.merchant || s.store || '-'}</td>
            <td class="p-3">
                <div class="font-bold text-slate-800">${s.customer || s.customerName || s.recipientName || '-'}</div>
                <div class="text-[11px] text-slate-500">📞 ${s.phone || s.customerPhone || '-'} | 📍 ${s.city || s.governorate || 'القاهرة'} ${s.region ? ' - ' + s.region : ''}</div>
                <div class="text-[11px] text-slate-700 font-semibold">${detailedAddr}</div>
            </td>
            <td class="p-3 font-black text-emerald-600">${amountVal} ج.م</td>
            <td class="p-3 font-bold text-slate-700">${mShipVal} ج.م</td>
            <td class="p-3 max-w-[160px]"><div class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">${notesVal}</div></td>
            <td class="p-3">
                <select class="form-select border border-slate-300 rounded-lg p-1.5 text-xs courier-assign-select w-full" id="courier-assign-${sid}">
                    <option value="">اختر مندوب...</option>
                    ${couriersList.map(c => `<option value="${c.name || c.username}">${c.name || c.username} (${c.phone || ''})</option>`).join('')}
                </select>
            </td>
            <td class="p-3 text-center">
                <button onclick="assignSingleCourier('${sid}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">إسناد</button>
            </td>
        </tr>
    `}).join('');
    
    const statTotalCount = document.getElementById('statTotalCount');
    if (statTotalCount) statTotalCount.textContent = shipments.length;

    const statTotalAmount = document.getElementById('statTotalAmount');
    if (statTotalAmount) {
        const totalAmt = shipments.reduce((sum, s) => sum + (Number(s.amount || s.cod || s.cost || s.total) || 0), 0);
        statTotalAmount.textContent = totalAmt.toLocaleString() + ' ج.م';
    }
    console.log("تم تحديث جدول التوزيع - 9 خانات مظبوطة");
}
window.renderWarehouseTables = renderWarehouseTables;
// خلي الدالتين واحدة عشان ميخبطوش في بعض تاني
window.renderLogisticDistributionTable = renderWarehouseTables;


// ==========================================
// دوال البحث والفلترة الذكية لشحنات المخزن
// ==========================================
function filterWarehouseShipments() {
    const query = document.getElementById('warehouseSearchInput').value.toLowerCase().trim();
    const shipments = (typeof appData !== 'undefined' && appData.shipments) ? appData.shipments : (window.allShipments || []);
    
    if (!shipments || shipments.length === 0) return;

    // إذا كانت خانة البحث فارغة، اعرض كل الشحنات فوراً دون تصفية
    if (query === "") {
        renderWarehouseTables(); // أو استدعاء دالة الرسم الأصلية
        return;
    }

    const filteredShipments = shipments.filter(s => {
        const id = String(s.id || s._id || '').toLowerCase();
        const merchant = String(s.merchant || '').toLowerCase();
        const customer = String(s.customer || s.recipientName || '').toLowerCase();
        const city = String(s.city || '').toLowerCase();
        const phone = String(s.phone || s.customerPhone || '').toLowerCase();
        const address = String(s.address || s.region || '').toLowerCase();
        const amount = String(s.amount || s.cost || '').toLowerCase();

        return id.includes(query) || 
               merchant.includes(query) || 
               customer.includes(query) || 
               city.includes(query) || 
               phone.includes(query) || 
               address.includes(query) || 
               amount.includes(query);
    });

    renderFilteredWarehouseTable(filteredShipments);
}

function renderFilteredWarehouseTable(shipmentsToRender) {
    const upperTableBody = document.getElementById('logisticDistributionTableBody') ||
                           document.getElementById('warehouseDistributionTableBody');

    if (!upperTableBody) return;

    let couriersList = (typeof appData !== 'undefined') ? (appData.couriers || (appData.users && appData.users.couriers) || []) : [];

    if (shipmentsToRender.length === 0) {
        upperTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs font-bold">لا توجد نتائج مطابقة للبحث</td></tr>`;
        return;
    }

    upperTableBody.innerHTML = shipmentsToRender.map((s) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 text-center">
                <input type="checkbox" class="warehouse-checkbox" value="${s.id || s._id}" onchange="updateSelectedWarehouseTotals()">
            </td>
            <td class="p-3 font-mono font-bold">${s.id || s._id}</td>
            <td class="p-3">${s.merchant || '-'}</td>
            <td class="p-3">${s.customer || s.recipientName || '-'} (${s.city || 'القاهرة'})</td>
            <td class="p-3 font-bold text-emerald-600">${s.amount || s.cost || 0} ج.م</td>
            <td class="p-3 text-center">
                <select class="form-select border border-slate-300 rounded-lg p-1.5 text-xs courier-assign-select" id="courier-assign-${s.id || s._id}">
                    <option value="">اختر مندوب...</option>
                    ${couriersList.map(c => `<option value="${c.name || c.username}">${c.name} (${c.phone || ''})</option>`).join('')}
                </select>
            </td>
            <td class="p-3 text-center">
                <button onclick="assignSingleCourier('${s.id || s._id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">إسناد</button>
            </td>
        </tr>
    `).join('');

    const statTotalCount = document.getElementById('statTotalCount');
    if (statTotalCount) statTotalCount.textContent = shipmentsToRender.length;

    const statTotalAmount = document.getElementById('statTotalAmount');
    if (statTotalAmount) {
        const totalAmt = shipmentsToRender.reduce((sum, s) => sum + (Number(s.amount) || Number(s.cost) || 0), 0);
        statTotalAmount.textContent = totalAmt + ' ج.م';
    }
}
window.filterWarehouseShipments = filterWarehouseShipments;


// دالة لتعبئة قائمة المناديب للتحويل الجماعي
function populateBulkCourierDropdown() {
    const bulkSelect = document.getElementById('bulkCourierSelect');
    if (!bulkSelect) return;

    let couriersList = [];
    if (typeof appData !== 'undefined') {
        couriersList = appData.couriers || (appData.users && appData.users.couriers) || [];
    }

    // الاحتفاظ بالعنصر الافتراضي الأول وإضافة المناديب بعدها
   bulkSelect.innerHTML = `<option value="">اختر المندوب للتحويل الجماعي...</option>` + 
    couriersList.map(c => `<option value="${c.name || c.username}">${c.name} (${c.region || c.area || 'عام'} - ${c.city || 'القاهرة'}) [${c.phone || ''}]</option>`).join('');
}

// استدعاء الدالة تلقائياً عند تحديث جداول المخزن
const originalRenderWarehouseTables = window.renderWarehouseTables;
window.renderWarehouseTables = function() {
    if (typeof originalRenderWarehouseTables === 'function') originalRenderWarehouseTables();
    populateBulkCourierDropdown();
};
// ==========================================
// دالة حساب المجاميع عند اختيار الشحنات في جدول التوزيع
// ==========================================
function updateSelectedWarehouseTotals() {
    try {
        const checkboxes = document.querySelectorAll('.warehouse-checkbox:checked');
        let totalCount = checkboxes.length;
        let totalAmount = 0;

        checkboxes.forEach(cb => {
            // يمكن استخراج المبلغ من الصف المرتبط إذا لزم الأمر
            const row = cb.closest('tr');
            if (row) {
                const amountCell = row.querySelector('.text-emerald-600');
                if (amountCell) {
                    const val = parseFloat(amountCell.textContent) || 0;
                    totalAmount += val;
                }
            }
        });

        // تحديث العناصر في الواجهة إن وجدت
        const countEl = document.getElementById('selectedShipmentsCount');
        const amountEl = document.getElementById('selectedShipmentsAmount');
        if (countEl) countEl.textContent = totalCount;
        if (amountEl) amountEl.textContent = totalAmount + ' ج.م';
        
        console.log(`تم تحديث مجاميع التوزيع: ${totalCount} شحنة بقيمة ${totalAmount} ج.م`);
    } catch (e) {
        console.error("Error in updateSelectedWarehouseTotals:", e);
    }
}
window.updateSelectedWarehouseTotals = updateSelectedWarehouseTotals;

// دالة لحساب المبلغ النهائي المطلوب تحصيله من العميل بناءً على نوع التاجر
function calculateFinalShipmentAmount(shipment, merchantData) {
    let baseAmount = Number(shipment.amount || shipment.cost || 0);
    
    // البحث عن بيانات التاجر المرتبط بالشحنة لمعرفة نوع الشحن الخاص به
    let merchant = merchantData;
    if (!merchant && typeof appData !== 'undefined' && appData.merchants) {
        merchant = appData.merchants.find(m => m.name === shipment.merchant);
    }

    // إذا كان التاجر غير شامل الشحن (exclusive)، يتم إضافة سعر الشحن للمبلغ
    if (merchant && merchant.shippingType === 'exclusive') {
        // جلب سعر الشحن للمحافظة والمنطقة الخاصة بالشحنة
        const computedRates = getRatesForLocation ? getRatesForLocation(shipment.city, shipment.region || shipment.address) : { courierPrice: 50 };
        const shippingFee = Number(computedRates.courierPrice || shipment.cShip || 50);
        
        return baseAmount + shippingFee;
    }

    // إذا كان التاجر شامل الشحن (inclusive)، يظل المبلغ كما هو تماماً
    return baseAmount;
}

// ==========================================
// 3. دالة اعتماد واستلام الشحنة في المخزن
// ==========================================
async function approveWarehouseDelivery(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/shipments-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id, status: 'جاري التوصيل', warehouseReceived: true })
        });
        if (response.ok) {
            showNotification("تم اعتماد استلام الشحنة سحابياً", "success");
            if (typeof loadCloudData === 'function') loadCloudData();
        } else {
            showNotification("فشل تحديث حالة الشحنة", "error");
        }
    } catch (e) {
        showNotification("حدث خطأ في الاتصال بالباك إيند", "error");
    }
}
window.approveWarehouseDelivery = approveWarehouseDelivery;


function openEditShipmentModal(shipmentId) {
    const shipment = appData.shipments.find(s => String(s.id || s._id) === String(shipmentId) || String(s.code) === String(shipmentId));
    if (!shipment) return;

    const idInput = document.getElementById('editShipmentId');
    if (idInput) idInput.value = shipment.id || shipment._id || shipmentId;
    window.currentEditingShipmentId = shipment.id || shipment._id || shipmentId;

    document.getElementById('editCustomerName').value = shipment.customer || shipment.recipientName || '';
    document.getElementById('editPhone').value = shipment.phone || shipment.customerPhone || '';
    // السعر: الباك اند بيخزنه بأكتر من اسم، بنجربهم كلهم
   document.getElementById('editCOD').value = shipment.cod || shipment.amount || shipment.cost || shipment.total || 0;
    document.getElementById('editCity').value = shipment.city || 'القاهرة';
    document.getElementById('editRegion').value = shipment.region || '';
    // الشحن: لو عندك 50/35 متفرقين، هنعرض مجموعهم، وهنحافظ عليهم في الحفظ
    document.getElementById('editShippingFee').value = shipment.shippingFee || shipment.mShip || 0;
    document.getElementById('editAddress').value = shipment.address || '';
    document.getElementById('editNotes').value = shipment.notes || shipment.note || shipment.remarks || '';

    const modal = document.getElementById('editShipmentModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}
window.openEditShipmentModal = openEditShipmentModal;

function closeEditShipmentModal() {
    const m = document.getElementById('editShipmentModal');
    if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
}

async function handleSaveShipment(event) {
    event.preventDefault();
    const id = document.getElementById('editShipmentId')?.value || window.currentEditingShipmentId;
    if (!id) { alert("مش لاقي رقم الشحنة"); return; }
    const old = appData.shipments.find(s => String(s.id || s._id) === String(id) || String(s.code) === String(id)) || {};

    const name = document.getElementById('editCustomerName')?.value.trim() || '';
    const phone = document.getElementById('editPhone')?.value.trim() || '';
    const cod = Number(document.getElementById('editCOD')?.value || 0);
    const shippingFee = Number(document.getElementById('editShippingFee')?.value || 0);
    const notes = document.getElementById('editNotes')?.value.trim() || '';
    const city = document.getElementById('editCity')?.value.trim() || '';
    const region = document.getElementById('editRegion')?.value.trim() || '';
    const address = document.getElementById('editAddress')?.value.trim() || '';

    const updatedData = {
        customer: name,
        customerName: name,
        recipientName: name,
        phone: phone,
        customerPhone: phone,
        amount: cod,
        cod: cod,
        cost: cod,
        total: cod,
        price: cod,
        city: city,
        region: region,
        address: address,
        shippingFee: shippingFee,
        mShip: shippingFee,
        cShip: 0,
        notes: notes,
        note: notes,
        remarks: notes,
        courier: old.courier || '',
        status: old.status || '',
        merchant: old.merchant || '',
        waybill: old.waybill || ''
    };

    try {
      const response = await fetch(`${API_BASE_URL}/shipments?id=` + encodeURIComponent(id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, _id: id, code: id, ...updatedData })
        });
        const result = await response.json();
        if (response.ok) {
            // حدث اللي في الذاكرة فورا بنفس القيم
            const s = appData.shipments.find(x => String(x.id || x._id) === String(id) || String(x.code) === String(id));
            if (s) Object.assign(s, updatedData);
            alert("تم تعديل بيانات الشحنة بنجاح");
            closeEditShipmentModal();
            window.currentEditingShipmentId = null;
            if (typeof loadShipments === 'function') loadShipments();
        } else {
            alert("حدث خطأ أثناء التعديل: " + (result.message || ''));
        }
    } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالسيرفر أثناء تعديل الشحنة");
    }
}

function renderPendingApproval() {
    const tbody = document.getElementById('warehouseDeliveryTable');
    if (!tbody) return;
    let all = appData.shipments || [];
    let pending = all.filter(s => {
        let st = String(s.status || '').trim();
        if (s.courierAssigned || s.courier || s.deliveryAgent) return false;
        if (st === 'مع المندوب' || st === 'جاري التوصيل' || st === 'تم التسليم' || st === 'تم الاعتماد' || st === 'بانتظار التوزيع') return false;
        if (st === 'مرتجع' || st === 'رفض الاستلام' || st === 'ملغي') return false;
        // اي حاجة تانية = جديدة ولسه متعمدتش
        return true;
    });
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs font-bold">لا توجد شحنات بانتظار الاعتماد</td></tr>`;
        return;
    }
    tbody.innerHTML = pending.map(s => {
        let sid = s.id || s._id || s.waybill;
        return `<tr class="border-b"><td class="p-2.5 font-bold">${s.waybill || sid}</td><td class="p-2.5">${s.customer || '-'} - ${s.city || s.governorate || ''}</td><td class="p-2.5 font-black text-emerald-600">${s.amount || s.cod || 0} ج.م</td><td class="p-2.5 text-center"><button onclick="approveWarehouseShipment('${sid}')" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">اعتماد الاستلام</button></td></tr>`;
    }).join('');
}

async function approveWarehouseShipment(id) {
    let s = (appData.shipments || []).find(x => String(x.id || x._id || x.waybill) === String(id));
    if (!s) return;
    // تحديث فوري في الواجهة
    s.status = 'بانتظار التوزيع';
    renderPendingApproval();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();
    if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
    showNotification("تم اعتماد استلام الشحنة", "success");
    // تحديث السيرفر في الخلفية بنفس طريقة assignSingleCourier
    try {
        const apiBase = window.API_URL || window.API_BASE_URL || 'https://safira-logistic.vercel.app/api';
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        await fetch(`${apiBase}/shipments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: id, _id: id, status: 'بانتظار التوزيع' })
        });
    } catch(e){ console.error("Approve error:", e); }
}
window.renderPendingApproval = renderPendingApproval;
window.approveWarehouseShipment = approveWarehouseShipment;

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

// دالة شاملة لتعديل وحفظ بيانات الشحنة
function saveEditedShipment(shipmentId) {
    // 1. جلب البيانات المدخلة من الـ Modal
    const customerInput = document.getElementById('editCustomerName') || document.getElementById('editCustomer');
    const phoneInput = document.getElementById('editCustomerPhone') || document.getElementById('editPhone');
    const cityInput = document.getElementById('editCity');
    const regionInput = document.getElementById('editRegion') || document.getElementById('editAddress');
    const amountInput = document.getElementById('editAmount') || document.getElementById('editCost');

    const updatedData = {
        customer: customerInput ? customerInput.value : '',
        phone: phoneInput ? phoneInput.value : '',
        customerPhone: phoneInput ? phoneInput.value : '',
        city: cityInput ? cityInput.value : 'القاهرة',
        region: regionInput ? regionInput.value : '',
        address: regionInput ? regionInput.value : '',
        amount: amountInput ? amountInput.value : 0,
        cost: amountInput ? amountInput.value : 0
    };

    // 2. تحديث الشحنة محلياً في appData.shipments
    if (typeof appData !== 'undefined' && appData.shipments) {
        let shipment = appData.shipments.find(s => String(s.id || s._id) === String(shipmentId));
        if (shipment) {
            shipment.customer = updatedData.customer;
            shipment.phone = updatedData.phone;
            shipment.customerPhone = updatedData.customerPhone;
            shipment.city = updatedData.city;
            shipment.region = updatedData.region;
            shipment.address = updatedData.address;
            shipment.amount = updatedData.amount;
            shipment.cost = updatedData.cost;
        }
    }

    // 3. إرسال التحديث للسيرفر (اختياري حسب الـ API لديك)
    if (typeof API_BASE !== 'undefined') {
        fetch(`${API_BASE}/shipments/${shipmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        }).catch(err => console.log("Cloud sync note:", err));
    }

    // 4. إغلاق الـ Modal الخاص بالتعديل
    const modal = document.getElementById('editShipmentModal') || document.querySelector('.edit-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    // 5. إعادة رسم الجداول فوراً لتظهر التعديلات وتسمع في الحال
    if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
    if (typeof renderWarehouseTables === 'function') renderWarehouseTables();
    if (typeof filterWarehouseShipments === 'function') filterWarehouseShipments();

    alert('تم تعديل بيانات الشحنة بنجاح');
}

// ربط الدالة بالنافذة العامة لضمان عملها مع أي زر حفظ
window.saveEditedShipment = saveEditedShipment;

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
    if (!gridContainer) return;

    // 1. التجار المسجلين الأساسيين
    let registeredMerchants = appData.merchants || [];

    // 2. استخراج التجار الخارجيين من الشحنات لضمان ظهورهم
    let shipments = appData.shipments || [];
    let externalMerchantsMap = {};

    shipments.forEach(s => {
        if (s.customMerchant || (s.merchant && !registeredMerchants.some(m => m.name === s.merchant))) {
            let mName = s.customMerchant || s.merchant;
            if (mName && !externalMerchantsMap[mName]) {
                externalMerchantsMap[mName] = {
                    name: mName,
                    isUnregistered: true,
                    totalShipments: 0
                };
            }
            if (mName && externalMerchantsMap[mName]) {
                externalMerchantsMap[mName].totalShipments++;
            }
        }
    });

    let externalMerchants = Object.values(externalMerchantsMap);
    let allMerchants = [
        ...registeredMerchants.map(m => ({ ...m, isUnregistered: false })),
        ...externalMerchants
    ];

    // جلب قيمة البحث (لو موجودة)
    const searchInput = document.querySelector('input[placeholder*="ابحث باسم التاجر"]');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let filteredMerchants = allMerchants;
    if (searchQuery) {
        filteredMerchants = allMerchants.filter(m => m.name && m.name.toLowerCase().includes(searchQuery));
    }

    // عرض جميع الكروت فوراً في الشبكة
    gridContainer.innerHTML = filteredMerchants.length ? filteredMerchants.map(m => `
        <div onclick="openMerchantCardDetails('${m.name.replace(/'/g, "\\'")}', ${m.isUnregistered})" class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-2 cursor-pointer hover:shadow-md transition">
            <div class="flex justify-between items-center">
                <span class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <i class="fa-solid fa-store ${m.isUnregistered ? 'text-amber-500' : 'text-safira-600'}"></i> ${m.name}
                </span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isUnregistered ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                    ${m.isUnregistered ? 'تاجر خارجي / غير مسجل' : 'نشط سحابياً'}
                </span>
            </div>
            <div class="text-xs text-slate-500 flex justify-between items-center">
                <span>${m.isUnregistered ? `إجمالي الشحنات: ${m.totalShipments}` : `وزر: ${m.username || 'غير محدد'}`}</span>
                ${m.isUnregistered ? `<span class="text-safira-600 font-bold text-[11px] underline">عرض الشحنات</span>` : ''}
            </div>
        </div>
    `).join('') : '<p class="text-xs text-slate-400 col-span-full text-center py-4">لا توجد نتائج مطابقة للبحث</p>';

    // ربط خانة البحث لتحديث الكروت فوراً عند الكتابة
    if (searchInput && !searchInput.dataset.listenerAdded) {
        searchInput.dataset.listenerAdded = "true";
        searchInput.addEventListener('input', () => {
            renderMerchantsSection();
        });
    }
}


window.openMerchantCardDetails = function(merchantName, isUnregistered) {
    if (isUnregistered) {
        // فلترة شحنات هذا التاجر الخارجي
        const externalShipments = (appData.shipments || []).filter(s => 
            (s.customMerchant && s.customMerchant === merchantName) || 
            (s.merchant && s.merchant === merchantName)
        );

        let totalAmount = 0;
        let totalShip = 0;
        externalShipments.forEach(s => {
            totalAmount += Number(s.amount || s.total || 0);
            totalShip += Number(s.ship || s.mShip || 0);
        });

        // جلب الهاتف المخزن مسبقاً لو موجود في الذاكرة المؤقتة أو الشحنات
        let savedPhone = localStorage.getItem(`ext_merchant_phone_${merchantName}`) || externalShipments.find(s => s.phone || s.merchantPhone)?.phone || '';

        let modalId = 'externalMerchantModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="${modalId}" class="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 border max-h-[90vh] overflow-y-auto text-xs">
                    
                    <!-- الهيدر -->
                    <div class="flex justify-between items-center border-b pb-3">
                        <div class="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <i class="fa-solid fa-store text-amber-500"></i> تفاصيل التاجر الخارجي: <span class="text-safira-600">${merchantName}</span>
                        </div>
                        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-slate-600 text-lg">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <!-- إحصائيات سريعة -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <span class="text-slate-500 block">إجمالي الشحنات</span>
                            <span class="font-bold text-slate-800 text-sm">${externalShipments.length} شحنة</span>
                        </div>
                        <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <span class="text-slate-500 block">إجمالي المبالغ</span>
                            <span class="font-bold text-emerald-700 text-sm">${totalAmount} ج.م</span>
                        </div>
                        <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                            <span class="text-slate-500 block">إجمالي الشحن</span>
                            <span class="font-bold text-blue-700 text-sm">${totalShip} ج.م</span>
                        </div>
                    </div>

                    <!-- إضافة أو تحديث رقم هاتف التاجر الخارجي -->
                    <div class="bg-slate-50 p-3 rounded-2xl border flex items-center gap-3">
                        <div class="flex-grow">
                            <label class="block font-bold text-slate-700 mb-1">رقم هاتف التاجر الخارجي</label>
                            <input type="text" id="extMerchantPhoneInput" value="${savedPhone}" placeholder="اكتب رقم الهاتف هنا..." class="w-full border rounded-xl px-3 py-2 outline-none bg-white">
                        </div>
                        <div class="pt-5">
                            <button onclick="saveExternalMerchantPhone('${merchantName.replace(/'/g, "\\'")}')" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl transition">
                                <i class="fa-solid fa-save ml-1"></i> حفظ الرقم
                            </button>
                        </div>
                    </div>

                    <!-- سجل الشحنات بالتواريخ والأوقات -->
                    <div class="space-y-2">
                        <h4 class="font-bold text-slate-700 text-xs">سجل الأوردرات والشحنات الكامل:</h4>
                        <div class="border rounded-xl overflow-hidden">
                            <table class="w-full text-right">
                                <thead class="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th class="p-2">رقم البوليصة</th>
                                        <th class="p-2">التاريخ والوقت</th>
                                        <th class="p-2">المستلم والمحافظة</th>
                                        <th class="p-2">المبلغ المطلوب</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    ${externalShipments.length ? externalShipments.map(s => `
              <tr onclick="openShipmentDetailsModal('${s.waybill || s.id || s._id}')" class="hover:bg-slate-50 transition cursor-pointer">
                                            <td class="p-2 font-bold">${s.waybill || s.id || '-'}</td>
                                            <td class="p-2 text-slate-500">${s.date || s.createdAt || 'وقت سابق'}</td>
                                            <td class="p-2">${s.customer || s.clientName || '-'} (${s.city || '-'})</td>
                                            <td class="p-2 text-emerald-600 font-bold">${s.amount || s.total || 0} ج.م</td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد شحنات مسجلة</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- أزرار الإجراءات (تسجيل التاجر رسمياً أو الإغلاق) -->
                    <div class="flex justify-between items-center pt-3 border-t">
                        <button onclick="convertExternalMerchantToRegistered('${merchantName.replace(/'/g, "\\'")}')" class="bg-safira-600 hover:bg-safira-700 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md">
                            <i class="fa-solid fa-user-plus"></i> تسجيل هذا التاجر في المنظومة رسمياً
                        </button>
                        <button onclick="document.getElementById('${modalId}').remove()" class="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition">إغلاق</button>
                    </div>

                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

    } else {
        const merchantObj = (appData.merchants || []).find(m => m.name === merchantName);
        if (merchantObj && typeof openMerchantProfile === 'function') {
            openMerchantProfile(merchantObj.id);
        }
    }
};

// دالة حفظ رقم هاتف التاجر الخارجي
window.saveExternalMerchantPhone = function(merchantName) {
    const phoneInput = document.getElementById('extMerchantPhoneInput');
    if (!phoneInput) return;
    const phoneVal = phoneInput.value.trim();
    localStorage.setItem(`ext_merchant_phone_${merchantName}`, phoneVal);
    showNotification(`تم حفظ رقم هاتف التاجر (${merchantName}) بنجاح`, "success");
};

// دالة تحويل التاجر الخارجي إلى تاجر مسجل رسمي في المنظومة
window.convertExternalMerchantToRegistered = function(merchantName) {
    const phoneInput = document.getElementById('extMerchantPhoneInput');
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';

    if (!appData.merchants) appData.merchants = [];
    
    // التأكد إنه مش مسجل قبل كده
    if (appData.merchants.some(m => m.name === merchantName)) {
        showNotification("هذا التاجر مسجل بالفعل في المنظومة!", "error");
        return;
    }

    const newMerchant = {
        id: Date.now(),
        name: merchantName,
        phone: phoneVal || 'غير محدد',
        username: merchantName.replace(/\s+/g, '').toLowerCase()
    };

    appData.merchants.unshift(newMerchant);
    showNotification(`تم تحويل وتسجيل التاجر (${merchantName}) بنجاح!`, "success");

    // إغلاق المودال وتحديث الواجهة
    const modal = document.getElementById('externalMerchantModal');
    if (modal) modal.remove();
    
    if (typeof renderMerchantsSection === 'function') {
        renderMerchantsSection();
    }
};


// ===== نظام مرتجعات المخزن - كامل وجاهز =====
if (typeof window.appData === 'undefined') window.appData = { shipments: [], merchants: [], returnLogs: [] };
if (!appData.shipments) appData.shipments = [];
if (!appData.returnLogs) appData.returnLogs = [];
if (!appData.merchants) appData.merchants = [];

var RETURN_STATUSES = window.RETURN_STATUSES || ['رفض الاستلام','مرتجع','تهرب عند الوصول','تعذر الوصول'];
window.RETURN_STATUSES = RETURN_STATUSES;
var _currentReturnMerchant = null;
var _selectedReturnIds = new Set();

function getCurrentUserName(){
  if (typeof currentUser !== 'undefined' && currentUser) return currentUser.name || currentUser.email || currentUser.phone || 'ادمن';
  if (typeof currentAdmin !== 'undefined' && currentAdmin) return currentAdmin.name || 'ادمن';
  return localStorage.getItem('currentUser') || localStorage.getItem('adminName') || 'ادمن';
}
function getCurrentRole(){
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.role) return currentUser.role;
  return localStorage.getItem('role') || 'owner';
}
function saveDataSafe(){
  if (typeof saveData === 'function') return saveData();
  if (typeof save === 'function') return save();
  if (typeof persist === 'function') return persist();
  try{ localStorage.setItem('appData', JSON.stringify(appData)); }catch(e){}
}

function isReturnStatus(s){
  if(RETURN_STATUSES.includes((s.status||'').trim())) return true;
  if((s.status||'').includes('مؤجل') || (s.status||'').includes('اجل')){
    var d = new Date(s.postponedAt || s.postponedDate || s.updatedAt || s.date || s.createdAt);
    if((Date.now() - d.getTime())/(1000*60*60*24) >= 7) return true;
  }
  return false;
}
function getWarehouseReturns(){
  var list = (appData.shipments||[]).filter(function(s){ return isReturnStatus(s) && s.warehouseApproved && !s.assignedToMerchant; });
  var q = ((document.getElementById('wrSearch')?.value||'').toLowerCase());
  var mf = document.getElementById('wrMerchantFilter')?.value||'';
  var cf = document.getElementById('wrCourierFilter')?.value||'';
  var rf = document.getElementById('wrReasonFilter')?.value||'';
  if(mf) list = list.filter(function(s){ return s.merchant===mf; });
  if(cf) list = list.filter(function(s){ return (s.courier||s.courierName||'')===cf; });
  if(rf) list = list.filter(function(s){ return (s.status||'').includes(rf.replace('مؤجل 7 ايام','مؤجل')); });
  if(q) list = list.filter(function(s){ return (((s.code||s.id||'')+' '+(s.customer||s.customerName||'')+' '+(s.phone||s.customerPhone||'')+' '+(s.merchant||'')).toLowerCase().includes(q)); });
  return list;
}
function daysInWarehouse(s){
  var d = new Date(s.warehouseReceivedAt || s.warehouseApprovedAt || s.updatedAt || s.date || s.createdAt);
  return Math.max(0, Math.floor((Date.now()-d.getTime())/(1000*60*60*24)));
}
function renderWarehouseReturns(){
  var mf = document.getElementById('wrMerchantFilter');
  var cf = document.getElementById('wrCourierFilter');
  if(mf && mf.options.length<=1){ [...new Set((appData.shipments||[]).map(function(s){return s.merchant;}).filter(Boolean))].forEach(function(m){ mf.innerHTML += '<option>'+m+'</option>'; }); }
  if(cf && cf.options.length<=1){ [...new Set((appData.shipments||[]).map(function(s){return s.courier||s.courierName;}).filter(Boolean))].forEach(function(c){ cf.innerHTML += '<option>'+c+'</option>'; }); }
  var list = getWarehouseReturns();
  var el = document.getElementById('warehouseReturnsBody');
  if(!el) return;
  var tot = document.getElementById('wrTotal'); if(tot) tot.textContent = list.length;
  var codEl = document.getElementById('wrCod'); if(codEl) codEl.textContent = list.reduce(function(a,s){ return a+Number(s.cod||s.amount||0); },0);
el.innerHTML = list.map(function(s){
  var days = daysInWarehouse(s);
  var red = days>=3 ? 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded' : 'text-slate-600';
  return '<tr class="border-b border-slate-100 hover:bg-slate-50">'
    + '<td class="p-3 font-bold">'+(s.code||s.id)+'</td>'
    + '<td class="p-3"><button class="text-blue-600 underline font-bold" onclick="openMerchantReturnsCard(\''+s.merchant+'\')">'+(s.merchant||'-')+'</button></td>'
    + '<td class="p-3">'+(s.customer||s.customerName)+' / '+(s.phone||s.customerPhone||'-')+' / '+(s.area||'')+' / '+(s.city||'')+'</td>'
    + '<td class="p-3">'+(s.courier||s.courierName||'-')+'</td>'
    + '<td class="p-3">'+s.status+' - '+(s.notes||s.note||'-')+'</td>'
    + '<td class="p-3 font-bold">'+(s.cod||s.amount||0)+'</td>'
    + '<td class="p-3"><span class="'+red+'">'+days+' يوم '+(days>=3?'⚠️':'')+'</span></td>'
    + '<td class="p-3">محاولة '+(s.attempt||1)+'</td>'
    + '<td class="p-3">'+(s.assignedToMerchant?'تم الاسناد ✅':'في المخزن')+'</td>'
    + '<td class="p-3 flex gap-1"><button onclick="openMerchantReturnsCard(\''+s.merchant+'\')" class="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs">كارت التاجر</button>'
    + (canRenew(s) ? '<button onclick="renewShipment(\''+(s.code||s.id)+'\')" class="bg-green-600 text-white px-2 py-1 rounded-lg text-xs">اعادة تجديد</button>' : '<span class="text-[10px]">تجديد اونر فقط</span>')
    + '</td></tr>';
}).join('') || '<tr><td colspan="10" class="p-4 text-center text-slate-400">مفيش مرتجعات في المخزن</td></tr>';
    }

function openMerchantReturnsCard(merchant){
  _currentReturnMerchant = merchant;
  _selectedReturnIds = new Set();
  var list = (appData.shipments||[]).filter(function(s){ return s.merchant===merchant && isReturnStatus(s) && s.warehouseApproved && !s.assignedToMerchant; });
  document.getElementById('mrmTitle').textContent = 'كارت التاجر - '+merchant+' ('+list.length+' مرتجع)';
  document.getElementById('mrmBody').innerHTML = list.map(function(s){
    return '<tr><td><input type="checkbox" onchange="toggleReturnSelect(\''+(s.code||s.id)+'\',this.checked)"></td>'
    + '<td>'+(s.code||s.id)+'</td><td>'+(s.customer||s.customerName)+'</td><td>'+s.status+'</td>'
    + '<td>'+(s.cod||s.amount||0)+'</td><td>'+(s.shippingFee||s.mShip||0)+'</td>'
    + '<td>'+daysInWarehouse(s)+' يوم</td><td>محاولة '+(s.attempt||1)+'</td></tr>';
  }).join('');
  var logs = (appData.returnLogs||[]).filter(function(l){ return l.merchant===merchant; }).slice(-5).reverse();
  document.getElementById('mrmLog').innerHTML = logs.map(function(l){ return 'تم الاسناد بواسطة '+l.by+' - بتاريخ '+l.at+' - '+l.count+' شحنات - خصم '+l.total+' ج'; }).join('<br>') || 'مفيش اسناد سابق';
  updateReturnSummary();
  document.getElementById('merchantReturnsModal').classList.remove('hidden');
}
function closeMerchantReturnsModal(){ document.getElementById('merchantReturnsModal').classList.add('hidden'); }
function toggleReturnSelect(id,checked){ if(checked) _selectedReturnIds.add(id); else _selectedReturnIds.delete(id); updateReturnSummary(); }
function selectAllMerchantReturns(v){
  document.querySelectorAll('#mrmBody input[type=checkbox]').forEach(function(cb){ cb.checked=v; toggleReturnSelect(cb.closest('tr').children[1].textContent.trim(),v); });
}
function updateReturnSummary(){
  var list = (appData.shipments||[]).filter(function(s){ return _selectedReturnIds.has(s.code||s.id); });
  var cod = list.reduce(function(a,s){ return a+Number(s.cod||s.amount||0); },0);
  var ship = list.reduce(function(a,s){ return a+Number(s.shippingFee||s.mShip||0); },0);
  document.getElementById('mrmSummary').textContent = 'انت حددت '+list.length+' شحنات - هيتخصم '+cod+' COD + '+ship+' شحن = '+(cod+ship)+' من محفظة '+_currentReturnMerchant+' - متأكد؟';
}
function assignSelectedReturns(){
  if(_selectedReturnIds.size===0) return alert('حدد شحنة الاول');
  if(!confirm(document.getElementById('mrmSummary').textContent)) return;
  var by = getCurrentUserName();
  var total=0, count=0;
  (appData.shipments||[]).forEach(function(s){
    if(_selectedReturnIds.has(s.code||s.id)){
      if(s.assignedToMerchant) return;
      var deduct = Number(s.cod||s.amount||0) + Number(s.shippingFee||s.mShip||0);
      total+=deduct; count++;
      s.assignedToMerchant = true;
      s.assignedAt = new Date().toISOString().slice(0,10);
      s.assignedBy = by;
      s.returnId = s.returnId || ('RET-'+(s.code||s.id)+'-'+(s.attempt||1));
      var m = (appData.merchants||[]).find(function(x){ return x.name===s.merchant; });
      if(m) m.wallet = Number(m.wallet||0) - deduct;
    }
  });
  appData.returnLogs = appData.returnLogs||[];
  appData.returnLogs.push({merchant:_currentReturnMerchant, by:by, at:new Date().toLocaleString('ar-EG'), count:count, total:total});
  saveDataSafe(); renderWarehouseReturns(); closeMerchantReturnsModal();
  alert('تم اسناد '+count+' شحنة - اتخصم '+total+' من '+_currentReturnMerchant);
}
function canRenew(s){
  var role = getCurrentRole();
  if((s.attempt||1) >= 2 && role!=='owner') return false;
  return true;
}
function renewShipment(id){
  var s = (appData.shipments||[]).find(function(x){ return (x.code||x.id)===id; });
  if(!s) return;
  if(!canRenew(s)) return alert('التجديد بعد المحاولة التانية بصلاحية الاونر بس');
  if(!confirm('تجديد '+s.code+' - هتطلع تاني محاولة '+((s.attempt||1)+1)+' ؟')) return;
  s.attempt = (s.attempt||1)+1;
  s.status = 'جديد';
  s.warehouseApproved = false;
  s.assignedToMerchant = false;
  s.renewedAt = new Date().toISOString();
  s.renewedBy = getCurrentUserName();
  s.notes = (s.notes||'') + ' | تم التجديد محاولة '+s.attempt;
  saveDataSafe(); renderWarehouseReturns();
  alert('تم التجديد - '+s.code+' بقت محاولة '+s.attempt+' وحالتها جديد');
}
function openWarehouseShipmentsModal(){
  var list = getWarehouseReturns();
  document.getElementById('wsBody').innerHTML = '<table class="w-full text-sm"><thead><tr><th>كود</th><th>تاجر</th><th>عميل / رقم / منطقة / محافظة</th><th>مندوب</th><th>سبب</th><th>مبلغ</th><th>اكشن</th></tr></thead><tbody>'+list.map(function(s){ return '<tr class="border-b"><td>'+s.code+'</td><td>'+s.merchant+'</td><td>'+s.customer+' / '+(s.phone||'-')+' / '+(s.area||'')+' / '+(s.city||'')+'</td><td>'+(s.courier||'-')+'</td><td>'+s.status+' - '+(s.notes||'')+'</td><td>'+s.cod+'</td><td><button onclick="renewShipment(\''+s.code+'\')" class="bg-green-600 text-white px-2 rounded">اعادة تجديد</button></td></tr>'; }).join('')+'</tbody></table>';
  document.getElementById('warehouseShipmentsModal').classList.remove('hidden');
}
function closeWarehouseShipmentsModal(){ document.getElementById('warehouseShipmentsModal').classList.add('hidden'); }
function approveWarehouseReturn(id){
  var s = (appData.shipments||[]).find(function(x){ return (x.code||x.id)===id; });
  if(!s) return;
  s.warehouseApproved = true;
  s.warehouseReceivedAt = new Date().toISOString();
  s.warehouseApprovedAt = new Date().toISOString();
  saveDataSafe(); renderWarehouseReturns();
}
document.addEventListener('DOMContentLoaded', renderWarehouseReturns);




async function approveMerchantRequest(id, merchantName, merchantPhone) {
    try {
        // 1. جلب اختيار نوع الشحن من الواجهة (لو موجود في صفحة الاعتماد)
        const shippingTypeSelect = document.getElementById(`shippingType-${id}`) || document.getElementById('merchantShippingType');
        const shippingType = shippingTypeSelect ? shippingTypeSelect.value : 'inclusive';

        const res = await fetch(`${API_BASE_URL}/merchant-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                requestId: id, 
                action: 'approve',
                shippingType: shippingType // إرسال نوع الشحن المختار مع طلب الاعتماد
            })
        });

        if (res.ok) {
            showNotification("تم قبول التاجر بنجاح ☁️", "success");
            
            if (merchantPhone) {
                const formattedPhone = merchantPhone.startsWith('0') ? '2' + merchantPhone : '20' + merchantPhone.replace(/^0+/, '');
                const welcomeMsg = `مرحباً بك يا ${merchantName || 'عزيزنا التاجر'} في سفيرة للشحن 🎉 تم قبول واعتماد حسابك بنجاح.`;
                window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(welcomeMsg)}`, '_blank');
            }
            
            // تحديث البيانات من السحاب فوراً
            loadCloudData();
        } else {
            showNotification("فشل التنفيذ", "error");
        }
    } catch (e) {
        console.error("Approval error:", e);
        showNotification("خطأ في الاتصال بالسيرفر", "error");
    }
}




async function rejectMerchantRequest(id, merchantName) {
    if (!confirm(`هل أنت متأكد من رغبتك في رفض طلب التاجر (${merchantName || 'بدون اسم'})؟`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/merchant-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: id, action: 'reject' })
        });

        if (res.ok) {
            showNotification("تم رفض طلب التاجر بنجاح ❌", "success");
            loadCloudData(); // تحديث الجدول
        } else {
            showNotification("فشل تنفيذ عملية الرفض", "error");
        }
    } catch (e) {
        console.error("Rejection error:", e);
        showNotification("خطأ في الاتصال بالسيرفر", "error");
    }
}

// ربط الدالة بالنافذة العامة
window.rejectMerchantRequest = rejectMerchantRequest;


function openRejectMerchantModal(id) {
    const input = document.getElementById('rejectMerchantId');
    if (input) input.value = id;
    document.getElementById('rejectMerchantModal')?.classList.remove('hidden');
}

function closeRejectMerchantModal() {
    document.getElementById('rejectMerchantModal')?.classList.add('hidden');
}

// دالة شاملة لحفظ أو تحديث بيانات التاجر مع نوع الشحن
function handleMerchantsSubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('merchantName');
    const phoneInput = document.getElementById('merchantPhone');
    const usernameInput = document.getElementById('merchantUsername');
    const shippingTypeSelect = document.getElementById('merchantShippingType');

    if (!nameInput || !phoneInput) return;

    const merchantData = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        username: usernameInput ? usernameInput.value.trim() : nameInput.value.trim(),
        shippingType: shippingTypeSelect ? shippingTypeSelect.value : 'inclusive' // شامل أو غير شامل الشحن
    };

    // التحقق من وجود مصفوفة التجار وإضافة أو تحديث التاجر
    if (typeof appData !== 'undefined') {
        if (!appData.merchants) appData.merchants = [];
        
        // لو التاجر موجود مسبقاً بنحدثه، لو مش موجود بنضيفه
        const existingIndex = appData.merchants.findIndex(m => m.name === merchantData.name || m.username === merchantData.username);
        if (existingIndex >= 0) {
            appData.merchants[existingIndex] = { ...appData.merchants[existingIndex], ...merchantData };
        } else {
            appData.merchants.push(merchantData);
        }
    }

    // إغلاق النافذة المنسدلة بعد الحفظ
    const modal = document.getElementById('addMerchantModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    // إرسال البيانات للسيرفر لو متوفر
    if (typeof API_BASE !== 'undefined') {
        fetch(`${API_BASE}/merchants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merchantData)
        }).catch(err => console.log("Merchant sync note:", err));
    }

    alert('تم حفظ بيانات التاجر ونوع الشحن بنجاح');
    
    // إعادة رسم الجداول لتطبيق التغييرات
    if (typeof renderMerchantTable === 'function') renderMerchantTable();
}

// ربط الدالة بالحدث العام
window.handleMerchantsSubmit = handleMerchantsSubmit;



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

// 1. تعبئة قائمة التجار المسجلين في قائمة الـ Select (للأوردرات والإكسيل)
function populateMerchantDropdowns() {
    const orderSelect = document.getElementById('newMerchantSelect');
    const excelSelect = document.getElementById('excelMerchantSelect');

    const optionsHTML = `
        <option value="">-- اختر التاجر المسجل --</option>
        <option value="unregistered_other">➕ تاجر خارجي / غير مسجل</option>
    `;

    if (orderSelect) {
        orderSelect.innerHTML = optionsHTML;
        if (typeof appData !== 'undefined' && appData.merchants) {
            appData.merchants.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name;
                opt.textContent = m.name + (m.shippingType === 'exclusive' ? ' (غير شامل الشحن)' : ' (شامل الشحن)');
                orderSelect.appendChild(opt);
            });
        }
    }

    if (excelSelect) {
        excelSelect.innerHTML = `<option value="">-- اعتمد اسم التاجر من ملف الإكسيل مباشرة --</option>`;
        if (typeof appData !== 'undefined' && appData.merchants) {
            appData.merchants.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name;
                opt.textContent = m.name;
                excelSelect.appendChild(opt);
            });
        }
    }
}

// 2. إظهار أو إخفاء خانة كتابة اسم التاجر الخارجي لو اختار "تاجر غير مسجل"
function toggleUnregisteredMerchantInput() {
    const select = document.getElementById('newMerchantSelect');
    const customInput = document.getElementById('customMerchantInput');
    if (!select || !customInput) return;

    if (select.value === 'unregistered_other') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
}

// 3. دالة استخراج اسم التاجر الصحيح (سواء من القائمة أو من خانة التاجر الخارجي) وحفظه مع الـ shipments
function getSelectedMerchantName() {
    const select = document.getElementById('newMerchantSelect');
    if (!select) return '';
    
    if (select.value === 'unregistered_other') {
        const customInput = document.getElementById('customMerchantInput');
        return customInput ? customInput.value.trim() : 'تاجر خارجي';
    }
    return select.value;
}

// 4. ربط الشحنة بكارت الذاكرة الخاص بالتاجر وتتبعها داخل مصفوفة shipments
function recordMerchantShipmentToMemory(shipmentData) {
    const merchantName = shipmentData.merchant || shipmentData.merchantName || getSelectedMerchantName() || "تاجر غير مسجل";

    if (typeof appData === 'undefined') window.appData = {};
    if (!appData.virtualMerchantsCards) {
        appData.virtualMerchantsCards = {};
    }

    // إنشاء كارت التاجر في الذاكرة لو مش موجود
    if (!appData.virtualMerchantsCards[merchantName]) {
        appData.virtualMerchantsCards[merchantName] = {
            name: merchantName,
            createdAt: new Date().toISOString(),
            shipments: [] // مصفوفة الشحنات الخاصة بالتاجر
        };
    }

    // إضافة الشحنة لكارت التاجر بالتاريخ والبيانات
    appData.virtualMerchantsCards[merchantName].shipments.push({
        ...shipmentData,
        dateAdded: new Date().toLocaleString()
    });

    // التأكد من وجود مصفوفة shipments العامة في النظام وتحديثها
    if (!appData.shipments) appData.shipments = [];
}

// تشغيل تعبئة القوائم تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    populateMerchantDropdowns();
});

window.populateMerchantDropdowns = populateMerchantDropdowns;
window.toggleUnregisteredMerchantInput = toggleUnregisteredMerchantInput;
window.getSelectedMerchantName = getSelectedMerchantName;
window.recordMerchantShipmentToMemory = recordMerchantShipmentToMemory;

// ==========================================
// دالة جلب وعرض المناديب وتعبئة قوائم التوزيع
// ==========================================
async function loadCouriersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/couriers`);
        if (!response.ok) return;
        const couriers = await response.json();

        appData.couriers = couriers;
        if (appData.users) appData.users.couriers = couriers;

        // 1. تحديث جدول المناديب (في صفحة إدارة المناديب)
        const tbody = document.querySelector('#couriersTableBody') || document.querySelector('#couriers-table');
        if (tbody) {
            tbody.innerHTML = couriers.map((c, index) => `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3">${index + 1}</td>
                    <td class="p-3 font-bold">${c.name || 'مندوب'}</td>
                    <td class="p-3">${c.phone || ''}</td>
                    <td class="p-3">${c.zone || c.city || 'عام'}</td>
                    <td class="p-3 text-center">
                        <button class="text-rose-600 hover:text-rose-800 font-bold" onclick="deleteCourier('${c._id || c.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد مناديب مسجلين</td></tr>`;
        }

        // 2. تحديث قائمة اختيار المناديب في لوحة التوزيع اللوجستي (Dropdown)
        const courierSelects = document.querySelectorAll('#courierSelectBox, select[name="courier"], .courier-dropdown-select');
        courierSelects.forEach(selectBox => {
            const currentValue = selectBox.value;
            selectBox.innerHTML = '<option value="">اختر المندوب للتحويل الجماعي...</option>';
            couriers.forEach(c => {
                const courierName = c.name || c.username || 'مندوب';
                selectBox.innerHTML += `<option value="${courierName}">${courierName} (${c.phone || ''})</option>`;
            });
            selectBox.value = currentValue;
        });
        
        console.log("تم تحديث جدول المناديب وقوائم التوزيع بنجاح 🚀");
    } catch (err) {
        console.error("Error loading couriers table:", err);
    }
}
window.loadCouriersTable = loadCouriersTable;
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
// 2. دالة حفظ الإيرادات والمصروفات الموحدة بدون Refresh
// ==========================================
async function handleSaveTransaction(event) {
    if (event) event.preventDefault(); // منع إعادة تحميل الصفحة نهائياً

    // محاولة جلب الحقول بتسميات مختلفة لضمان العمل مع أي نموذج
    const typeInput = document.getElementById('transactionType') || document.getElementById('incomeType') || document.getElementById('expenseType');
    const amountInput = document.getElementById('transactionAmount') || document.getElementById('incomeAmount') || document.getElementById('expenseAmount');
    const descInput = document.getElementById('transactionDesc') || document.getElementById('incomeDesc') || document.getElementById('expenseDesc') || document.getElementById('expenseNote');
    const dateInput = document.getElementById('transactionDate') || document.getElementById('incomeDate') || document.getElementById('expenseDate');

    const type = typeInput ? typeInput.value : 'مقبوضات';
    const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;
    const description = descInput ? descInput.value : '';
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    if (amount <= 0) {
        showNotification("يرجى إدخال مبلغ صحيح", "error");
        return;
    }

    if (!appData.transactions) appData.transactions = [];

    const newTx = {
        id: 'TX-' + Date.now(),
        type,
        amount,
        description,
        date
    };

    appData.transactions.unshift(newTx);

    // إغلاق كافة النوافذ المنبثقة الخاصة بالإيرادات أو المصروفات فوراً
    ['transactionModal', 'incomeModal', 'expenseModal', 'addIncomeModal', 'addExpenseModal'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    });

    showNotification("تم حفظ المعاملة المالية وتحديث الخزينة بنجاح 🚀", "success");

    // حفظ محلياً وتحديث واجهة الخزينة
    saveData(appData);
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof renderOverviewStats === 'function') renderOverviewStats();

    // إرسال البيانات سحابياً في الخلفية
    try {
        await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions: appData.transactions })
        });
    } catch (e) {
        console.warn("Background Sync Error:", e);
    }
}
window.handleSaveTransaction = handleSaveTransaction;

// منع الـ Refresh لأي نموذج معاملة مالية تلقائياً عند الضغط على حفظ
document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.id.includes('transaction') || form.id.includes('income') || form.id.includes('expense')) {
            form.addEventListener('submit', handleSaveTransaction);
        }
    });
});

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
