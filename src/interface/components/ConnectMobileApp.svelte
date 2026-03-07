<script lang="ts">
  import { fade } from "svelte/transition";
  import browser from "webextension-polyfill";
  import QRCode from "qrcode";

  const DESQTA_DOWNLOAD_URL = "https://betterseqta.org/desqta";
  const DEEPLINK_PREFIX = "desqta://connect/";

  let showQrModal = $state(false);
  let qrDataUrl = $state<string | null>(null);
  let deeplink = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);
  let isLoading = $state(false);
  let isStandalone = $state(false);

  function isSeqtaUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname.includes("seqta") || u.hostname.endsWith(".edu.au");
    } catch {
      return false;
    }
  }

  function normalizeBaseUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.origin;
    } catch {
      return url;
    }
  }

  function buildDesqtaConnectPayload(baseUrl: string, jsessionId: string): string {
    const payload = JSON.stringify({ u: baseUrl, s: jsessionId });
    const base64 = btoa(unescape(encodeURIComponent(payload)));
    const encoded = encodeURIComponent(base64);
    return `${DEEPLINK_PREFIX}${encoded}`;
  }

  async function getSession(): Promise<{ baseUrl: string; jsessionId: string } | null> {
    let baseUrl: string | undefined;

    if (window.location.protocol === "chrome-extension:") {
      // Extension popup: background will get URL from active tab
      baseUrl = undefined;
    } else {
      // In-page (settings inside SEQTA): pass current page URL (cookies API not available in content scripts)
      baseUrl = normalizeBaseUrl(window.location.href);
      if (!isSeqtaUrl(baseUrl)) return null;
    }

    const { session } = (await browser.runtime.sendMessage({
      type: "getSeqtaSession",
      baseUrl,
    })) as { session: { baseUrl: string; jsessionId: string } | null };
    return session ?? null;
  }

  async function generateQrCode() {
    errorMessage = null;
    qrDataUrl = null;
    isLoading = true;

    try {
      isStandalone = window.location.protocol === "chrome-extension:";
      const session = await getSession();

      if (!session) {
        if (isStandalone) {
          errorMessage =
            "Open SEQTA Learn in a tab and log in, then open settings from that tab to generate a QR code.";
        } else {
          errorMessage = "Please log in to SEQTA Learn first.";
        }
        return;
      }

      const link = buildDesqtaConnectPayload(session.baseUrl, session.jsessionId);
      const dataUrl = await QRCode.toDataURL(link, { width: 256, margin: 2 });
      deeplink = link;
      qrDataUrl = dataUrl;
      showQrModal = true;
    } catch (err) {
      console.error("[ConnectMobileApp] Failed to generate QR:", err);
      errorMessage = "Failed to generate QR code. Please try again.";
    } finally {
      isLoading = false;
    }
  }

  function closeModal() {
    showQrModal = false;
    qrDataUrl = null;
    deeplink = null;
    errorMessage = null;
  }

  function openInDesqta() {
    if (deeplink) window.location.href = deeplink;
  }

  function downloadQrImage() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "desqta-login-qr.png";
    link.click();
  }
</script>

<div class="flex flex-col items-end gap-1">
  <a
    href={DESQTA_DOWNLOAD_URL}
    target="_blank"
    rel="noopener noreferrer"
    class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-sm transition-all duration-200">
    Download
  </a>
  <button
    type="button"
    onclick={generateQrCode}
    disabled={isLoading}
    class="px-5 py-1.5 text-[0.75rem] shadow-2xl border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
    {isLoading ? "Generating..." : "Generate QR"}
  </button>
  {#if errorMessage}
    <p class="text-xs text-amber-600 dark:text-amber-400 text-right">{errorMessage}</p>
  {/if}
</div>

{#if showQrModal && qrDataUrl}
  <div
    class="fixed inset-0 z-[10000] flex justify-center items-center bg-black/50 backdrop-blur-sm"
    role="button"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) closeModal();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") closeModal();
    }}
    transition:fade={{ duration: 150 }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="p-6 mx-4 w-full max-w-sm bg-white rounded-2xl shadow-2xl dark:bg-zinc-800"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold text-zinc-900 dark:text-white">Scan with DesQTA</h2>
        <button
          type="button"
          onclick={closeModal}
          class="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex justify-center p-4 bg-white dark:bg-zinc-900 rounded-xl">
        <img src={qrDataUrl} alt="DesQTA QR Code" class="w-64 h-64" />
      </div>
      <div class="flex flex-col gap-2 mt-4">
        <button
          type="button"
          onclick={openInDesqta}
          class="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
          Sign into DesQTA Desktop
        </button>
        <button
          type="button"
          onclick={downloadQrImage}
          class="w-full px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          Download QR as image
        </button>
      </div>
      <p class="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Or scan this QR code with DesQTA on your phone.
      </p>
    </div>
  </div>
{/if}
