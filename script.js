      
   // رابط الباك إند المربوط على Vercel
        const API_BASE_URL = 'https://safira-logistic.vercel.app/api';
  const API_BASE = API_BASE_URL;
      
    let currentUser = null;
    let selectedGovernorateFilter = null;
    let activeChatCustomerId = null;
let currentSelectedCourierId = null;
let currentSelectedMerchantId = null;
      
   let appData = {
    users: {
        owner: { name: "مؤمن", pass: "admin123", role: "owner" },
        merchants: [],
        couriers: [],
        merchantRequests: []
    },
    merchants: [],                  // <--- أضفناها هنا في الجذر الرئيسي لتجنب خطأ length
    couriers: [],                   // <--- المناديب
    payoutRequests: [],          
    settlementRequests: [],      
    merchantPricing: [],
    courierPricing: [],
    cairoMerchantPricing: [],
    cairoCourierCommission: [],
    shipments: [],
    financeTransactions: [],
    chatMessages: {}
};
    window.onload = function() {
        checkLoginState();
    };

      // دالة التأمين تُعرّف في أعلى الملف لضمان رؤيتها دائماً
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
        


function openAddCourierModal() {
    const modal = document.getElementById('addCourierModal');
    if (modal)  {
        // نقل المودال لآخر الـ body مباشرة عشان يهرب من أي تصميم حاجب ليه
        document.body.appendChild(modal);
        
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        console.log("تم تنفيذ دالة الفتح والمودال ظاهر الآن!");
    } else {
        console.error("عنصر addCourierModal غير موجود في الصفحة!");
    }
}

function closeExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function downloadExcelFile() {
    const ws = XLSX.utils.json_to_sheet(appData.shipments);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shipments");
    XLSX.writeFile(wb, "Safira_Shipments_2026.xlsx");
    closeExcelModal();
    showNotification("تم تحميل ملف الإكسيل بنجاح", "success");
}

    // دالة إغلاق نافذة إضافة مندوب
    function closeAddCourierModal() {
        const modal = document.getElementById('addCourierModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
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
    const cairoZoneInput = document.getElementById('courierCairoZoneInput'); // تعديل هنا

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const type = typeSelect ? typeSelect.value : 'cairo';

    // تحديد المنطقة المسؤولة بدقة
    let selectedZone = '';
    if (type === 'governorate') {
        selectedZone = citySelect ? citySelect.value : 'محافظة';
    } else {
        selectedZone = cairoZoneInput ? cairoZoneInput.value.trim() : 'القاهرة الكبرى'; // تعديل هنا
    }

    if (!name || !phone) {
        showNotification("يرجى إدخال اسم المندوب ورقم الهاتف على الأقل", "error");
        return;
    }

    // 1️⃣ إنشاء كائن مندوب مؤقت وإضافته محلياً فوراً (Optimistic UI)
    const newCourier = { 
        id: Date.now(), 
        name, 
        phone, 
        password, 
        type, 
        zone: selectedZone, 
        status: 'متاح' 
    };

    if (!appData.couriers) appData.couriers = [];
    appData.couriers.unshift(newCourier);

    // 2️⃣ إغلاق المودال وتحديث الواجهة فوراً (استجابة لحظية)
    closeAddCourierModal();
    if (typeof renderCouriersSection === 'function') renderCouriersSection();
    
    // تصفير الحقول فوراً
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showNotification("تم إضافة المندوب محلياً، جاري فتح رسالة الواتساب والمزامنة...", "info");

    // 📱 3️⃣ إرسال رابط تفعيل الحساب عبر الواتساب للمندوب تلقائياً
    const formattedPhone = phone.startsWith('0') ? '2' + phone : '20' + phone.replace(/^0+/, '');
    const resetPassLink = `https://moamen0996.github.io/safira-courier-frontend/reset-password.html?phone=${phone}`;
    const courierMsg = `أهلاً بك يا ${name} كمندوب ميداني في شركة سفيرة للخدمات اللوجستية والشحن 🛵\nتم إنشاء حسابك بنجاح.\n\n📌 نطاق العمل: ${selectedZone}\nيرجى الدخول لتفعيل حسابك وتعيين كلمة المرور الخاصة بك:\n${resetPassLink}`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(courierMsg)}`, '_blank');

    // 4️⃣ الحفظ سحابياً في الخلفية (Background Sync)
    try {
        const response = await fetch(`${API_BASE}/couriers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, type, zone: selectedZone, status: 'متاح' })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification("تم مزامنة المندوب سحابياً بنجاح ☁️🚀", "success");
        } else {
            showNotification(result.message || "فشل الحفظ على السيرفر", "error");
        }
    } catch (err) {
        console.error("خطأ في حفظ المندوب:", err);
        showNotification("حدث خطأ في الاتصال بالباك إند أثناء المزامنة", "error");
    }
}
      
      // دالة الإشعارات العامة (يُفضل وضعها في أعلى ملف السكريبت لتكون متاحة دائماً)
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
    ensureAppDataStructure(); // <--- استدعِ الدالة هنا في أول سطر
    try {
        showNotification("... جاري جلب البيانات من السيرفر السحابي", "info");
        
        // ... باقي كود الجلب الخاص بك كما هو ...
            
            // جلب الشحنات من الباك إند
            const shipmentsRes = await fetch(`${API_BASE_URL}/shipments`);
            if (shipmentsRes.ok) {
                const shipmentsData = await shipmentsRes.json();
                appData.shipments = shipmentsData.shipments || shipmentsData || [];
            }

            // جلب التجار من الباك إند
            const merchantsRes = await fetch(`${API_BASE_URL}/merchants`);
            if (merchantsRes.ok) {
                const merchantsData = await merchantsRes.json();
                appData.users.merchants = merchantsData.merchants || merchantsData || [];
            }

            // جلب المناديب من الباك إند
            const couriersRes = await fetch(`${API_BASE_URL}/couriers`);
            if (couriersRes.ok) {
                const couriersData = await couriersRes.json();
                appData.users.couriers = couriersData.couriers || couriersData || [];
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

    // ضع الرابط الكامل وصريحاً هنا مباشرة
    const API_BASE = 'https://safira-logistic.vercel.app/api';

    try {
        const res = await fetch(`${API_BASE}/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

                // التحقق مما إذا كان الرد عبارة عن JSON صحيح وليس صفحة خطأ 404 HTML
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("السيرفر لم يعود ببيانات JSON (غالباً مسار الـ API غير موجود 404)");
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
                console.warn("API Login Notice (Fallback mode active):", err.message);
                
                // نظام التشغيل التجريبي والمحلي (Fallback) يتيح الدخول فوراً بجميع الصلاحيات للاختبار
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

    let currentTab = 'overview';

    function initDashboard() {
        if (!currentUser) return;
        
        document.getElementById('currentLoggedInName').innerText = currentUser.name || "مستخدم";
        document.getElementById('currentLoggedInInitial').innerText = (currentUser.name || "M").charAt(0);
        
        if (currentUser.role === 'owner' || currentUser.role === 'admin') {
            document.getElementById('currentUserRoleBadge').innerText = "الأونر / مدير عام";
            document.getElementById('currentLoggedInRoleText').innerText = "صلاحيات الأونر الكاملة";
        } else {
            document.getElementById('currentUserRoleBadge').innerText = "تاجر معتمد";
            document.getElementById('currentLoggedInRoleText').innerText = "بوابة إدارة المتجر";
        }

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
    }

  // تحديد التبويبات المتاحة حسب الصلاحية الوظيفية
       function renderTabs() {
            const container = document.getElementById('navigationTabsContainer');
            if (!container) return;

            // توحيد قراءة الرول ومعالجة الحروف الكبيرة أو المسميات المختلفة للأونر
            let role = (currentUser && currentUser.role) ? currentUser.role.toLowerCase().trim() : 'owner';
            if (role === 'admin' || role === 'مؤمن' || role === 'owner') {
                role = 'owner';
            }

            let tabs = [];

            switch(role) {
                case 'owner': // المدير العام (كل الصلاحيات)
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
                // 🔒 الحماية الأمنية: منع الوصول تماماً لأي رول غير مفرّغ أو مجهول
                tabs = []; 
                container.innerHTML = `<div class="p-4 text-red-600 font-bold bg-red-50 rounded-xl border border-red-200">عفواً، لا توجد صلاحيات مخصصة لهذا الحساب. يرجى مراجعة الإدارة.</div>`;
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
    
    // أول ما تفتح تبويب الخزينة، استدعي دالة عرض صفحة الخزينة فوراً
    if (tabId === 'finance') {
        if (typeof renderFinancePage === 'function') {
            renderFinancePage();
        }
    } else if (tabId === 'overview') {
        if (typeof renderOverviewStats === 'function') {
            renderOverviewStats();
        }
    }
}
        let myChartInstance = null;

        function renderOverviewStats() {
            let shipments = appData.shipments || [];
            if (currentUser && currentUser.role === 'merchant') {
                shipments = shipments.filter(s => s.merchant === currentUser.name);
            }

            document.getElementById('statTotalShipments').innerText = shipments.length;
            
            const merchantsEl = document.getElementById('statTotalMerchants');
            if (merchantsEl) merchantsEl.innerText = (appData.users && appData.users.merchants ? appData.users.merchants.length : 0) + " تاجر";
            
            const couriersEl = document.getElementById('statTotalCouriers');
            if (couriersEl) couriersEl.innerText = (appData.users && appData.users.couriers ? appData.users.couriers.length : 0) + " مندوب";

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

    function renderShipmentsTable() {
        const tbody = document.getElementById('shipmentsTableBody');
        if (!tbody) return;

        let shipments = appData.shipments;
        if (currentUser.role === 'merchant') {
            shipments = shipments.filter(s => s.merchant === currentUser.name);
        }

        const govContainer = document.getElementById('governoratesButtonsContainer');
        const uniqueGovs = [...new Set(appData.shipments.map(s => s.city))].filter(Boolean);
        govContainer.innerHTML = `
            <button onclick="filterByGovernorate(null)" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === null ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">الكل</button>
            ${uniqueGovs.map(g => `
                <button onclick="filterByGovernorate('${g}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGovernorateFilter === g ? 'bg-safira-600 text-white' : 'bg-slate-200 text-slate-700'}">${g}</button>
            `).join('')}
        `;

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
                    <div class="font-bold text-slate-900">${s.customer || '-'} (${s.phone || '-'})</div>
                    <div class="text-[11px] text-slate-500">${s.city || '-'} - ${s.address || '-'}</div>
                </td>
                <td class="py-3 px-4 font-black text-emerald-600">${s.amount || 0} ج.م</td>
                <td class="py-3 px-4 text-slate-600">${s.mShip || 0} ج.م / ${s.cShip || 0} ج.م</td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${s.status === 'تم التسليم' ? 'bg-emerald-100 text-emerald-700' : s.status === 'مرتجع' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                        ${s.status || 'قيد الانتظار'}
                    </span>
                </td>
                <td class="py-3 px-4 text-center space-x-1 space-x-reverse">
                    <button onclick="openWaybillModal('${s.id || s._id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="طباعة البوليصة"><i class="fa-solid fa-print"></i></button>
                    <button onclick="openTrackingModal('${s.id || s._id}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="تتبع خط سير الشحنة"><i class="fa-solid fa-map-location-dot"></i></button>
                    <button onclick="openCourierMapModal()" class="bg-amber-50 hover:bg-amber-100 text-amber-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="خريطة المندوب"><i class="fa-solid fa-satellite-dish"></i></button>
                    ${(currentUser.role === 'owner' || currentUser.role === 'admin') ? `<button onclick="requestDeleteShipment('${s.id || s._id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition" title="حذف الأوردر"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    }

function genericTableFilter(searchInputId, dateFromId, dateToId, dataList, searchKeys, renderCallback) {
    const query = document.getElementById(searchInputId)?.value.trim().toLowerCase() || '';
    const dateFrom = document.getElementById(dateFromId)?.value || '';
    const dateTo = document.getElementById(dateToId)?.value || '';

    const filtered = dataList.filter(item => {
        // فحص مطابقة كلمات البحث في الحقول المحددة للجدول
        const matchQuery = !query || searchKeys.some(key => {
            const val = getNestedValue(item, key);
            return val && val.toString().toLowerCase().includes(query);
        });

        // فحص نطاق التاريخ والوقت (من وإلى)
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

// دالة مساعده للوصول للخصائص المتداخلة إن وجدت
function getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => (o ? o[p] : null), obj);
}

      function filterShipmentsTable() {
    genericTableFilter(
        'shipmentSearchInput',    // حقل البحث
        'filterDateFrom',         // تاريخ البداية
        'filterDateTo',           // تاريخ النهاية
        appData.shipments || [],  // مصفوفة الشحنات الأصلية
        ['id', 'trackingNumber', 'merchant', 'governorate', 'address', 'recipientName', 'addedBy'], // مفاتيح البحث
        (filteredData) => renderShipmentsTableData(filteredData) // دالة الرسم
    );
}

function attachAuditMetadata(obj) {
    obj.addedBy = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || currentUser.username || 'مؤمن (الأنور)') : 'مدير النظام';
    obj.createdAt = new Date().toISOString(); // يحفظ التاريخ والوقت بدقة كاملة (سنة، شهر، يوم، ساعة، دقيقة)
    return obj;
}
      
      let newShipment = attachAuditMetadata({
    id: generateId(),
    merchant: merchantName,
governorate: typeof merchantGovernorate !== 'undefined' ? merchantGovernorate.value : 'القاهرة',
    // ... باقي البيانات
});

function filterMerchantsTable() {
    genericTableFilter(
        'merchantSearchInput',
        'merchantDateFrom',
        'merchantDateTo',
        appData.users.merchants || [],
        ['name', 'storename', 'phone', 'username', 'addedBy'], // مفاتيح البحث الخاصة بالتاجر
        (filteredData) => renderMerchantsTableData(filteredData) // دالة عرض التجار الخاصة بك
    );
}

function resetMerchantFilters() {
    document.getElementById('merchantSearchInput').value = '';
    document.getElementById('merchantDateFrom').value = '';
    document.getElementById('merchantDateTo').value = '';
    filterMerchantsTable();
}
      
      
      function filterExpensesTable() {
    genericTableFilter(
        'expenseSearchInput',
        'expenseDateFrom',
        'expenseDateTo',
        appData.financeTransactions || [],
        ['description', 'category', 'type', 'addedBy'], // مفاتيح البحث للمصروفات والمعاملات
        (filteredData) => renderExpensesTableData(filteredData) // دالة عرض جدول المصروفات لديك
    );
}

function resetExpenseFilters() {
    document.getElementById('expenseSearchInput').value = '';
    document.getElementById('expenseDateFrom').value = '';
    document.getElementById('expenseDateTo').value = '';
    filterExpensesTable();
}
      
      
function resetShipmentFilters() {
    document.getElementById('shipmentSearchInput').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    filterShipmentsTable();
}
      
    function filterByGovernorate(gov) {
        selectedGovernorateFilter = gov;
        renderShipmentsTable();
    }

    function resetGovernorateFilter() {
        selectedGovernorateFilter = null;
        renderShipmentsTable();
    }

    function renderWarehouseTables() {
        const deliveryTbody = document.getElementById('warehouseDeliveryTable');
        const returnsTbody = document.getElementById('warehouseReturnsTable');
        if (!deliveryTbody || !returnsTbody) return;

        const pendingDelivery = appData.shipments.filter(s => !s.warehouseReceived && s.status !== 'مرتجع');
        const pendingReturns = appData.shipments.filter(s => s.returnRequested);

        deliveryTbody.innerHTML = pendingDelivery.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد شحنات معلقة بانتظار استلام المخزن</td></tr>` : 
            pendingDelivery.map(s => `
                <tr>
                    <td class="p-2.5 font-mono font-bold">${s.id || s._id}</td>
                    <td class="p-2.5">${s.customer} (${s.city})</td>
                    <td class="p-2.5 font-bold text-emerald-600">${s.amount} ج.م</td>
                    <td class="p-2.5 text-center">
                        <button onclick="approveWarehouseDelivery('${s.id || s._id}')" class="bg-safira-600 hover:bg-safira-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold">اعتماد واستلام</button>
                    </td>
                </tr>
            `).join('');
// دالة تنفيذ اعتماد الاستلام وإرسال رسالة الواتساب للعميل
    async function approveOrderAndNotifyCustomer(orderId, customerName, customerPhone, amount, merchantName) {
        try {
            // 1️⃣ إرسال طلب الاعتماد للباك إند سحابياً
            const res = await fetch(`${API_BASE_URL}/orders/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: 'تم الاستلام' })
            });

            if (res.ok) {
                showNotification("تم اعتماد استلام الشحنة بنجاح سحابياً ☁️", "success");

                // 2️⃣ إرسال رسالة الواتساب التلقائية للعميل لتأكيد تفاصيل الأوردر
                if (customerPhone) {
                    const formattedPhone = customerPhone.startsWith('0') ? '2' + customerPhone : '20' + customerPhone.replace(/^0+/, '');
                    const customerMsg = `أهلاً بك يا ${customerName} 👋\nتؤكد شركة *سفيرة للخدمات اللوجستية والشحن* استلام وتأكيد شحنتك الخاصة بـ (${merchantName}). 📦\n\n📌 تفاصيل الأوردر:\n- رقم الشحنة: ${orderId}\n- المبلغ المطلوب إجمالياً: ${amount} ج.م\n\nشكراً لتعاملكم معنا، ونتمنى دائماً أن نكون عند حسن ظنكم! 🚀`;
                    
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(customerMsg)}`, '_blank');
                }

                // تحديث البيانات في الواجهة
                if (typeof loadCloudData === 'function') loadCloudData();
                renderWarehouseOrReturns();
            } else {
                showNotification("فشل اعتماد الشحنة على السيرفر", "error");
            }
        } catch (err) {
            console.error("Error approving order:", err);
            showNotification("خطأ في الاتصال بالباك إند", "error");
        }
    }

      
        returnsTbody.innerHTML = pendingReturns.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد مرتجعات معلقة بانتظار الاعتماد</td></tr>` : 
            pendingReturns.map(s => `
                <tr>
                    <td class="p-2.5 font-mono font-bold">${s.id || s._id}</td>
                    <td class="p-2.5"><span class="text-rose-600 font-bold">${s.returnReason || 'بدون سبب'}</span></td>
                    <td class="p-2.5 font-bold">${s.amount} ج.م</td>
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
                showNotification("فشل تحديث حالة الشحنة على السيرفر", "error");
            }
        } catch (e) {
            showNotification("حدث خطأ في الاتصال بالباك إند", "error");
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
                showNotification("فشل اعتماد المرتجع على السيرفر", "error");
            }
        } catch (e) {
            showNotification("حدث خطأ في الاتصال بالباك إند", "error");
        }
    }

    function renderCustomersList() {
        const container = document.getElementById('customersListContainer');
        if (!container) return;

        const customersMap = {};
        appData.shipments.forEach(s => {
            if (s.phone && !customersMap[s.phone]) {
                customersMap[s.phone] = { name: s.customer, phone: s.phone, city: s.city, shipmentId: s.id || s._id };
            }
        });

        const customers = Object.values(customersMap);
        document.getElementById('customerCountBadge').innerText = customers.length;

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
// دالة استيراد الشحنات من ملف Excel دفعة واحدة
     // دالة استيراد الشحنات من ملف Excel دفعة واحدة
function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // اختيار الشيت الأنسب (نبحث عن شيت "جميع الفواتير" أو نأخذ الأولى)
            let sheetName = workbook.SheetNames[0];
            if (workbook.SheetNames.includes("جميع الفواتير")) {
                sheetName = "جميع الفواتير";
            } else if (workbook.SheetNames.includes("الفواتير")) {
                sheetName = "الفواتير";
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
                showNotification("ملف الإكسيل فارغ أو غير مدعوم", "error");
                return;
            }

            const importedShipments = [];

            jsonData.forEach(row => {
                // دعم كامل لكافة احتمالات أسماء الأعمدة في ملفات الإكسيل المختلفة
                const newShipment = {
                    id: row['رقم الشحنة'] || row['رقم الفاتورة'] || row['ID'] || 'SAF-' + Math.floor(100000 + Math.random() * 900000),
                    merchant: row['التاجر'] || row['إسم البائع'] || row['Merchant'] || (currentUser ? currentUser.name : 'تاجر عام'),
                    recipientName: row['الاسم العميل '] || row['اسم العميل'] || row['الاسم العميل'] || row['إسم المشترى'] || row['Recipient'] || 'عميل بدون اسم',
                    phone: row['رقم الهاتف'] || row['الهاتف'] || row['Phone'] || '',
                    address: row['العنوان التفصيلي'] || row['العنوان'] || row['عنوان المشترى'] || row['Address'] || '',
                    city: row['المحافظة'] || row['City'] || 'القاهرة',
                    cost: parseFloat(row['المبلغ'] || row['الإجمالى'] || row['Cost'] || 0),
                    mShip: parseFloat(row['سعر الشحن'] || row['خدمة التوصيل'] || row['Shipping'] || 50),
                    status: row['الحاله'] || row['الحالة'] || 'جديدة',
                    date: new Date().toISOString().split('T')[0]
                };

                if (!appData.shipments) appData.shipments = [];
                appData.shipments.unshift(newShipment);
                importedShipments.push(newShipment);
            });

            if (typeof renderOverviewStats === 'function') renderOverviewStats();
            if (typeof renderShipmentsTable === 'function') renderShipmentsTable();

            showNotification(`تم استيراد ${importedShipments.length} شحنة محلياً، جاري المزامنة السحابية...`, "success");
            event.target.value = '';

            try {
                const response = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : API_BASE_URL}/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shipments: importedShipments })
                });

                if (response.ok) {
                    showNotification("تمت المزامنة السحابية للشحنات بنجاح ☁️🚀", "success");
                } else {
                    throw new Error("فشل الحفظ السحابي");
                }
            } catch (apiErr) {
                console.error("Background Sync Error:", apiErr);
                showNotification("تم حفظ الشحنات محلياً، وتعذر الحفظ السحابي حالياً", "error");
            }

        } catch (err) {
            console.error("Excel Parse Error:", err);
            showNotification("حدث خطأ أثناء قراءة ملف الإكسيل، تأكد من صحة التنسيق", "error");
        }
    };
    reader.readAsArrayBuffer(file);
}
    // دالة فتح موقع أو خط سير المندوب على تطبيقات الخرائط المختلفة
function openCourierMap(latitude, longitude, courierName = "المندوب", appType = 'google') {
    if (!latitude || !longitude) {
        showNotification("إحداثيات موقع المندوب غير متوفرة حالياً", "error");
        return;
    }

    let mapUrl = '';

    switch (appType) {
        case 'google':
            // فتح خرائط جوجل مباشرة (توجيه أو تحديد موقع)
            mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            break;

        case 'apple':
            // فتح خرائط أبل (خاص بأجهزة آيفون وماك)
            mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(courierName)}&ll=${latitude},${longitude}&z=16`;
            break;

        case 'waze':
            // فتح تطبيق Waze للملاحة المباشرة
            mapUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
            break;

        default:
            // رابط عالمي يكتشف نظام التشغيل تلقائياً (Universal Link)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                mapUrl = `https://maps.apple.com/?ll=${latitude},${longitude}`;
            } else {
                mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            }
    }

    // فتح الخريطة في نافذة جديدة أو تطبيق الخرائط الخاص بالجهاز
    window.open(mapUrl, '_blank');
}
    // دالة فتح عنوان استلام/تسليم الشحنة على تطبيق الخرائط
