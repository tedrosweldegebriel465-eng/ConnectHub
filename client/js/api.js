/**
 * api.js — HTTP request helper
 * Provides: apiRequest, getAuthToken, isAuthenticated, trackEvent
 */

const API_BASE_URL = window.API_BASE_URL || "/api";

function getAuthToken() {
  if (window.AuthStorage?.getToken()) {
    return window.AuthStorage.getToken();
  }

  let token = sessionStorage.getItem("token");
  if (token) return token;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.token) {
      sessionStorage.setItem("token", user.token);
      return user.token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (isFormData) delete headers["Content-Type"];

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: "include",
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function isAuthenticated() {
  if (window.AuthStorage?.isAuthenticated()) return true;
  return !!(getAuthToken() && localStorage.getItem("user"));
}

function trackEvent() {
  /* analytics stub */
}

function getCurrentUserFromAPI() {
  if (window.AuthStorage?.getUser()) return window.AuthStorage.getUser();
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
