// Declare a reactive state variable to store the selected background.
// The value can either be a string (representing the background) or null if no background is selected.
export let selectedBackground = $state<string | null>(null);
