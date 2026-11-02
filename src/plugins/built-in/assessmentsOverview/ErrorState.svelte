<script lang="ts">
  import OverviewIcon from "./OverviewIcon.svelte";

  let { error }: { error: string } = $props();
</script>

<div class="error-container bsplus-overview-animate">
  <OverviewIcon name="exclamation-circle" size={40} class="error-icon" />
  <p class="error-text">Failed to load assessments</p>
  <p class="error-detail">{error}</p>
</div>
