<script lang="ts">
  let {
    onClick,
    text,
    disabled = false,
  } = $props<{
    onClick: () => void;
    text: string;
    disabled?: boolean;
  }>();
</script>

<button
  type="button"
  onclick={onClick}
  disabled={disabled}
  class="px-5 py-1.5 text-[0.75rem] shadow-2xl border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white rounded-lg transition enabled:hover:brightness-125 enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
>
  {text}
</button>