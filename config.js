// config.js - Safira Platform - Multi Backend

const BACKENDS = {
  VERCEL: "https://safira-logistic.vercel.app",
  RAILWAY: "https://safira-logistic-production.up.railway.app" // <-- حط هنا لينك Railway الصح بتاعك
};

// اختار انت عايز تشتغل على انهي حاليا
const ACTIVE_BACKEND = BACKENDS.VERCEL; 
// لو Vercel فيه مشكلة غيرها لـ BACKENDS.RAILWAY

const CONFIG = {
  API_BASE_URL: ACTIVE_BACKEND,
  API_URL: `${ACTIVE_BACKEND}/api`,
  BACKENDS: BACKENDS
};

window.CONFIG = CONFIG;
window.BACKENDS = BACKENDS;

console.log("Connected to:", CONFIG.API_URL);
