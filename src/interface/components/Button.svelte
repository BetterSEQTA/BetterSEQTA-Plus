<script lang="ts">
  let {
    onClick,
    text,
    disabled = false,
    variant = "secondary",
    icon,
    class: className = "",
  } = $props<{
    onClick: () => void;
    text: string;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost";
    icon?: string;
    class?: string;
  }>();

  const variants = {
    primary: "bg-zinc-100 text-zinc-900 border-transparent enabled:hover:bg-white",
    secondary: "dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white enabled:hover:brightness-125",
    ghost: "bg-transparent border-transparent dark:text-white enabled:hover:bg-zinc-200/60 dark:enabled:hover:bg-zinc-700/50",
  };
</script>

<button
  type="button"
  onclick={onClick}
  disabled={disabled}
  class="inline-flex items-center justify-center gap-1.5 px-5 py-1.5 text-[0.75rem] shadow-2xl border rounded-lg transition enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 {variants[variant]} {className}"
>
  {#if icon}<span class="font-IconFamily text-base" aria-hidden="true">{icon}</span>{/if}
  {text}
</button>