function openOrderLocationOnMap(address, city = '', lat = null, lng = null, provider = 'auto') {
    let mapUrl = '';

    // 1. إذا كانت الإحداثيات الدقيقة متوفرة
    if (lat && lng) {
        if (provider === 'apple') {
            mapUrl = `https://maps.apple.com/?daddr=${lat},${lng}`;
        } else if (provider === 'google') {
            mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        } else {
            // تلقائي حسب الجهاز
            mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
    } 
    // 2. إذا كان المتاح هو العنوان النصي فقط (اسم الشارع والمحافظة)
    else if (address) {
        const fullAddress = encodeURIComponent(`${address}, ${city}, مصر`);
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (provider === 'apple' || (provider === 'auto' && isIOS)) {
            mapUrl = `https://maps.apple.com/?q=${fullAddress}`;
        } else {
            mapUrl = `https://www.google.com/maps/search/?api=1&query=${fullAddress}`;
        }
    } else {
        showNotification("لا يوجد عنوان أو إحداثيات مسجلة لهذه الشحنة", "error");
        return;
    }

    window.open(mapUrl, '_blank');
}
    
    function selectCustomerForChat(phone) {
        const s = appData.shipments.find(x => x.phone === phone);
        if (!s) return;

        activeChatCustomerId = phone;
        document.getElementById('activeCustomerInitial').innerText = (s.customer || "C").charAt(0);
        document.getElementById('activeCustomerName').innerText = s.customer;
        document.getElementById('activeCustomerPhone').innerText = "رقم الهاتف: " + s.phone + " | محافظة: " + s.city;
        document.getElementById('whatsappActionContainer').classList.remove('hidden');
        
        document.getElementById('chatMessageInput').disabled = false;
        document.getElementById('sendChatBtn').disabled = false;

        const chatArea = document.getElementById('chatMessagesArea');
        chatArea.className = "flex-grow overflow-y-auto p-4 space-y-3 flex flex-col items-start text-xs bg-white rounded-xl border";
        
        let msgs = appData.chatMessages[phone] || [
            { sender: 'system', text: `مرحباً بك أ/ ${s.customer}، شحنتك رقم #${s.id || s._id} بمبلغ ${s.amount} ج.م جاري توصيلها إليك بواسطة سفيرة للخدمات اللوجستية.` }
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

        const msg = `مرحباً أ/ ${s.customer}، معك شركة سفيرة للشحن. تفاصيل شحنتك رقم #${s.id || s._id}: المبلغ المطلوب ${s.amount} ج.م، العنوان: ${s.city} - ${s.address}. شكرا لتعاملكم معنا!`;
        const url = `https://wa.me/2${s.phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    }

   function renderMerchantsSection() {
        const reqTbody = document.getElementById('merchant-requests-tbody');
        const payoutTbody = document.getElementById('payout-requests-tbody');
        const gridContainer = document.getElementById('merchantsGridContainer');
        if (!reqTbody || !payoutTbody || !gridContainer) return;

        const reqs = (appData.users && appData.users.merchantRequests) ? appData.users.merchantRequests : (appData.merchantRequests || []);
        
        const badge = document.getElementById('requests-count-badge');
        if (badge) badge.innerText = reqs.length + " طلب جديد";

        // 1️⃣ جدول طلبات الانضمام (مع أزرار قبول ورفض مدمجة بالواتساب)
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
                            <!-- زرار القبول مع رسالة الواتساب الفورية -->
                            <button onclick="approveMerchantRequest('${reqId}', '${storeName}', '${phone}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
                                <i class="fa-solid fa-check"></i> قبول
                            </button>
                            <!-- زرار الرفض بيفتح مودال سبب الرفض -->
                            <button onclick="openRejectMerchantModal('${reqId}', '${storeName}', '${phone}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1">
                                <i class="fa-solid fa-xmark"></i> رفض
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');

        const allPayouts = (appData.users && appData.users.payoutRequests) ? appData.users.payoutRequests : (appData.payoutRequests || []);

        payoutTbody.innerHTML = allPayouts.length === 0 ? `<tr><td colspan="6" class="text-center py-4 text-slate-400">لا توجد طلبات صرف مستحقات معلقة</td></tr>` : 
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

        const merchants = (appData.users && appData.users.merchants) ? appData.users.merchants : [];
        gridContainer.innerHTML = merchants.map(m => `
            <div onclick="openMerchantProfile('${m.storename || m.name || m.username}')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition">
                <div class="flex justify-between items-start">
                    <div class="w-10 h-10 rounded-xl bg-safira-50 text-safira-600 flex items-center justify-center font-bold text-lg"><i class="fa-solid fa-store"></i></div>
                    <span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">نشط سحابياً</span>
                </div>
                <div>
                    <div class="font-bold text-slate-900 text-sm">${m.name || m.storeName}</div>
                    <p class="text-xs text-slate-500 font-mono mt-0.5">يوزر: ${m.username} | الهاتف: ${m.phone}</p>
                </div>
            </div>
        `).join('');
    }
   // 1️⃣ دالة الموافقة على التاجر (مع رسالة ترحيب واتساب تلقائية)
    async function approveMerchantRequest(id, merchantName, merchantPhone) {
        try {
            const res = await fetch(`${API_BASE_URL}/merchant-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, action: 'approve' })
            });

            if (res.ok) {
                showNotification("تم قبول التاجر وتفعيل حسابه سحابياً بنجاح ☁️", "success");
                
                // 📱 إرسال رسالة ترحيب للتاجر عبر الواتساب فور الموافقة
                if (merchantPhone) {
                    const formattedPhone = merchantPhone.startsWith('0') ? '2' + merchantPhone : '20' + merchantPhone.replace(/^0+/, '');
                    const welcomeMsg = `مرحباً بك يا ${merchantName || 'عزيزنا التاجر'} في عائلة سفيرة للشحن والتوصيل 🎉\nيسعدنا إبلاغك أنه تم قبول واعتماد حسابك بنجاح.\nيمكنك الآن تسجيل الدخول لأبلكيشن التجار ومتابعة شحناتك وأرباحك بكل سهولة! 🚀`;
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(welcomeMsg)}`, '_blank');
                }

                loadCloudData();
            } else {
                showNotification("فشل تنفيذ الإجراء السحابي", "error");
            }
        } catch (e) {
            console.error(e);
            showNotification("خطأ في الاتصال بالباك إند", "error");
        }
    }

    // 2️⃣ فتح مودال إدخال سبب الرفض
    function openRejectMerchantModal(id) {
        document.getElementById('rejectMerchantId').value = id;
        document.getElementById('rejectionReasonInput').value = '';
        document.getElementById('rejectMerchantModal').classList.remove('hidden');
    }

    function closeRejectMerchantModal() {
        document.getElementById('rejectMerchantModal').classList.add('hidden');
    }

    // 3️⃣ تأكيد الرفض وإرسال السبب مع الواتساب للتاجر
    async function submitMerchantRejection(merchantName, merchantPhone) {
        const id = document.getElementById('rejectMerchantId').value;
        const reason = document.getElementById('rejectionReasonInput').value.trim();

        if (!reason) {
            showNotification("يرجى كتابة سبب الرفض ليظهر للتاجر", "error");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/merchant-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, action: 'reject', reason: reason })
            });

            if (res.ok) {
                closeRejectMerchantModal();
                showNotification("تم رفض الطلب بنجاح", "success");

                // 📱 إرسال رسالة سبب الرفض للتاجر عبر الواتساب
                if (merchantPhone) {
                    const formattedPhone = merchantPhone.startsWith('0') ? '2' + merchantPhone : '20' + merchantPhone.replace(/^0+/, '');
                    const rejectMsg = `عزيزنا التاجر ${merchantName || ''},\nنعتذر عن عدم قبول طلب انضمامك حالياً لشركة سفيرة للخدمات اللوجستية.\n\n📌 السبب: ${reason}\n\nيمكنك تعديل البيانات وإعادة المحاولة في أي وقت.`;
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(rejectMsg)}`, '_blank');
                }

                loadCloudData();
            } else {
                showNotification("فشل إرسال طلب الرفض للسيرفر", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification("خطأ في الاتصال بالسيرفر", "error");
        }
    }
    function completePayout(id) {
        appData.users.payoutRequests = appData.users.payoutRequests.filter(p => (p.id || p._id) !== id);
        renderMerchantsSection();
        showNotification("تم تأكيد صرف المستحقات للتاجر بنجاح", "success");
    }
