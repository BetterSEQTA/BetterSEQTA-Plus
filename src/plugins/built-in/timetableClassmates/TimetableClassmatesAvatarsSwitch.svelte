<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import { loadSession, notifyClassmatesUpdated, patchSession } from "./rosterStore";

  let showAvatars = $state(false);

  $effect(() => {
    void loadSession().then((session) => {
      showAvatars = session.showAvatars;
    });
  });

  async function onChange(value: boolean) {
    await patchSession({ showAvatars: value });
    showAvatars = value;
    notifyClassmatesUpdated();
  }
</script>

<Switch state={showAvatars} onChange={(value) => void onChange(value)} />
