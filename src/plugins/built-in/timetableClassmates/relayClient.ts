import type { RelaySessionResponse } from "./accountsClient";
import type { RelayWireBundle } from "./relayCrypto";

export type RelaySnapshotShare = {
  seqta_student_id: number;
  cloud_user_id: string;
  share_code: string;
  period: { from: string; until: string };
  updated_at: number;
  bundles: RelayWireBundle[];
};

const RELAY_TIMEOUT_MS = 45_000;

function wsConnectUrl(session: RelaySessionResponse, instanceHost: string): string {
  const base = session.ws_url.replace(/^http/, "ws");
  const q = new URLSearchParams({
    instance_host: instanceHost,
    relay_token: session.relay_token,
  });
  return `${base}?${q.toString()}`;
}

export type RelaySyncHandlers = {
  onSnapshot: (shares: RelaySnapshotShare[]) => void | Promise<void>;
  buildPublish: () => Promise<{
    period: { from: string; until: string };
    bundles: RelayWireBundle[];
  }>;
};

export async function runRelayRoundTrip(
  instanceHost: string,
  session: RelaySessionResponse,
  handlers: RelaySyncHandlers,
): Promise<{ ok: boolean; error?: string }> {
  return await new Promise((resolve) => {
    let settled = false;
    let published = false;
    let snapshotCount = 0;

    const finish = (result: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const url = wsConnectUrl(session, instanceHost);
    const ws = new WebSocket(url);
    const timer = setTimeout(() => finish({ ok: false, error: "Relay connection timed out" }), RELAY_TIMEOUT_MS);

    ws.addEventListener("message", (event) => {
      void (async () => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            v?: number;
            type?: string;
            shares?: RelaySnapshotShare[];
            message?: string;
          };
          if (msg.v !== 1) return;
          if (msg.type === "error") {
            finish({ ok: false, error: msg.message ?? "Relay error" });
            return;
          }
          if (msg.type !== "snapshot" || !Array.isArray(msg.shares)) return;

          snapshotCount += 1;
          await handlers.onSnapshot(msg.shares);

          if (!published) {
            published = true;
            const publish = await handlers.buildPublish();
            ws.send(
              JSON.stringify({
                v: 1,
                type: "publish",
                period: publish.period,
                bundles: publish.bundles,
              }),
            );
            return;
          }

          if (snapshotCount >= 2) {
            finish({ ok: true });
          }
        } catch {
          finish({ ok: false, error: "Invalid relay message" });
        }
      })();
    });

    ws.addEventListener("error", () => finish({ ok: false, error: "Relay WebSocket error" }));
    ws.addEventListener("close", () => {
      if (!settled) finish({ ok: false, error: "Relay closed before sync completed" });
    });
  });
}

export async function sendRelayRevoke(
  instanceHost: string,
  session: RelaySessionResponse,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const ws = new WebSocket(wsConnectUrl(session, instanceHost));
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve();
    }, 8_000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ v: 1, type: "revoke" }));
    });
    ws.addEventListener("message", () => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
