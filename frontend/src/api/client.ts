import axios from 'axios';

export const BACKEND_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000,
});

// Diagnostic Logger
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 422) {
      console.error("!!! [DIAGNOSTIC] 422 ERROR DETECTED !!!");
      console.error("URL:", error.config.url);
      console.error("DATA:", error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
