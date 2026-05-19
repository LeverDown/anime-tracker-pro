import axios from 'axios';

const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
export const BACKEND_URL = apiURL.replace(/\/api$/, '').replace(/\/$/, '');

const api = axios.create({
  baseURL: apiURL,
  timeout: 30000,
  withCredentials: true,
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
