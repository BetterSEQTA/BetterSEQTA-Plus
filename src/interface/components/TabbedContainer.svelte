<script lang="ts">
  // Importing Svelte component and CSS styles
  import MotionDiv from './MotionDiv.svelte';
  import './TabbedContainer.css';
  import { onMount } from 'svelte';

  // Define props and state variables
  let { tabs } = $props<{ tabs: { title: string, Content: any, props?: any }[] }>(); // Tabs contains title, content, and optional props
  let activeTab = $state(0); // Tracks the index of the currently active tab
  let containerRef: HTMLElement | null = null; // Reference to the container element for tabs
  let tabWidth = $state(0); // Holds the calculated width of each tab

  // Spring transition settings for animations
  const springTransition = { type: 'spring', stiffness: 250, damping: 25 };

  // Function to update the width of the tabs based on the number of tabs
  const updateTabWidth = () => {
    tabWidth = tabs.length > 0 ? 100 / tabs.length : 0; // Calculate tab width as a percentage
    if (!containerRef) return;
    containerRef.style.setProperty('--tab-width', `${tabWidth}%`); // Update CSS variable for tab width
  };

  // Function to calculate the X position for tab transition
  const calcXPos = (index: number | null) => {
    if (containerRef) {
      // Calculate the position for tab sliding effect based on active tab
      return tabWidth * (index !== null ? index : activeTab) * containerRef.getBoundingClientRect().width / 100;
    }
    return 0;
  };

  // Run the updateTabWidth function when the component is mounted
  onMount(() => {
    updateTabWidth(); // Initial tab width update

    // Event listener to handle messages (e.g., popup closure) and reset active tab
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "popupClosed") {
        activeTab = 0; // Reset to the first tab when a popup is closed
      }
    };
    window.addEventListener("message", handleMessage); // Listen for messages

    return () => {
      window.removeEventListener("message", handleMessage); // Clean up event listener on component destruction
    };
  });
</script>

<div class="flex flex-col h-full">
  <div class="top-0 z-10 text-[0.875rem] pb-0.5 mx-4 px-2 tab-width-container">
    <div bind:this={containerRef} class="flex relative">
      <!-- MotionDiv for background animation when switching tabs -->
      <MotionDiv
        class="absolute top-0 left-0 z-0 h-full bg-gradient-to-tr dark:from-[#38373D]/80 dark:to-[#38373D] from-[#DDDDDD]/80 to-[#DDDDDD] rounded-full opacity-40 tab-width"
        animate={{ x: calcXPos(activeTab) }} // Apply calculated X position for transition
        transition={springTransition} // Apply spring transition
      />
      <!-- Loop through tabs and create a button for each -->
      {#each tabs as { title }, index}
        <button
          class="relative z-10 flex-1 px-4 py-2 focus-visible:outline-none"
          onclick={() => activeTab = index} // Set activeTab on button click
        >
          {title} <!-- Display tab title -->
        </button>
      {/each}
    </div>
  </div>
  <div class="overflow-hidden px-4 h-full">
    <!-- MotionDiv for the content transition between tabs -->
    <MotionDiv
      class="h-full"
      animate={{ x: `${-activeTab * 100}%` }} // Slide content horizontally based on active tab
      transition={springTransition} // Apply spring transition
    >
      <div class="flex">
        <!-- Loop through tabs and render corresponding content -->
        {#each tabs as { Content, props }, index}
        <div class="absolute focus:outline-none w-full pt-2 transition-opacity duration-300 overflow-y-scroll no-scrollbar pb-2 h-full tab {activeTab === index ? 'opacity-100 active' : 'opacity-0'}"
          style="left: {index * 100}%;"> <!-- Position content based on active tab -->
          <div style="left: {index * 100}%" class="fixed top-0 w-full h-8 bg-gradient-to-b to-transparent pointer-events-none z-[100] from-white dark:from-zinc-800 dark:to-transparent"></div>
             <Content {...props} /> <!-- Render the content of the active tab -->
          </div>
        {/each}
      </div>
    </MotionDiv>
  </div>
</div>
