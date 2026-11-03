<script lang="ts">
  import {
    resolveCloudPfp,
    defaultAccountsPfpUrl,
    revokePfpUrl,
  } from "@/seqta/utils/cloudPfpCache";
  import type { CloudUser } from "@/seqta/utils/cloudAuth";

  const {
    user,
    class: className = "",
  }: {
    user: CloudUser | null | undefined;
    class?: string;
  } = $props();

  let avatarSrc = $state<string | null>(null);

  $effect(() => {
    const u = user;
    avatarSrc = null;
    if (!u?.id) return;

    let cancelled = false;
    let resolved: string | null = null;
    void resolveCloudPfp(u.id, u.pfpUrl ?? defaultAccountsPfpUrl(u.id)).then((src) => {
      resolved = src;
      if (cancelled) return revokePfpUrl(src);
      avatarSrc = src;
    });

    return () => {
      cancelled = true;
      revokePfpUrl(resolved);
    };
  });
</script>

{#if avatarSrc}
  <img src={avatarSrc} alt="" class={className} />
{/if}
