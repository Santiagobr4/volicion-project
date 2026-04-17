import axios from "axios";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./authSession";

const api = axios.create({
  baseURL: (() => {
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (configuredBaseUrl && !import.meta.env.DEV) {
      return configuredBaseUrl;
    }

    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.hostname}:8000/api`;
    }

    return configuredBaseUrl || "http://localhost:8000/api";
  })(),
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests = [];

const processPendingRequests = (token) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

const clearStoredTokens = () => {
  clearAccessToken();
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes("/token/") ||
      originalRequest.url?.includes("/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((token) => {
          if (!token) {
            reject(error);
            return;
          }

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(
        `${api.defaults.baseURL}/token/refresh/`,
        {},
        { withCredentials: true },
      );

      const newAccessToken = refreshResponse.data.access;
      setAccessToken(newAccessToken);
      processPendingRequests(newAccessToken);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processPendingRequests(null);
      clearStoredTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
