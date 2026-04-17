const DEFAULT_API_BASE_URL = "/api";

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const resolveApiBaseUrl = (env = import.meta.env) => {
  const configuredBaseUrl = env?.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();
