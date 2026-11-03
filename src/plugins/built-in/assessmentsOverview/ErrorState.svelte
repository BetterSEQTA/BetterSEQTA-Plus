<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";

  let { error }: { error: string } = $props();
</script>

<div class="error-container bsplus-overview-animate">
  <CircleAlertIcon size={40} class="bsplus-overview-icon error-icon" />
  <p class="error-text">Failed to load assessments</p>
  <p class="error-detail">{error}</p>
</div>
