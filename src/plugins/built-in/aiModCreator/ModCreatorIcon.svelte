<script lang="ts">
  let { size = 20 }: { size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  class="mod-creator-icon"
>
  <path
    d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z"
    fill="currentColor"
    opacity="0.95"
  />
  <path
    d="M18 3L18.6 5.4L21 6L18.6 6.6L18 9L17.4 6.6L15 6L17.4 5.4L18 3Z"
    fill="currentColor"
    opacity="0.75"
  />
</svg>

<style>
  .mod-creator-icon {
    display: block;
    flex-shrink: 0;
    color: currentColor;
  }
</style>