// فتح نافذة التاجر وتعبئة بياناته
function openMerchantProfile(merchantId) {
    console.log("تم النقر على التاجر بنجاح:", merchantId);
    
    currentSelectedMerchantId = merchantId;
    const merchants = (appData.users && appData.users.merchants) ? appData.users.merchants : (appData.merchants || []);
    const merchant = merchants.find(m => 
        String(m.id) === String(merchantId) || 
        String(m.username) === String(merchantId) || 
        String(m.storeName) === String(merchantId) || 
        String(m.storename) === String(merchantId) || 
        String(m.name) === String(merchantId)
    );

    const storeName = merchant?.storeName || merchant?.storename || merchant?.name || merchant?.username || merchantId;
    const phone = merchant?.phone || 'غير مسجل';
    
    document.getElementById('modalMerchantName').innerText = `متجر / ${storeName}`;
    document.getElementById('modalMerchantSubDetails').innerText = `صاحب المتجر: ${merchant?.name || storeName} | هاتف: ${phone}`;

    // 🚀 الحل الحاسم: إظهار النافذة ونقلها للـ body مباشرة عشان تظهر غصب عن أي تبويب
    const modal = document.getElementById('merchantProfileModal');
    if (modal) {
        document.body.appendChild(modal); // نقلها لنهاية الصفحة خالص
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }

    filterSelectedMerchantData();
}
      // إغلاق النافذة
