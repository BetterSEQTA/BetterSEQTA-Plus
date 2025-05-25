<script lang="ts">
  let { onClick, text } = $props<{ onClick: () => void, text: string, [key: string]: any }>();
</script>

<button onclick={onClick} class='px-5 py-1.5 text-[0.75rem] shadow-2xl border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white rounded-lg'>
  {text}
</button>