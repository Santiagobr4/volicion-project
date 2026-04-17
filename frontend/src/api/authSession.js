"use strict";

/**
 * In-memory access token storage.
 *
 * Keeps access token out of persistent browser storage.
 */
let accessToken = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};
