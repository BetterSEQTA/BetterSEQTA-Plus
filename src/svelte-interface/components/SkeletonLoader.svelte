<script lang="ts">
  let { width, height} = $props<{width?: string, height?: string}>()
</script>

<div style="width: {width ? width : '100%'}; height: {height ? height : '100%'}; background: #e0e0e0;" class="animate-pulse"></div>
