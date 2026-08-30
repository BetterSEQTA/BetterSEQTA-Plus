<script lang="ts">
  import loadingSpinner from "@/seqta/ui/loading-spinner.html?raw";
</script>

<div class="bk-spinner-mini" aria-hidden="true">
  {@html loadingSpinner}
</div>

<style>
  .bk-spinner-mini {
    position: relative;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    color: var(--better-main, #8b5cf6);
  }

  .bk-spinner-mini :global(.svg) {
    transform-origin: center center;
    position: absolute;
    top: 50%;
    left: 50%;
    backface-visibility: hidden;
    will-change: transform;
  }

  .bk-spinner-mini :global(.logo) {
    transform: translate3d(-50%, -50%, 0);
    z-index: 2;
    width: 28px;
    height: 28px;
  }

  .bk-spinner-mini :global(.big-circle) {
    margin: -38px;
    width: 76px;
    height: 76px;
    animation: bk-spin 3s linear infinite;
  }

  .bk-spinner-mini :global(.small-circle) {
    margin: -29px;
    width: 58px;
    height: 58px;
    animation: bk-spin-reverse 3s linear infinite;
  }

  .bk-spinner-mini :global(.outer-circle) {
    margin: -46px;
    width: 92px;
    height: 92px;
    animation: bk-spin 4.5s linear infinite;
  }

  @keyframes bk-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bk-spin-reverse {
    to {
      transform: rotate(-360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bk-spinner-mini :global(.big-circle),
    .bk-spinner-mini :global(.small-circle),
    .bk-spinner-mini :global(.outer-circle) {
      animation: none !important;
    }
  }
</style>
