<script lang="ts">
  let { onClick, text } = $props<{ onClick: () => void, text: string, [key: string]: any }>();
</script>

<button onclick={onClick} class='px-4 py-1 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white rounded-md'>
  {text}
</button>