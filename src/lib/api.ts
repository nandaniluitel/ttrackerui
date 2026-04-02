import axios from "axios";
import { getToken, logout } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const url = config.url ?? "";

  // Skip auth endpoints so an old/invalid token can't block login
  const skipAuth =
    url.startsWith("/auth/login") || url.startsWith("/auth/register");

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
