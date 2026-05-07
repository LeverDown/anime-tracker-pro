import axios from 'axios';
import * as Sentry from "@sentry/nextjs";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor for auth token (No manual reading from localStorage per rules, we rely on cookies but if required to set Bearer we'd do it here. Prompt says "does NOT manually read or attach the JWT token. For cookie-based auth, withCredentials: true is the only required config. Verify this is set.")
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for Sentry logging and token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login') {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(function (resolve, reject) {
        // Attempt silent refresh via HttpOnly cookie
        axios.post(`${axiosInstance.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
          .then(({ data }) => {
            processQueue(null, data.access_token);
            resolve(axiosInstance(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // If refresh fails, it means the session is truly dead
            if (typeof window !== 'undefined') window.location.href = '/';
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Log non-2xx responses to Sentry
    if (error.response) {
      Sentry.captureException(error);
      
      // Specifically log 422 for diagnostics as per previous client
      if (error.response.status === 422) {
        console.error("!!! [DIAGNOSTIC] 422 ERROR DETECTED !!!");
        console.error("URL:", error.config.url);
        console.error("DATA:", error.response.data);
      }
    } else {
      // Network errors or other issues
      Sentry.captureException(error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
