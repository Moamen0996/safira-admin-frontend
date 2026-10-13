// config.js - Safira Platform - مع Fallback

const BACKENDS = {
  VERCEL: "https://safira-logistic.vercel.app",
  RAILWAY: "https://safira-logistic-production.up.railway.app"
};

let API_BASE_URL = BACKENDS.VERCEL;

async function apiRequest(endpoint, options = {}) {
    try {
        const cleanBase = API_BASE_URL.replace(/\/+$/, '');
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const url = `${cleanBase}/${cleanEndpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        if (!response.ok && response.status >= 500 && API_BASE_URL === BACKENDS.VERCEL) {
            console.warn("Vercel failed, trying Railway...");
            API_BASE_URL = BACKENDS.RAILWAY;
            return apiRequest(endpoint, options);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
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

window.CONFIG = { API_BASE_URL, BACKENDS };
window.API_BASE_URL = API_BASE_URL;
window.BACKENDS = BACKENDS;
window.apiRequest = apiRequest;
