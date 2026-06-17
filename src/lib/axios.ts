import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { useAuthStore } from "./store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _401Handled?: boolean;
    };

    if (error.response?.status === 401 && config && !config._401Handled) {
      config._401Handled = true;

      const currentPath = window.location.pathname;
      if (currentPath !== "/") {
        useAuthStore.getState().clearAuth();
      }
    }

    // Redirect to unauthorized page on 403
    if (error.response?.status === 403) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/unauthorized") {
        window.location.href = "/unauthorized";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
