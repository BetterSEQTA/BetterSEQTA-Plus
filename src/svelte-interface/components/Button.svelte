<script lang="ts">
  export let onClick: () => void;
  export let text: string;
</script>

<button on:click={onClick} class='px-4 py-1 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white rounded-md'>
  {text}
</button>