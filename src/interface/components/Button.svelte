<script lang="ts">
  // Destructure props to extract onClick function and text string, with a dynamic key-value pair for any other props
  let { onClick, text } = $props<{ onClick: () => void, text: string, [key: string]: any }>();
</script>

<!-- Button element with onClick event handler and styling classes -->
<button onclick={onClick} class='px-5 py-1.5 text-[0.75rem] bg-gradient-to-tr dark:from-[#38373D] dark:to-[#38373D]/80 from-[#DDDDDD] to-[#DDDDDD]/80 dark:text-white rounded-lg'>
  <!-- Display the text passed as a prop -->
  {text}
</button>
