<script lang="ts">
  // Destructure optional width and height props with default fallbacks
  let { width, height} = $props<{width?: string, height?: string}>()
</script>

<!--
  Placeholder div styled as a loading skeleton.
  - Uses optional width and height props or defaults to 100%.
  - Background color provides neutral appearance.
  - Tailwind's animate-pulse class adds pulsing animation to indicate loading.
-->
<div style="width: {width ? width : '100%'}; height: {height ? height : '100%'}; background: #e0e0e0;" class="animate-pulse"></div>
