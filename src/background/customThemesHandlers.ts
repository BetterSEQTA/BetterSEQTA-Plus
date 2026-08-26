type MessageSender = { (response?: unknown): void };

type UploadFilePart = {
  fieldName: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
};

type UploadPayload = {
  themeZip?: UploadFilePart;
  looseFiles?: UploadFilePart[];
  submissionNotes?: string;
};

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function buildFormDataFromPayload(payload: UploadPayload): FormData {
  const form = new FormData();
  if (payload.themeZip) {
    const part = payload.themeZip;
    form.append(
      part.fieldName,
      base64ToBlob(part.dataBase64, part.mimeType),
      part.filename,
    );
  }
  for (const part of payload.looseFiles ?? []) {
    form.append(
      part.fieldName,
      base64ToBlob(part.dataBase64, part.mimeType),
      part.filename,
    );
  }
  if (payload.submissionNotes?.trim()) {
    form.append("submission_notes", payload.submissionNotes.trim());
  }
  return form;
}

export function createCustomThemesHandlers(deps: {
  apiBase: () => string;
  getAccessTokenFromStorage: () => Promise<string | null>;
  parseJsonResponse: (r: Response) => Promise<any>;
}): Record<string, (request: any, sendResponse: MessageSender) => boolean> {
  async function customThemesJsonFetch(
    path: string,
    init: RequestInit = {},
    requireAuth = false,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (requireAuth) {
      const token = await deps.getAccessTokenFromStorage();
      if (!token) {
        return { success: false, error: "Not authenticated", httpStatus: 401 };
      }
      headers.Authorization = `Bearer ${token}`;
    }
    const r = await fetch(`${deps.apiBase()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const json = await deps.parseJsonResponse(r);
    if (json && typeof json === "object") {
      return { ...json, httpStatus: r.status };
    }
    return { success: false, error: `HTTP ${r.status}`, httpStatus: r.status };
  }

  async function customThemesMultipartPost(
    path: string,
    payload: UploadPayload,
  ): Promise<Record<string, unknown>> {
    const token = await deps.getAccessTokenFromStorage();
    if (!token) {
      return { success: false, error: "Not authenticated", httpStatus: 401 };
    }
    const form = buildFormDataFromPayload(payload);
    const r = await fetch(`${deps.apiBase()}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      cache: "no-store",
    });
    const json = await deps.parseJsonResponse(r);
    if (json && typeof json === "object") {
      return { ...json, httpStatus: r.status };
    }
    return { success: false, error: `HTTP ${r.status}`, httpStatus: r.status };
  }

  function handleFetchCustomThemes(request: any, sendResponse: MessageSender): boolean {
    void (async () => {
      try {
        const params = new URLSearchParams();
        params.set("type", "betterseqta");
        params.set("page", String(request.page ?? 1));
        params.set("limit", String(request.limit ?? 20));
        if (request.sort) params.set("sort", String(request.sort));
        const search = request.search?.trim();
        const path = search
          ? `/api/custom-themes/search?${params}&q=${encodeURIComponent(search)}`
          : `/api/custom-themes?${params}`;
        sendResponse(await customThemesJsonFetch(path));
      } catch (err) {
        console.error("[Background] fetchCustomThemes error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Fetch failed",
        });
      }
    })();
    return true;
  }

  function handleFetchMyCustomThemes(request: any, sendResponse: MessageSender): boolean {
    void (async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(request.page ?? 1));
        params.set("limit", String(request.limit ?? 20));
        params.set("type", "betterseqta");
        if (request.status) params.set("status", String(request.status));
        sendResponse(
          await customThemesJsonFetch(`/api/custom-themes/mine?${params}`, {}, true),
        );
      } catch (err) {
        console.error("[Background] fetchMyCustomThemes error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Fetch failed",
        });
      }
    })();
    return true;
  }

  function handleFetchMyCustomThemeDetail(request: any, sendResponse: MessageSender): boolean {
    const { themeId } = request;
    if (!themeId || typeof themeId !== "string") {
      sendResponse({ success: false, error: "Missing themeId" });
      return false;
    }
    void (async () => {
      try {
        sendResponse(
          await customThemesJsonFetch(
            `/api/custom-themes/mine/${encodeURIComponent(themeId)}`,
            {},
            true,
          ),
        );
      } catch (err) {
        console.error("[Background] fetchMyCustomThemeDetail error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Fetch failed",
        });
      }
    })();
    return true;
  }

  function handleSubmitCustomTheme(request: any, sendResponse: MessageSender): boolean {
    const payload = request.payload as UploadPayload | undefined;
    if (!payload?.themeZip && (!payload?.looseFiles || payload.looseFiles.length === 0)) {
      sendResponse({ success: false, error: "Missing upload files" });
      return false;
    }
    void (async () => {
      try {
        sendResponse(await customThemesMultipartPost("/api/custom-themes/mine", payload!));
      } catch (err) {
        console.error("[Background] submitCustomTheme error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    })();
    return true;
  }

  function handleReplaceCustomThemeFiles(request: any, sendResponse: MessageSender): boolean {
    const { themeId, payload } = request;
    if (!themeId || typeof themeId !== "string") {
      sendResponse({ success: false, error: "Missing themeId" });
      return false;
    }
    if (!payload?.themeZip && (!payload?.looseFiles || payload.looseFiles.length === 0)) {
      sendResponse({ success: false, error: "Missing upload files" });
      return false;
    }
    void (async () => {
      try {
        sendResponse(
          await customThemesMultipartPost(
            `/api/custom-themes/mine/${encodeURIComponent(themeId)}/files`,
            payload,
          ),
        );
      } catch (err) {
        console.error("[Background] replaceCustomThemeFiles error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    })();
    return true;
  }

  function handleUpdateCustomThemeMetadata(request: any, sendResponse: MessageSender): boolean {
    const { themeId, body } = request;
    if (!themeId || typeof themeId !== "string") {
      sendResponse({ success: false, error: "Missing themeId" });
      return false;
    }
    void (async () => {
      try {
        sendResponse(
          await customThemesJsonFetch(
            `/api/custom-themes/mine/${encodeURIComponent(themeId)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body ?? {}),
            },
            true,
          ),
        );
      } catch (err) {
        console.error("[Background] updateCustomThemeMetadata error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Update failed",
        });
      }
    })();
    return true;
  }

  function handleDeleteCustomTheme(request: any, sendResponse: MessageSender): boolean {
    const { themeId } = request;
    if (!themeId || typeof themeId !== "string") {
      sendResponse({ success: false, error: "Missing themeId" });
      return false;
    }
    void (async () => {
      try {
        sendResponse(
          await customThemesJsonFetch(
            `/api/custom-themes/mine/${encodeURIComponent(themeId)}`,
            { method: "DELETE" },
            true,
          ),
        );
      } catch (err) {
        console.error("[Background] deleteCustomTheme error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Delete failed",
        });
      }
    })();
    return true;
  }

  return {
    fetchCustomThemes: handleFetchCustomThemes,
    fetchMyCustomThemes: handleFetchMyCustomThemes,
    fetchMyCustomThemeDetail: handleFetchMyCustomThemeDetail,
    submitCustomTheme: handleSubmitCustomTheme,
    replaceCustomThemeFiles: handleReplaceCustomThemeFiles,
    updateCustomThemeMetadata: handleUpdateCustomThemeMetadata,
    deleteCustomTheme: handleDeleteCustomTheme,
  };
}
