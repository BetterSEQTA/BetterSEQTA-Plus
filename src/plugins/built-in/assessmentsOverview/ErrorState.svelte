<script lang="ts">
  export let error: string;
</script>

<div class="error-container">
  <p class="error-text">Failed to load assessments</p>
  <p style="color: #94a3b8; font-size: 0.875rem;">{error}</p>
</div>