import api from "./index";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./authSession";

export const getStoredAccessToken = () => getAccessToken();

export const getStoredRefreshToken = () => null;

export const clearAuthTokens = () => {
  clearAccessToken();
};

const storeTokens = ({ access }) => {
  setAccessToken(access);
};

export const login = async ({ username, password }) => {
  const res = await api.post("/token/", { username, password });
  storeTokens(res.data);
  return res.data;
};

export const refreshAccessToken = async () => {
  const res = await api.post("/token/refresh/", {});
  storeTokens(res.data);
  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/logout/", {});
  } finally {
    clearAuthTokens();
  }
};

export const register = async ({ username, email, password }) => {
  const res = await api.post("/register/", { username, email, password });
  return res.data;
};

export const fetchProfile = async () => {
  const res = await api.get("/profile/");
  return res.data;
};

export const updateProfile = async (payload) => {
  const isFormData = payload instanceof FormData;
  const res = await api.patch("/profile/", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (!data) return fallbackMessage;

  if (typeof data.detail === "string") {
    return data.detail;
  }

  const usernameError = Array.isArray(data.username)
    ? data.username.join(" ")
    : "";
  const emailError = Array.isArray(data.email) ? data.email.join(" ") : "";

  if (usernameError && emailError) {
    return `${usernameError} ${emailError}`.trim();
  }

  if (usernameError || emailError) {
    return usernameError || emailError;
  }

  const nonFieldErrors = Array.isArray(data.non_field_errors)
    ? data.non_field_errors.join(" ")
    : "";

  if (nonFieldErrors) {
    return nonFieldErrors;
  }

  return fallbackMessage;
};
