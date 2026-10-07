// تحديد رابط السيرفر الأساسي على Railway
const API_BASE_URL = 'https://safira-logistic-production.up.railway.app';
// دالة مساعدة لتسهيل جلب البيانات أو إرسالها دون تكرار كتابة الرابط كاملاً
async function apiRequest(endpoint, options = {}) {
    try {
        // دمج الرابط الأساسي مع المسار بذكاء وتجنب تكرار الشرطات /
        const cleanBase = API_BASE_URL.replace(/\/+$/, '');
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const url = `${cleanBase}/${cleanEndpoint}`;
        
        // ضبط الهيدرز الافتراضية
        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        const response = await fetch(url, config);
        const data = await response.json();
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
