import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

function installChromeMock(options: { authenticated: boolean; storage?: Record<string, unknown> }) {
  const syncStorage = { ...(options.storage ?? {}) };
  const localStorage = options.authenticated
    ? {
        googleOAuthAccessToken: {
          token: "token-1",
          expiresAt: Date.now() + 60 * 60 * 1000
        }
      }
    : {};

  function createStorageArea(storage: Record<string, unknown>) {
    return {
      get: vi.fn((keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
        const requestedKeys = Array.isArray(keys) ? keys : [keys];
        const result = requestedKeys.reduce<Record<string, unknown>>((accumulator, key) => {
          if (key in storage) {
            accumulator[key] = storage[key];
          }
          return accumulator;
        }, {});
        callback(result);
      }),
      set: vi.fn((items: Record<string, unknown>, callback: () => void) => {
        Object.assign(storage, items);
        callback();
      }),
      remove: vi.fn((keys: string | string[], callback: () => void) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          delete storage[key];
        }
        callback();
      })
    };
  }

  vi.stubGlobal("chrome", {
    runtime: {
      lastError: undefined,
      onInstalled: { addListener: vi.fn() },
      getManifest: vi.fn(() => ({
        oauth2: {
          client_id: "web-client-id.apps.googleusercontent.com",
          scopes: ["https://www.googleapis.com/auth/tasks"]
        }
      }))
    },
    sidePanel: {
      setPanelBehavior: vi.fn().mockResolvedValue(undefined)
    },
    identity: {
      getRedirectURL: vi.fn(() => "https://extension-id.chromiumapp.org/oauth2"),
      launchWebAuthFlow: vi.fn(() =>
        Promise.resolve("https://extension-id.chromiumapp.org/oauth2#access_token=token-1&expires_in=3600")
      )
    },
    storage: {
      sync: createStorageArea(syncStorage),
      local: createStorageArea(localStorage)
    }
  });

  return {
    localStorage,
    syncStorage
  };
}

function installFetchMock(responseByUrl: Array<[string, unknown]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const matched = responseByUrl.find(([fragment]) => url.includes(fragment));
      if (!matched) {
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Unexpected URL")
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(matched[1])
      });
    })
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("shows the auth state when Google is not connected", async () => {
    installChromeMock({ authenticated: false });
    installFetchMock([]);
    const { App } = await import("./App");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /connect google tasks/i })).toBeVisible();
  });

  it("shows the list picker after authentication when no list is remembered", async () => {
    installChromeMock({ authenticated: true });
    installFetchMock([
      [
        "/users/@me/lists",
        {
          items: [{ id: "list-1", title: "Today" }]
        }
      ]
    ]);
    const { App } = await import("./App");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /choose a task list/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "Today" })).toBeVisible();
  });

  it("shows an empty state for a remembered list with no incomplete tasks", async () => {
    installChromeMock({ authenticated: true, storage: { selectedTaskListId: "list-1" } });
    installFetchMock([
      ["/users/@me/lists", { items: [{ id: "list-1", title: "Today" }] }],
      ["/lists/list-1/tasks", { items: [] }]
    ]);
    const { App } = await import("./App");

    render(<App />);

    expect(await screen.findByText(/no incomplete tasks/i)).toBeVisible();
  });

  it("renders a populated matrix for a remembered task list", async () => {
    installChromeMock({ authenticated: true, storage: { selectedTaskListId: "list-1" } });
    installFetchMock([
      ["/users/@me/lists", { items: [{ id: "list-1", title: "Today" }] }],
      [
        "/lists/list-1/tasks",
        {
          items: [{ id: "task-1", title: "Send report", status: "needsAction" }]
        }
      ]
    ]);
    const { App } = await import("./App");

    render(<App />);

    expect(await screen.findByText("Send report")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Eliminate" })).toBeVisible();
  });

  it("can select a task list from the picker", async () => {
    const user = userEvent.setup();
    installChromeMock({ authenticated: true });
    installFetchMock([
      ["/users/@me/lists", { items: [{ id: "list-1", title: "Today" }] }],
      [
        "/lists/list-1/tasks",
        {
          items: [{ id: "task-1", title: "Review notes", status: "needsAction" }]
        }
      ]
    ]);
    const { App } = await import("./App");

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Today" }));

    await waitFor(() => expect(screen.getByText("Review notes")).toBeVisible());
  });

  it("disconnects Google and revokes the cached token", async () => {
    const user = userEvent.setup();
    const storage = installChromeMock({ authenticated: true, storage: { selectedTaskListId: "list-1" } });
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/@me/lists")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ id: "list-1", title: "Today" }] })
        });
      }
      if (url.includes("/lists/list-1/tasks")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "task-1", title: "Review notes", status: "needsAction" }]
            })
        });
      }
      if (url.includes("https://oauth2.googleapis.com/revoke")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      }

      return Promise.resolve({
        ok: false,
        text: () => Promise.resolve("Unexpected URL")
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { App } = await import("./App");

    render(<App />);

    await screen.findByText("Review notes");
    await user.click(screen.getByTitle("Disconnect Google"));

    expect(await screen.findByRole("heading", { name: /connect google tasks/i })).toBeVisible();
    expect(storage.localStorage.googleOAuthAccessToken).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/revoke?token=token-1",
      { method: "POST" }
    );
  });
});
