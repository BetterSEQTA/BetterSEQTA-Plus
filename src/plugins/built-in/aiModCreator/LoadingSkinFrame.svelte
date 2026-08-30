<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="bk-skin">
  <div class="bk-skin__vignette" aria-hidden="true"></div>
  <div class="bk-skin__content">
    {@render children()}
  </div>
</div>

<style>
  .bk-skin {
    position: relative;
    overflow: hidden;
    color: #f4f4f5;
    background: linear-gradient(
      180deg,
      #010101 0%,
      #040404 50%,
      #080808 100%
    );
  }

  .bk-skin__vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 40%,
      rgb(0 0 0 / 0.55) 100%
    );
    pointer-events: none;
  }

  .bk-skin__content {
    position: relative;
    z-index: 1;
  }
</style>
