<script lang="ts">
  // Destructure optional props with default values: size and color
  let { size = 'md', color = 'currentColor' } = $props();

  // Mapping size labels to actual CSS dimensions
  const sizeMap = {
    sm: '1rem',
    md: '2rem',
    lg: '3rem',
  };

  // Compute final dimension based on provided size prop or custom value
  let dimensions = $derived(sizeMap[size as keyof typeof sizeMap] || size);
</script>

<!--
  SVG spinner icon.
  - Uses Tailwind's animate-spin for rotation.
  - Dynamic size and color based on props.
-->
<svg
  class="animate-spin"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  width={dimensions}
  height={dimensions}
>
  <!--
    Background circle of the spinner.
    - Light opacity stroke for base layer.
  -->
  <circle
    class="opacity-25"
    cx="12"
    cy="12"
    r="10"
    stroke={color}
    stroke-width="4"
  ></circle>
  
  <!--
    Foreground animated segment of the spinner.
    - Uses path fill for contrast against background circle.
  -->
  <path
    class="opacity-75"
    fill={color}
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  ></path>
</svg>
