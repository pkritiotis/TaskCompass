export type AuthTokenProvider = {
  getToken(interactive?: boolean): Promise<string>;
  clearToken(token: string): Promise<void>;
};

type CachedAuthToken = {
  token: string;
  expiresAt: number;
};

const AUTH_CACHE_KEY = "googleOAuthAccessToken";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

type ChromeStorageArea = {
  get(keys: string | string[], callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>, callback: () => void): void;
  remove(keys: string | string[], callback: () => void): void;
};

export class ChromeWebAuthFlowTokenProvider implements AuthTokenProvider {
  private memoryToken: CachedAuthToken | null = null;

  constructor(
    private readonly clientId = readOAuthClientId(),
    private readonly scopes = readOAuthScopes(),
    private readonly storage: ChromeStorageArea = chrome.storage.local
  ) {}

  async getToken(interactive = false): Promise<string> {
    const cachedToken = this.memoryToken ?? (await this.getCachedToken());
    if (cachedToken && !isExpired(cachedToken)) {
      this.memoryToken = cachedToken;
      return cachedToken.token;
    }

    if (!interactive) {
      throw new Error("Google authorization is required.");
    }

    const token = await this.authorize();
    this.memoryToken = token;
    await this.setCachedToken(token);

    return token.token;
  }

  async clearToken(token: string): Promise<void> {
    if (this.memoryToken?.token === token) {
      this.memoryToken = null;
    }

    await this.removeCachedToken();
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST"
    }).catch(() => undefined);
  }

  private async authorize(): Promise<CachedAuthToken> {
    const redirectUri = chrome.identity.getRedirectURL("oauth2");
    const authUrl = new URL(GOOGLE_OAUTH_URL);
    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", this.scopes.join(" "));
    authUrl.searchParams.set("include_granted_scopes", "true");

    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    if (!redirectUrl) {
      throw new Error("Google authorization did not return a redirect URL.");
    }

    const hash = new URL(redirectUrl).hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const expiresInSeconds = Number(params.get("expires_in") ?? "3600");

    if (!accessToken) {
      throw new Error(params.get("error_description") ?? "Google authorization did not return a token.");
    }

    return {
      token: accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };
  }

  private async getCachedToken(): Promise<CachedAuthToken | null> {
    const items = await getStorageItems(this.storage, AUTH_CACHE_KEY);
    const cachedToken = items[AUTH_CACHE_KEY];

    if (!isCachedAuthToken(cachedToken)) {
      return null;
    }

    return cachedToken;
  }

  private async setCachedToken(token: CachedAuthToken): Promise<void> {
    await setStorageItems(this.storage, { [AUTH_CACHE_KEY]: token });
  }

  private async removeCachedToken(): Promise<void> {
    await removeStorageItems(this.storage, AUTH_CACHE_KEY);
  }
}

function readOAuthClientId(): string {
  const clientId = chrome.runtime.getManifest().oauth2?.client_id;
  if (!clientId) {
    throw new Error("Missing Google OAuth client ID in manifest.json.");
  }

  return clientId;
}

function readOAuthScopes(): string[] {
  const scopes = chrome.runtime.getManifest().oauth2?.scopes;
  if (!scopes?.length) {
    throw new Error("Missing Google OAuth scopes in manifest.json.");
  }

  return scopes;
}

function isExpired(token: CachedAuthToken): boolean {
  return token.expiresAt <= Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

function isCachedAuthToken(value: unknown): value is CachedAuthToken {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CachedAuthToken>;
  return typeof candidate.token === "string" && typeof candidate.expiresAt === "number";
}

function getStorageItems(
  storage: ChromeStorageArea,
  keys: string | string[]
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    storage.get(keys, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(items);
    });
  });
}

function setStorageItems(
  storage: ChromeStorageArea,
  items: Record<string, unknown>
): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

function removeStorageItems(storage: ChromeStorageArea, keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.remove(keys, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
