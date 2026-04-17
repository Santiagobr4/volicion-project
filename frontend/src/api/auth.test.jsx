import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "./index";
import {
  clearAuthTokens,
  fetchProfile,
  login,
  logout,
  refreshAccessToken,
} from "./auth";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./authSession";

vi.mock("./index", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("./authSession", () => {
  let token = null;

  return {
    getAccessToken: vi.fn(() => token),
    setAccessToken: vi.fn((value) => {
      token = value || null;
    }),
    clearAccessToken: vi.fn(() => {
      token = null;
    }),
  };
});

function LoginHarness() {
  const [status, setStatus] = useState("idle");

  const onLogin = async () => {
    try {
      await login({ username: "alice", password: "Passw0rd123" });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <button type="button" onClick={onLogin}>
        login
      </button>
      <span data-testid="status">{status}</span>
    </div>
  );
}

describe("auth API critical flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockReset();
    api.get.mockReset();
    clearAuthTokens();
  });

  it("executes login and stores access token", async () => {
    api.post.mockResolvedValueOnce({ data: { access: "access-token" } });

    render(<LoginHarness />);
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ok");
    });

    expect(api.post).toHaveBeenCalledWith("/token/", {
      username: "alice",
      password: "Passw0rd123",
    });
    expect(setAccessToken).toHaveBeenCalledWith("access-token");
    expect(getAccessToken()).toBe("access-token");
  });

  it("refreshes access token from refresh endpoint", async () => {
    api.post.mockResolvedValueOnce({ data: { access: "fresh-token" } });

    const result = await refreshAccessToken();

    expect(api.post).toHaveBeenCalledWith("/token/refresh/", {});
    expect(result.access).toBe("fresh-token");
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("logout clears local auth session and refresh fails afterwards", async () => {
    setAccessToken("token-before-logout");

    api.post.mockResolvedValueOnce({
      data: { detail: "Logged out successfully." },
    });
    await logout();

    expect(api.post).toHaveBeenCalledWith("/logout/", {});
    expect(clearAccessToken).toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();

    api.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: "Refresh token is invalid or blacklisted." },
      },
    });

    await expect(refreshAccessToken()).rejects.toBeDefined();
  });

  it("calls profile endpoint for API consumption", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        username: "alice",
        email: "alice@example.com",
      },
    });

    const profile = await fetchProfile();

    expect(api.get).toHaveBeenCalledWith("/profile/");
    expect(profile.username).toBe("alice");
  });
});
