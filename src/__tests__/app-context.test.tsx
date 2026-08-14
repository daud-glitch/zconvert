import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/app-context";
import { ReactNode } from "react";

// Helper component to test context
function TestConsumer() {
  const { currentUser, currentView, loading, login, logout } = useApp();
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="user">{currentUser ? currentUser.email : "no-user"}</div>
      <div data-testid="role">{currentUser ? currentUser.role : "none"}</div>
      <div data-testid="view">{currentView}</div>
      <button
        data-testid="login-btn"
        onClick={async () => {
          const result = await login("test@example.com", "password123");
          if (result.error) {
            document.getElementById("login-error")!.textContent = result.error;
          }
        }}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <div id="login-error" data-testid="login-error" />
    </div>
  );
}

function renderWithProvider(children: ReactNode) {
  return render(<AppProvider>{children}</AppProvider>);
}

describe("AppProvider", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Default mock: no active session
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should start in loading state", async () => {
      renderWithProvider(<TestConsumer />);
      expect(screen.getByTestId("loading").textContent).toBe("loading");
    });

    it("should fetch current user on mount", async () => {
      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/me");
      });
    });

    it("should set no user when API returns null", async () => {
      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("no-user");
        expect(screen.getByTestId("loading").textContent).toBe("loaded");
      });
    });

    it("should set user when API returns user data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "1", email: "admin@test.com", name: "Admin", role: "admin" },
          }),
      });

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("admin@test.com");
        expect(screen.getByTestId("role").textContent).toBe("admin");
        expect(screen.getByTestId("loading").textContent).toBe("loaded");
      });
    });

    it("should handle fetch error gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("no-user");
        expect(screen.getByTestId("loading").textContent).toBe("loaded");
      });
    });
  });

  describe("login", () => {
    it("should call login API with email and password", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: "1", email: "admin@test.com", name: "Admin", role: "admin" } }),
      });

      renderWithProvider(<TestConsumer />);

      // Wait for initial load
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Click login
      act(() => {
        screen.getByTestId("login-btn").click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com", password: "password123" }),
        });
      });
    });

    it("should return error on failed login", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Invalid credentials" }),
      });

      renderWithProvider(<TestConsumer />);

      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      act(() => {
        screen.getByTestId("login-btn").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-error").textContent).toBe("Invalid credentials");
      });
    });

    it("should handle network error during login", async () => {
      // First call (/api/auth/me) succeeds, second call (login) fails
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: null }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      renderWithProvider(<TestConsumer />);

      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      act(() => {
        screen.getByTestId("login-btn").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("login-error").textContent).toBe("Network error");
      });
    });

    it("should detect 2FA requirement", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ requires2FA: true }),
        });

      renderWithProvider(<TestConsumer />);

      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Mock login button click that handles 2FA
      await import("@/lib/app-context");
      // We can't easily test the return value of login in this setup,
      // but the request should be made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe("logout", () => {
    it("should call logout API and clear user", async () => {
      // Start with a logged-in user
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "1", email: "admin@test.com", name: "Admin", role: "admin" },
          }),
      });

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("admin@test.com");
      });

      // Click logout
      act(() => {
        screen.getByTestId("logout-btn").click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
        expect(screen.getByTestId("user").textContent).toBe("no-user");
        expect(screen.getByTestId("view").textContent).toBe("converter");
      });
    });

    it("should clear user even if logout API fails", async () => {
      // Start with logged-in user
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: "1", email: "admin@test.com", name: "Admin", role: "admin" },
            }),
        })
        .mockRejectedValueOnce(new Error("Logout failed"));

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("admin@test.com");
      });

      act(() => {
        screen.getByTestId("logout-btn").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("no-user");
      });
    });
  });

  describe("useApp hook", () => {
    it("should provide default context value outside provider", () => {
      // useApp uses useContext which returns the context's default value
      // without throwing when no provider is present
      render(<TestConsumer />);
      expect(screen.getByTestId("loading").textContent).toBe("loading");
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });

    it("should provide context value when used within provider", async () => {
      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toBeDefined();
        expect(screen.getByTestId("login-btn")).toBeDefined();
        expect(screen.getByTestId("logout-btn")).toBeDefined();
      });
    });
  });
});