function closeMerchantProfileModal() {
    const modal = document.getElementById('merchantProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentSelectedMerchantId = null;
}
// تصفية وعرض شحنات التاجر المختار
function filterSelectedMerchantData() {
    if (!currentSelectedMerchantId) return;

    const dateFrom = document.getElementById('merchantFilterDateFrom').value;
    const dateTo = document.getElementById('merchantFilterDateTo').value;
    const statusFilter = document.getElementById('merchantFilterStatus').value;

    const allShipments = appData.shipments || [];

    // مطابقة التاجر باسم المتجر أو المعرف
    let merchantShipments = allShipments.filter(sh => 
        sh.merchantId === currentSelectedMerchantId || 
        sh.merchant === currentSelectedMerchantId
    );

    // تطبيق فلترة التاريخ والحالة
    merchantShipments = merchantShipments.filter(sh => {
        let matchDate = true;
        const itemDate = (sh.createdAt || sh.date || '').split('T')[0];
        if (dateFrom && itemDate < dateFrom) matchDate = false;
        if (dateTo && itemDate > dateTo) matchDate = false;

        let matchStatus = !statusFilter || sh.status === statusFilter;

        return matchDate && matchStatus;
    });

    // حساب الحسابات المالية للتاجر
    const totalCount = merchantShipments.length;
    
    // الشحنات المسلمة حساب صافيها للتاجر
    const totalDues = merchantShipments
        .filter(s => s.status === 'تم التسليم')
        .reduce((sum, s) => {
            const amount = parseFloat(s.amount) || 0;
            const shipping = parseFloat(s.merchantShipping || s.shippingFee) || 0;
            return sum + (amount - shipping);
        }, 0);

    // جلب الصرفيات السابقة إن وجدت
    const payoutRequests = appData.payoutRequests || [];
    const paidOutSum = payoutRequests
        .filter(p => (p.merchant === currentSelectedMerchantId || p.merchantId === currentSelectedMerchantId) && p.status === 'مكتمل')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const availableBalance = Math.max(0, totalDues - paidOutSum);

    // تحديث الإحصائيات في النافذة
    document.getElementById('mStatTotalOrders').innerText = totalCount;
    document.getElementById('mStatTotalDues').innerText = totalDues.toLocaleString() + ' ج.م';
    document.getElementById('mStatPaidOut').innerText = paidOutSum.toLocaleString() + ' ج.م';
    document.getElementById('mStatAvailableBalance').innerText = availableBalance.toLocaleString() + ' ج.م';
    document.getElementById('merchantOrdersCount').innerText = `${totalCount} شحنة`;

    // رسم الجدول
    const tbody = document.getElementById('merchantProfileOrdersTbody');
    if (merchantShipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">لا توجد أوردرات مسجلة لهذا التاجر ضمن النطاق المحدد.</td></tr>`;
        return;
    }

    tbody.innerHTML = merchantShipments.map(sh => {
        const amount = parseFloat(sh.amount) || 0;
        const shipping = parseFloat(sh.merchantShipping || sh.shippingFee) || 0;
        const merchantNet = sh.status === 'تم التسليم' ? (amount - shipping) : 0;

        return `
            <tr class="hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-800">
                    #${sh.trackingNumber || sh.id}
                    <div class="text-[10px] text-slate-400 font-normal">${(sh.createdAt || sh.date || '').split('T')[0]}</div>
                </td>
                <td class="p-3">${sh.recipientName || 'عميل'} - ${sh.governorate || ''}</td>
                <td class="p-3 font-bold text-slate-800">${amount} ج.م</td>
                <td class="p-3 text-slate-500">${shipping} ج.م</td>
                <td class="p-3 font-black text-emerald-600">${merchantNet} ج.م</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${
                        sh.status === 'تم التسليم' ? 'bg-emerald-100 text-emerald-700' :
                        sh.status === 'مرتجع' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }">
                        ${sh.status || 'قيد التسليم'}
                    </span>
                </td>
                <td class="p-3 text-slate-500 text-[11px]">${sh.addedBy || 'الأنور'}</td>
            </tr>
        `;
    }).join('');
}    
async function renderCouriersSection() {
        const container = document.getElementById('couriersGridContainer');
        if (!container) return;

        try {
            // 1. جلب المناديب مباشرة من السيرفر السحابي لضمان أحدث البيانات
            const res = await fetch(`${API_BASE}/couriers`);
            let couriers = [];
            if (res.ok) {
                couriers = await res.json();
            } else {
                // الفولباك للمصفوفة المحلية إذا لم يتصل السيرفر
                couriers = (appData.users && appData.users.couriers) ? appData.users.couriers : [];
            }

            if (couriers.length === 0) {
                container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-400">لا توجد مناديب مسجلين حالياً</div>`;
                return;
            }

            container.innerHTML = couriers.map(c => {
                const isCairo = c.type === 'cairo' || !c.city;
                const badgeText = isCairo ? 'مندوب القاهرة الكبرى (كاش + مستحقات)' : `مندوب محافظة: ${c.city || c.zone || 'محدد'}`;
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
            console.error("خطأ في جلب المناديب:", err);
            container.innerHTML = `<div class="col-span-full p-6 text-center text-red-400">حدث خطأ أثناء تحميل المناديب من السيرفر</div>`;
        }
    }
// تهيئة هيكل بيانات الإيرادات والمصروفات إذا لم يكن موجوداً
if (!appData.incomes) {
    appData.incomes = [
        { id: 1, title: 'تسوية أرباح شحنات سابقة', amount: 3500, category: 'أرباح', date: '2026-10-15' },
        { id: 2, title: 'رصيد إضافي بالخزينة الرئيسية', amount: 10000, category: 'إيداع نقدى', date: '2026-10-18' }
    ];
}

if (!appData.expenses) {
    appData.expenses = [
        { id: 1, title: 'صيانة سيارات التوصيل', amount: 1200, person: 'ورشة العبور', date: '2026-10-16' },
        { id: 2, title: 'فواتير إنترنت ومواصلات', amount: 650, person: 'خدمات تشغيلية', date: '2026-10-17' }
    ];
}
function toggleCourierCitySelect(type) {
    const cityContainer = document.getElementById('courierCityContainer');
    const cairoZoneContainer = document.getElementById('courierCairoZoneContainer');

    if (type === 'governorate') {
        if (cityContainer) cityContainer.classList.remove('hidden');
        if (cairoZoneContainer) cairoZoneContainer.classList.add('hidden');
    } else {
        if (cityContainer) cityContainer.classList.add('hidden');
        if (cairoZoneContainer) cairoZoneContainer.classList.remove('hidden');
    }
}

// فتح نافذة المندوب (عرض فوري + تحديث خلفي سحابي ذكي)
async function openCourierProfile(courierId) {
    console.log("تم النقر على المندوب ID:", courierId);
    
    currentSelectedCourierId = courierId;

    // 1️⃣ الخطوة الأولى: إظهار المودال فوراً بالبيانات المحلية (سرعة صاروخية 0ms)
    const modal = document.getElementById('courierProfileModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }

    // دالة مساعدة لتعبئة البيانات في الواجهة
    const updateModalUI = (courierData) => {
        const courierName = courierData?.name || courierData?.username || courierId;
        const courierPhone = courierData?.phone || 'غير مسجل';
        const courierRegion = courierData?.zone || courierData?.region || courierData?.area || 'عام';

        const nameEl = document.getElementById('modalCourierName');
        const detailsEl = document.getElementById('modalCouriersSubDetails');
        
        if (nameEl) nameEl.innerText = courierName;
        if (detailsEl) detailsEl.innerText = `هاتف: ${courierPhone} | المنطقة: ${courierRegion}`;

        filterSelectedCourierData();
    };

    // البحث والملء المبدئي من الذاكرة المحلية
    let couriers = (appData.users && appData.users.couriers) ? appData.users.couriers : (appData.couriers || []);
    let courier = couriers.find(c => 
        String(c.id) === String(courierId) || 
        String(c._id) === String(courierId) || 
        String(c.username) === String(courierId) || 
        String(c.name) === String(courierId)
    );

    if (courier) {
        updateModalUI(courier);
    }

    // 2️⃣ الخطوة الثانية: جلب أحدث البيانات من السيرفر في "الخلفية" بهدوء تام دون تعليق المودال
    if (typeof API_BASE !== 'undefined') {
        fetch(`${API_BASE}/couriers`)
            .then(res => res.ok ? res.json() : null)
            .then(cloudCouriers => {
                if (cloudCouriers) {
                    const cloudCourier = cloudCouriers.find(c => 
                        String(c.id) === String(courierId) || 
                        String(c._id) === String(courierId) || 
                        String(c.username) === String(courierId) || 
                        String(c.name) === String(courierId)
                    );
                    if (cloudCourier) {
                        // تحديث الواجهة فور وصول البيانات الجديدة من السيرفر
                        updateModalUI(cloudCourier);
                    }
                }
            })
            .catch(err => console.log("التحديث الخلفي للسيرفر يعمل في الصامت:", err));
    }
}
// إغلاق نافذة المندوب
function closeCourierProfileModal() {
    const modal = document.getElementById('courierProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentSelectedCourierId = null;
}

// تصفية وعرض أوردرات المندوب المختار
function filterSelectedCourierData() {
    if (!currentSelectedCourierId) return;

    const dateFrom = document.getElementById('courierFilterDateFrom').value;
    const dateTo = document.getElementById('courierFilterDateTo').value;
    const statusFilter = document.getElementById('courierFilterStatus').value;

    const allShipments = appData.shipments || [];

    // جلب أوردرات هذا المندوب فقط
    let courierShipments = allShipments.filter(sh => sh.courierId === currentSelectedCourierId || sh.courier === currentSelectedCourierId);

    // تطبيق فلترة التواريخ والحالة
    courierShipments = courierShipments.filter(sh => {
        let matchDate = true;
        const itemDate = (sh.createdAt || sh.date || '').split('T')[0];
        if (dateFrom && itemDate < dateFrom) matchDate = false;
        if (dateTo && itemDate > dateTo) matchDate = false;

        let matchStatus = !statusFilter || sh.status === statusFilter;

        return matchDate && matchStatus;
    });

    // حساب الإحصائيات
    const totalCount = courierShipments.length;
    const deliveredCount = courierShipments.filter(s => s.status === 'تم التسليم').length;
    const returnedCount = courierShipments.filter(s => s.status === 'مرتجع').length;
    const collectedMoney = courierShipments
        .filter(s => s.status === 'تم التسليم')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    document.getElementById('cStatTotalOrders').innerText = totalCount;
    document.getElementById('cStatDelivered').innerText = deliveredCount;
    document.getElementById('cStatReturned').innerText = returnedCount;
    document.getElementById('cStatCollectedMoney').innerText = collectedMoney.toLocaleString() + ' ج.م';
    document.getElementById('courierOrdersCount').innerText = `${totalCount} شحنة`;

    // رسم الجدول
    const tbody = document.getElementById('courierProfileOrdersTbody');
    if (courierShipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">لا توجد أوردرات مسجلة لهذا المندوب ضمن النطاق المحدد.</td></tr>`;
        return;
    }

    tbody.innerHTML = courierShipments.map(sh => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-800">
                #${sh.trackingNumber || sh.id}
                <div class="text-[10px] text-slate-400 font-normal">${(sh.createdAt || sh.date || '').split('T')[0]}</div>
            </td>
            <td class="p-3">${sh.merchant || 'غير محدد'}</td>
            <td class="p-3">${sh.recipientName || 'عميل'} - ${sh.governorate || ''}</td>
            <td class="p-3 font-black text-slate-800">${sh.amount || 0} ج.م</td>
            <td class="p-3">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${
                    sh.status === 'تم التسليم' ? 'bg-emerald-100 text-emerald-700' :
                    sh.status === 'مرتجع' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }">
                    ${sh.status || 'قيد التسليم'}
                </span>
            </td>
            <td class="p-3 text-slate-500 text-[11px]">${sh.addedBy || 'الأنور'}</td>
        </tr>
    `).join('');
}
      
      
function renderCourierFinancialTables() {
    // التأكد من تهيئة البيانات كمتغيرات ومصفوفات فارغة لتجنب الأخطاء
    if (typeof appData === 'undefined') window.appData = {};
    if (!appData.payoutRequests) appData.payoutRequests = [];
    if (!appData.settlementRequests) appData.settlementRequests = [];

    // 1. جدول طلبات المستحقات
    const payoutBody = document.getElementById('courierPayoutRequestsBody');
    if (payoutBody) {
        payoutBody.innerHTML = appData.payoutRequests.map(item => `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2.5 font-bold text-slate-800">${item.courierName || ''}</td>
                <td class="p-2.5 font-bold font-mono text-amber-600">${item.amount || 0} ج.م</td>
                <td class="p-2.5">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${item.status === 'تم الصرف' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${item.status || 'معلق'}</span>
                </td>
                <td class="p-2.5">
                    ${item.status === 'معلق' ? `
                        <button onclick="approvePayout('${item.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow">
                            <i class="fa-solid fa-circle-check text-emerald-500 text-base"></i>
                        </button>` : ''}
                </td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="p-3 text-center text-slate-400">لا توجد طلبات مستحقات حالياً</td></tr>`;
    }

    // 2. جدول تسويات المحافظات
    const settlementBody = document.getElementById('courierSettlementRequestsBody');
    if (settlementBody) {
        settlementBody.innerHTML = appData.settlementRequests.map(item => `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2.5">
                    <div class="font-bold text-slate-800">${item.courierName || ''}</div>
                    <div class="text-[10px] text-slate-400">${item.city || ''}</div>
                </td>
                <td class="p-2.5 font-bold font-mono text-indigo-600">${item.netAmount || 0} ج.م</td>
                <td class="p-2.5">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${item.status === 'تمت التسوية' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}">${item.status || 'معلق'}</span>
                </td>
                <td class="p-2.5">
                    ${item.status === 'في انتظار الاعتماد' ? `
                        <button onclick="approveSettlement('${item.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow">
                            <i class="fa-solid fa-file-circle-check text-indigo-500 text-base"></i>
                        </button>` : ''}
                </td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="p-3 text-center text-slate-400">لا توجد طلبات تسوية حالياً</td></tr>`;
    }
}
// دالة اعتماد صرف مستحقات مندوب القاهرة
function approvePayout(id) {
    const req = appData.payoutRequests.find(r => r.id === id);
    if (req) {
        req.status = 'تم الصرف';
        
        // تسجيل خروج المبلغ كمصروف/مستحقات في الخزينة تلقائياً
        if (!appData.expenses) appData.expenses = [];
        appData.expenses.unshift({
            id: Date.now(),
            title: `صرف مستحقات للمندوب (${req.courierName})`,
            amount: req.amount,
            person: req.courierName,
            date: new Date().toISOString().split('T')[0]
        });

        renderCourierFinancialTables();
        if (typeof renderFinancePage === 'function') renderFinancePage();
        showNotification(`تم اعتماد وصرف مبلغ ${req.amount} ج.م للمندوب بنجاح وتسجيله بالمصروفات`, "success");
    }
}

// دالة قبول واعتماد تسوية حساب مندوب المحافظة
function approveSettlement(id) {
    const req = appData.settlementRequests.find(r => r.id === id);
    if (req) {
        req.status = 'تمت التسوية';

        // تسجيل صافي المبلغ كإيراد يدخل الخزينة بعد التسوية
        if (!appData.incomes) appData.incomes = [];
        appData.incomes.unshift({
            id: Date.now(),
            title: `تسوية حساب توريد محافظة (${req.city} - ${req.courierName})`,
            amount: req.netAmount,
            category: 'تسوية أقاليم',
            date: new Date().toISOString().split('T')[0]
        });

        renderCourierFinancialTables();
        if (typeof renderFinancePage === 'function') renderFinancePage();
        showNotification(`تم اعتماد تسوية حساب المحافظة (${req.city}) وإيداع المبلغ بالخزينة`, "success");
    }
}
// دالة عرض وتحديث صفحة المالية والبطاقات الإحصائية
function renderFinancePage() {
    ensureAppDataStructure(); // <--- أضف هذا السطر هنا
    const incomeBody = document.getElementById('incomeTableBody');
    // ... باقي الكود ...
}
    const incomeBody = document.getElementById('incomeTableBody');
    let totalIn = 0;
    if (incomeBody) {
        incomeBody.innerHTML = appData.incomes.map(item => {
            totalIn += parseFloat(item.amount) || 0;
            return `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">${item.title}</td>
                    <td class="p-3 font-mono font-bold text-emerald-600">+${item.amount} ج.م</td>
                    <td class="p-3"><span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">${item.category}</span></td>
                    <td class="p-3 text-slate-500">${item.date}</td>
                    <td class="p-3">
                        <button onclick="deleteIncome(${item.id})" class="text-rose-500 hover:text-rose-700 transition px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد إيرادات مسجلة</td></tr>`;
    }

    // 2. حساب وإظهار المصروفات
    const expenseBody = document.getElementById('expenseTableBody');
    let totalOut = 0;
    if (expenseBody) {
        expenseBody.innerHTML = appData.expenses.map(item => {
            totalOut += parseFloat(item.amount) || 0;
            return `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">${item.title}</td>
                    <td class="p-3 font-mono font-bold text-rose-600">-${item.amount} ج.م</td>
                    <td class="p-3 text-slate-600">${item.person || 'غير محدد'}</td>
                    <td class="p-3 text-slate-500">${item.date}</td>
                    <td class="p-3">
                        <button onclick="deleteExpense(${item.id})" class="text-rose-500 hover:text-rose-700 transition px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد مصروفات مسجلة</td></tr>`;
    }

    // 3. تحديث بطاقات الملخص المالي العلوي
    document.getElementById('financeTotalIn').innerText = totalIn + " ج.م";
    document.getElementById('financeTotalOut').innerText = totalOut + " ج.م";
    
    const netBalance = totalIn - totalOut;
    const netBalanceEl = document.getElementById('financeNetBalance');
    if (netBalanceEl) {
        netBalanceEl.innerText = netBalance + " ج.م";
        netBalanceEl.className = `text-xl font-black mt-1 ${netBalance >= 0 ? 'text-safira-600' : 'text-rose-600'}`;
    }
// فتح نافذة إضافة إيراد جديد
function openAddIncomeModal() {
    const modal = document.getElementById('addIncomeModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}

function closeAddIncomeModal() {
    const modal = document.getElementById('addIncomeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// فتح نافذة إضافة مصروف جديد
function openAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}

function closeAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
      
// دوال الحذف والتحديث
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

    function openNewOrderModal() { document.getElementById('newOrderModal').classList.remove('hidden'); }
    function closeNewOrderModal() { document.getElementById('newOrderModal').classList.add('hidden'); }

async function saveNewOrder(event) {
        event.preventDefault();
        const merchant = document.getElementById('newMerchant').value;
        const customer = document.getElementById('newCustomer').value;
        const phone = document.getElementById('newPhone').value;
        const city = document.getElementById('newCity').value;
        const address = document.getElementById('newDetailedAddress').value;
        const amount = parseFloat(document.getElementById('newAmount').value) || 0;
        const mShip = parseFloat(document.getElementById('newMShip').value) || 0;
        const cShip = parseFloat(document.getElementById('newCShip').value) || 0;

        // 1️⃣ بناء كائن الشحنة الجديد وإضافته محلياً فوراً (Optimistic UI)
        const newOrder = { 
            id: 'SAF-' + Math.floor(100000 + Math.random() * 900000), 
            merchant, 
            customer, 
            phone, 
            city, 
            address, 
            amount, 
            mShip, 
            cShip, 
            status: "قيد الانتظار",
            date: new Date().toISOString().split('T')[0]
        };

        if (!appData.orders) appData.orders = [];
        appData.orders.unshift(newOrder);

        // 2️⃣ إغلاق المودال وتحديث جداول الشحنات والإحصائيات فوراً
        closeNewOrderModal();
        if (typeof renderOverviewStats === 'function') renderOverviewStats();
        if (typeof renderShipmentsTable === 'function') renderShipmentsTable();

        showNotification("تم إضافة الشحنة محلياً، جاري الحفظ سحابياً...", "success");

        // 3️⃣ إرسال الطلب للسيرفر في الخلفية (Background Sync)
        try {
            const res = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });

            if (res.ok) {
                showNotification("تم مزامنة وحفظ الشحنة سحابياً بنجاح ☁️🚀", "success");
            } else {
                showNotification("فشل الحفظ على السيرفر، يرجى المراجعة", "error");
            }
        } catch (err) {
            console.error("Background Sync Error:", err);
            showNotification("خطأ في الاتصال بالسيرفر السحابي أثناء المزامنة", "error");
        }
    }

let deletingShipmentId = null;

// دالة الحذف المباشر بدون مودال وبدون يوزر وباسورد
async function requestDeleteShipment(id) {
    if (!confirm("هل أنت متأكد من حذف هذه الشحنة؟")) return;

    try {
        const res = await fetch(`https://safira-logistic.vercel.app/api/shipments?id=${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (res.ok && data.success) {
            loadCloudData();
            showNotification("تم حذف الشحنة بنجاح من السيرفر", "success");
        } else {
            showNotification(data.message || "عفواً، فشل حذف الشحنة", "error");
        }
    } catch (err) {
        showNotification("حدث خطأ في الاتصال بالباك إند", "error");
    }
}

// دالة الحذف المباشر للأونر
async function executeDirectDelete(id) {
    try {
        const res = await fetch(`https://safira-logistic.vercel.app/api/shipments?id=${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: "believer", bypassAuth: true })
        });

        if (res.ok) {
            loadCloudData();
            showNotification("تم حذف الشحنة بنجاح من السيرفر", "success");
        } else {
            showNotification("عفواً، فشل حذف الشحنة", "error");
        }
    } catch (err) {
        showNotification("حدث خطأ في الاتصال بالباك إند", "error");
    }
}

function closeDeleteModal() {
    document.getElementById('deleteAuthModal').classList.add('hidden');
    document.getElementById('delAuthUser').value = "";
    document.getElementById('delAuthPass').value = "";
}

async function confirmDeleteAction(event) {
    event.preventDefault();
    const u = document.getElementById('delAuthUser').value;
    const p = document.getElementById('delAuthPass').value;

    try {
        const res = await fetch(`https://safira-logistic.vercel.app/api/shipments?id=${deletingShipmentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

        if (res.ok) {
            closeDeleteModal();
            loadCloudData();
            showNotification("تم حذف الشحنة بنجاح من السيرفر", "success");
        } else {
            showNotification("عفواً، بيانات تأكيد الحذف غير صحيحة", "error");
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
        document.getElementById('wbCustomer').innerText = s.customer || '-';
        document.getElementById('wbPhone').innerText = s.phone || '-';
        document.getElementById('wbCity').innerText = s.city || '-';
        document.getElementById('wbAddress').innerText = s.address || '-';
        document.getElementById('wbAmount').innerText = s.amount + " ج.م";

        document.getElementById('waybillModal').classList.remove('hidden');
    }
    function closeWaybillModal() { document.getElementById('waybillModal').classList.add('hidden'); }

    function openTrackingModal(id) {
        const s = appData.shipments.find(x => (x.id || x._id) === id);
        if (!s) return;

        document.getElementById('trackWaybillTitle').innerText = "رقم البوليصة: #" + (s.id || s._id);
        document.getElementById('trackCustomerInfo').innerText = `العميل: ${s.customer} | الهاتف: ${s.phone}`;

        const container = document.getElementById('adminTimelineContainer');
        container.innerHTML = `
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span><div class="font-bold text-slate-800">تم تسجيل الأوردر بواسطة التاجر</div><p class="text-[10px] text-slate-500">${s.date || ''}</p></div>
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full ${s.warehouseReceived ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'}"></span><div class="font-bold text-slate-800">استلام المخزن وتجهيز خط السير</div></div>
            <div class="relative"><span class="absolute -right-6 top-1 w-3 h-3 rounded-full ${s.status === 'تم التسليم' ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-blue-500 animate-pulse'}"></span><div class="font-bold text-slate-800">حالة الشحنة الحالية: ${s.status || 'قيد الانتظار'}</div></div>
        `;

        document.getElementById('trackingModal').classList.remove('hidden');
    }
    function closeTrackingModal() { document.getElementById('trackingModal').classList.add('hidden'); }

    function openCourierMapModal() { document.getElementById('courierMapModal').classList.remove('hidden'); }
    function closeCourierMapModal() { document.getElementById('courierMapModal').classList.add('hidden'); }

    function openAddMerchantModal() { document.getElementById('addMerchantModal').classList.remove('hidden'); }
    function closeAddMerchantModal() { document.getElementById('addMerchantModal').classList.add('hidden'); }

  async function handleMerchantSubmit(event) {
        event.preventDefault();
        const name = document.getElementById('merchantName').value;
        const phone = document.getElementById('merchantPhone').value;
        const username = document.getElementById('merchantUsername').value;
        const pass = document.getElementById('merchantPassword').value;

        // 1️⃣ إنشاء كود تاجر مؤقت محلياً
        const newMerchant = { id: Date.now(), name, phone, username };
        if (!appData.merchants) appData.merchants = [];
        appData.merchants.unshift(newMerchant);

        // 2️⃣ إغلاق المودال وتحديث الواجهة فوراً
        closeAddMerchantModal();
        if (typeof renderMerchantsTable === 'function') renderMerchantsTable();
        showNotification("تم إضافة التاجر محلياً، جاري المزامنة السحابية...", "success");

        // 3️⃣ الحفظ سحابياً في الخلفية
        try {
            const res = await fetch(`${API_BASE_URL}/merchants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, username, pass })
            });

            if (res.ok) {
                showNotification("تم الحفظ السحابي للتاجر بنجاح ☁️🚀", "success");
            } else {
                showNotification("فشل الحفظ على السيرفر، يرجى المراجعة", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification("خطأ في الاتصال بالباك إند", "error");
        }
    }

      // 1. فتح نافذة إضافة تسعيرة تاجر للمحافظات
function openAddMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}
function closeAddMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

// 2. فتح نافذة إضافة تسعيرة مندوب للمحافظات
function openAddCourierPricingModal() {
    const modal = document.getElementById('addCourierPricingModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}
function closeAddCourierPricingModal() {
    const modal = document.getElementById('addCourierPricingModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

// 3. فتح نافذة إضافة سعر تاجر القاهرة
function openAddCairoMerchantPriceModal() {
    const modal = document.getElementById('addCairoMerchantPriceModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}
function closeAddCairoMerchantPriceModal() {
    const modal = document.getElementById('addCairoMerchantPriceModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

// 4. فتح نافذة إضافة عمولة مندوب القاهرة
function openAddCairoCourierCommissionModal() {
    const modal = document.getElementById('addCairoCourierCommissionModal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
}
function closeAddCairoCourierCommissionModal() {
    const modal = document.getElementById('addCairoCourierCommissionModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}
      
function renderSettingsPricingTables() {
    // 1. جدول أسعار شحن المحافظات للتجار
    const merchantTableBody = document.getElementById('merchantPricingTableBody');
    if (merchantTableBody && appData.merchantPricing) {
        merchantTableBody.innerHTML = appData.merchantPricing.map((item, index) => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-900">${item.merchant || 'عام'}</td>
                <td class="p-3">${item.city || item.region || ''}</td>
                <td class="p-3 font-mono font-bold text-safira-600">${item.price || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteMerchantPricing(${index})" class="text-rose-500 hover:text-rose-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // 2. جدول عمولات وأسعار شحن المناديب
    const courierTableBody = document.getElementById('courierPricingTableBody');
    if (courierTableBody && appData.courierPricing) {
        courierTableBody.innerHTML = appData.courierPricing.map((item, index) => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-900">${item.region || item.city || ''}</td>
                <td class="p-3">${item.type || 'شحن عادي'}</td>
                <td class="p-3 font-mono font-bold text-emerald-600">${item.commission || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteCourierPricing(${index})" class="text-rose-500 hover:text-rose-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
// 3. جدول أسعار شحن مناطق القاهرة الكبرى (للتاجر)
    const cairoMerchantTable = document.getElementById('cairoMerchantPricingTableBody');
    if (cairoMerchantTable) {
        const cairoMerchantZones = appData.cairoMerchantPricing || [
            { name: 'وسط البلد', price: 45 },
            { name: 'مدينة نصر', price: 50 },
            { name: 'المعادي', price: 55 },
            { name: 'التجمع والخامس', price: 65 }
        ];

        cairoMerchantTable.innerHTML = cairoMerchantZones.map((item, index) => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-900">${item.name}</td>
                <td class="p-3 font-mono font-bold text-safira-600">${item.price || item.shippingFee || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteCairoMerchantPricing(${index})" class="text-rose-500 hover:text-rose-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // 4. جدول عمولات شحن مناطق القاهرة الكبرى (للمندوب)
    const cairoCourierTable = document.getElementById('cairoCourierCommissionTableBody');
    if (cairoCourierTable) {
        const cairoCourierZones = appData.cairoCourierCommission || [
            { name: 'وسط البلد', commission: 25 },
            { name: 'مدينة نصر', commission: 30 },
            { name: 'المعادي', commission: 30 },
            { name: 'التجمع والخامس', commission: 35 }
        ];

        cairoCourierTable.innerHTML = cairoCourierZones.map((item, index) => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-900">${item.name}</td>
                <td class="p-3 font-mono font-bold text-emerald-600">${item.commission || 0} ج.م</td>
                <td class="p-3 text-center">
                    <button onclick="deleteCairoCourierCommission(${index})" class="text-rose-500 hover:text-rose-700 font-bold"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
      
// دالة حذف سعر شحن تاجر
function deleteMerchantPricing(id) {
    appData.merchantPricing = appData.merchantPricing.filter(p => p.id !== id);
    renderSettingsPricingTables();
    showNotification("تم حذف السعر بنجاح", "success");
}

// دالة حذف عمولة مندوب
function deleteCourierPricing(id) {
    appData.courierPricing = appData.courierPricing.filter(p => p.id !== id);
    renderSettingsPricingTables();
    showNotification("تم حذف عمولة المنطقة بنجاح", "success");
}
  
  async function saveExpense(event) {
        event.preventDefault();
        const desc = document.getElementById('expenseDesc').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = new Date().toISOString().split('T')[0];

        // 1️⃣ إضافة المصروف محلياً وفوراً في الـ appData (تحديث متفائل للواجهة)
        const newExpense = { id: Date.now(), type: "مصروف تشغيل", desc, amount, date };
        if (!appData.finance) appData.finance = { expenses: [] };
        if (!appData.finance.expenses) appData.finance.expenses = [];
        appData.finance.expenses.unshift(newExpense);

        // 2️⃣ إغلاق المودال وتحديث الواجهة فوراً (استجابة صاروخية)
        closeExpenseModal();
        if (typeof renderFinancePage === 'function') renderFinancePage();
        showNotification("تم تسجيل المصروف محلياً، جاري الحفظ سحابياً...", "success");

        // 3️⃣ إرسال الطلب للسيرفر في الخلفية (Background Sync)
        try {
            const res = await fetch(`${API_BASE_URL}/finance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: "مصروف تشغيل", desc, amount, date })
            });

            if (res.ok) {
                showNotification("تم الحفظ السحابي للمصروف بنجاح ☁️🚀", "success");
            } else {
                showNotification("فشل الحفظ على السيرفر، يرجى المراجعة", "error");
            }
        } catch (err) {
            console.error("Background Sync Error:", err);
            showNotification("خطأ في الاتصال بالباك إند أثناء المزامنة", "error");
        }
    }

    function openAddCourierModal() { document.getElementById('addCourierModal').classList.remove('hidden'); }
    function closeAddCourierModal() { document.getElementById('addCourierModal').classList.add('hidden'); }


    function calculateOrderShippingAndCommission(destinationZone) {
    // 1. البحث في جدول مناطق القاهرة الكبرى
    const cairoZones = appData.rates?.cairoZones || appData.cairoZones || [];
    const cairoMatch = cairoZones.find(z => z.name === destinationZone);
    if (cairoMatch) {
        return { shippingFee: cairoMatch.shippingFee, commission: cairoMatch.commission };
    }

    // 2. البحث في جدول عمولات وأسعار المناديب للمحافظات
    if (appData.courierPricing) {
        const courierMatch = appData.courierPricing.find(p => p.region === destinationZone || p.city === destinationZone);
        if (courierMatch) {
            return { shippingFee: courierMatch.price || 50, commission: courierMatch.commission || 30 };
        }
    }

    return { shippingFee: 40, commission: 25 }; // افتراضي
}


async function saveSystemSettings(event) {
    event.preventDefault();
    const ownerName = document.getElementById('settingsOwnerName').value;
    const ownerPass = document.getElementById('settingsOwnerPass').value;

    try {
        const res = await fetch(`${API_BASE_URL}/admin-login`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ownerName, pass: ownerPass })
        });

        if (res.ok) {
            showNotification("تم حفظ إعدادات النظام وتحديث كلمة المرور سحابياً بنجاح", "success");
        } else {
            showNotification("تعذر حفظ الإعدادات على السيرفر", "error");
        }
    } catch (e) {
        showNotification("حدث خطأ في الاتصال بالشبكة", "error");
    }
}

function showNotification(msg, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 text-xs font-bold text-white transition transform duration-300 ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
    notif.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check text-emerald-200' : 'fa-triangle-exclamation'} ml-2"></i>${msg}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}
// دوال إغلاق النوافذ المنبثقة لمناطق القاهرة الكبرى
function closeAddCairoMerchantPriceModal() {
    const modal = document.getElementById('addCairoMerchantPriceModal');
    if (modal) modal.classList.add('hidden');
}

function closeAddCairoCourierCommissionModal() {
    const modal = document.getElementById('addCairoCourierCommissionModal');
    if (modal) modal.classList.add('hidden');
}

// دوال فتح وإغلاق نوافذ الإضافة لمنع أخطاء الأزرار
function openAddCourierModal() {
    const modal = document.getElementById('addCourierModal');
    if (modal) modal.classList.remove('hidden');
}

function closeAddCourierModal() {
    const modal = document.getElementById('addCourierModal');
    if (modal) modal.classList.add('hidden');
}

function openAddMerchantModal() {
    const modal = document.getElementById('addMerchantModal');
    if (modal) modal.classList.remove('hidden');
}

function closeAddMerchantModal() {
    const modal = document.getElementById('addMerchantModal');
    if (modal) modal.classList.add('hidden');
}

// دوال فتح النوافذ المنبثقة للأسعار والعمولات لمنع أخطاء الأزرار
function openAddCairoMerchantPriceModal() {
    const modal = document.getElementById('addCairoMerchantPriceModal');
    if (modal) modal.classList.remove('hidden');
}

function openAddCairoCourierCommissionModal() {
    const modal = document.getElementById('addCairoCourierCommissionModal');
    if (modal) modal.classList.remove('hidden');
}

function openAddMerchantPricingModal() {
    const modal = document.getElementById('addMerchantPricingModal');
    if (modal) modal.classList.remove('hidden');
}

function openAddCourierPricingModal() {
    const modal = document.getElementById('addCourierPricingModal');
    if (modal) modal.classList.remove('hidden');
}

  
    // دالة الإشعارات العامة
    function showNotification(msg, type = 'success') {
        const notif = document.createElement('div');
        notif.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 text-xs font-bold text-white transition transform duration-300 ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
        notif.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check text-emerald-200' : 'fa-triangle-exclamation'} ml-2"></i>${msg}`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }
} // <--- هذا القوس الإضافي يغلق أي دالة مفتوحة بالأعلى لم يتم إغلاقها

// ربط الدوال الرئيسية بالـ Global Scope للـ HTML
window.openAddCourierModal = openAddCourierModal;
window.closeAddCourierModal = closeAddCourierModal;
window.handleSaveCourier = handleSaveCourier;
window.closeExcelModal = closeExcelModal;
window.downloadExcelFile = downloadExcelFile;

