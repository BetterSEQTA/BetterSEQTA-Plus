import browser from "webextension-polyfill";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const REDIRECT_URI = "https://accounts.betterseqta.org/auth/bsplus/callback";

const STORAGE_KEYS = {
  clientId: "bsplus_client_id",
  accessToken: "bsplus_token",
  refreshToken: "bsplus_refresh_token",
  user: "bsplus_user",
} as const;

export type CloudUser = {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  admin_level?: number;
};

export type CloudAuthState = {
  isLoggedIn: boolean;
  user: CloudUser | null;
};

type Listener = (_: CloudAuthState) => void;

class CloudAuthService {
  private static instance: CloudAuthService;
  private listeners = new Set<Listener>();
  private _state: CloudAuthState = { isLoggedIn: false, user: null };

  private constructor() {
    void this.loadFromStorage();
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (
        areaName === "local" &&
        (changes[STORAGE_KEYS.accessToken] ||
          changes[STORAGE_KEYS.user] ||
          changes[STORAGE_KEYS.clientId])
      ) {
        void this.loadFromStorage();
      }
    });
  }

  public static getInstance(): CloudAuthService {
    if (!CloudAuthService.instance) {
      CloudAuthService.instance = new CloudAuthService();
    }
    return CloudAuthService.instance;
  }

  public get state(): CloudAuthState {
    return this._state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this._state);
    return () => this.listeners.delete(listener);
  }

  private async loadFromStorage(): Promise<void> {
    const result = await browser.storage.local.get([
      STORAGE_KEYS.accessToken,
      STORAGE_KEYS.user,
    ]);
    const token = result[STORAGE_KEYS.accessToken] as string | undefined;
    const user = result[STORAGE_KEYS.user] as CloudUser | undefined;
    this._state = {
      isLoggedIn: !!token,
      user: user ?? null,
    };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }

  public async getStoredToken(): Promise<string | null> {
    const result = await browser.storage.local.get(STORAGE_KEYS.accessToken);
    return (result[STORAGE_KEYS.accessToken] as string) ?? null;
  }

  private async getClientId(): Promise<string> {
    let clientId = (settingsState as any)[STORAGE_KEYS.clientId] as string | undefined;
    if (!clientId) {
      const stored = await browser.storage.local.get(STORAGE_KEYS.clientId);
      clientId = stored[STORAGE_KEYS.clientId] as string | undefined;
    }
    if (!clientId) {
      const reserveResult = (await browser.runtime.sendMessage({
        type: "cloudReserveClient",
        redirect_uri: REDIRECT_URI,
      })) as { client_id?: string; error?: string };
      if (!reserveResult?.client_id) {
        throw new Error(reserveResult?.error ?? "Failed to reserve client");
      }
      clientId = reserveResult.client_id;
      (settingsState as any).setKey(STORAGE_KEYS.clientId, clientId);
    }
    return clientId;
  }

  public async login(
    login: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const clientId = await this.getClientId();
      const result = (await browser.runtime.sendMessage({
        type: "cloudLogin",
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        login: login.trim(),
        password,
      })) as {
        access_token?: string;
        refresh_token?: string;
        user?: CloudUser;
        error?: string;
      };
      if (result?.access_token && result?.refresh_token) {
        (settingsState as any).setKey(STORAGE_KEYS.accessToken, result.access_token);
        (settingsState as any).setKey(STORAGE_KEYS.refreshToken, result.refresh_token);
        (settingsState as any).setKey(STORAGE_KEYS.user, result.user ?? null);
        this._state = {
          isLoggedIn: true,
          user: result.user ?? null,
        };
        this.notify();
        return { success: true };
      }
      return {
        success: false,
        error: result?.error ?? "Login failed",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Login failed",
      };
    }
  }

  public async logout(): Promise<void> {
    await browser.storage.local.remove([
      STORAGE_KEYS.accessToken,
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.user,
      "cloudAccessToken",
      "cloudUsername",
    ]);
    this._state = { isLoggedIn: false, user: null };
    this.notify();
  }

  public async refreshToken(): Promise<boolean> {
    const result = await browser.storage.local.get([
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.clientId,
    ]);
    const refreshToken = result[STORAGE_KEYS.refreshToken] as string | undefined;
    const clientId = result[STORAGE_KEYS.clientId] as string | undefined;
    if (!refreshToken || !clientId) return false;

    const refreshResult = (await browser.runtime.sendMessage({
      type: "cloudRefresh",
      refresh_token: refreshToken,
      client_id: clientId,
    })) as {
      access_token?: string;
      refresh_token?: string;
      user?: CloudUser;
      error?: string;
    };

    if (refreshResult?.access_token && refreshResult?.refresh_token) {
      (settingsState as any).setKey(STORAGE_KEYS.accessToken, refreshResult.access_token);
      (settingsState as any).setKey(STORAGE_KEYS.refreshToken, refreshResult.refresh_token);
      (settingsState as any).setKey(STORAGE_KEYS.user, refreshResult.user ?? null);
      this._state = {
        isLoggedIn: true,
        user: refreshResult.user ?? null,
      };
      this.notify();
      return true;
    }
    return false;
  }
}

export const cloudAuth = CloudAuthService.getInstance();
