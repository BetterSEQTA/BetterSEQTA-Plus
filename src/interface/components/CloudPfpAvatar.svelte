<script lang="ts">
  import { resolveCloudPfp } from "@/seqta/utils/cloudPfpCache";
  import type { CloudUser } from "@/seqta/utils/CloudAuth";

  const { user, class: className = "" } = $props<{
    user: CloudUser | null | undefined;
    class?: string;
  }>();

  let avatarSrc = $state<string | undefined>(undefined);
  let revokeUrl: string | undefined;

  $effect(() => {
    const u = user;
    if (revokeUrl) {
      URL.revokeObjectURL(revokeUrl);
      revokeUrl = undefined;
    }
    avatarSrc = undefined;

    if (!u?.pfpUrl || !u.id) return;

    let cancelled = false;
    void resolveCloudPfp(u.id, u.pfpUrl).then((resolved) => {
      if (cancelled || !resolved) return;
      if (resolved.fromCache) {
        revokeUrl = resolved.src;
      }
      avatarSrc = resolved.src;
    });

    return () => {
      cancelled = true;
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
        revokeUrl = undefined;
      }
    };
  });
</script>

{#if avatarSrc}
  <img src={avatarSrc} alt="" class={className} />
{/if}
