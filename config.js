// تحديد رابط السيرفر الأساسي على Railway
const API_BASE_URL = 'https://safira-logistic-production.up.railway.app';
// دالة مساعدة لتسهيل جلب البيانات أو إرسالها دون تكرار كتابة الرابط كاملاً
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        
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
