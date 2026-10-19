window.CONFIG = {
    API_BASE_URL: "https://safira-logistic.vercel.app/api"
};

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

        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
