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
  class="px-5 py-1.5 text-[0.75rem] shadow-2xl border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
>
  {text}
</button>