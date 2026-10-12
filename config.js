// config.js - Safira Platform - Vercel + Railway

const BACKENDS = {
  VERCEL: "https://safira-logistic.vercel.app",
  RAILWAY: "https://safira-logistic-production.up.railway.app"
};

// اختار مين الأساسي اللي يبدأ بيه
let API_BASE_URL = BACKENDS.VERCEL;

async function apiRequest(endpoint, options = {}) {
    try {
        const cleanBase = API_BASE_URL.replace(/\/+$/, '');
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const url = `${cleanBase}/${cleanEndpoint}`;
        
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
        
        // لو Vercel رجع ايرور 5xx نجرب Railway
        if (!response.ok && response.status >= 500 && API_BASE_URL === BACKENDS.VERCEL) {
            console.warn("Vercel failed, trying Railway...");
            API_BASE_URL = BACKENDS.RAILWAY;
            return apiRequest(endpoint, options);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('API Request Error:', error);
        // لو فيه مشكلة نتورك نجرب الباك اند التاني
        if (API_BASE_URL === BACKENDS.VERCEL) {
            console.warn("Switching to Railway backend...");
            API_BASE_URL = BACKENDS.RAILWAY;
            const cleanBase = API_BASE_URL.replace(/\/+$/, '');
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = `${cleanBase}/${cleanEndpoint}`;
            const response = await fetch(url, options);
            return await response.json();
        }
        throw error;
    }
}

// عشان تستخدمه برضه كـ CONFIG
window.API_BASE_URL = API_BASE_URL;
window.BACKENDS = BACKENDS;
window.apiRequest = apiRequest;
