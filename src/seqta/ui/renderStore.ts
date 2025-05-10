import renderSvelte from "@/interface/main";  // Import the function to render Svelte components
import Store from "@/interface/pages/store.svelte";  // Import the Svelte store component

import { unmount } from "svelte";  // Import the unmount function to remove Svelte components

let remove: () => void;  // Declare a function variable to remove the store page

// Function to open the store page by rendering it
export function OpenStorePage() {
  remove = renderStore();  // Call renderStore and store the removal function
}

// Function to render the store page within a shadow DOM
export function renderStore() {
  const container = document.querySelector("#container");  // Get the container element
  if (!container) {
    throw new Error("Container not found");  // If the container is not found, throw an error
  }

  const child = document.createElement("div");  // Create a new <div> element
  child.id = "store";  // Set the ID of the new element
  container!.appendChild(child);  // Append the new <div> to the container

  const shadow = child.attachShadow({ mode: "open" });  // Create a shadow DOM for the new element
  const app = renderSvelte(Store, shadow);  // Render the Store component inside the shadow DOM

  return () => unmount(app);  // Return a function that will unmount the app when called
}

// Function to close the store page
export function closeStore() {
  document.getElementById("store")!.classList.add("hide");  // Add a "hide" class to the store element

  setTimeout(() => {
    remove();  // Call the remove function to unmount the app
    document.getElementById("store")!.remove();  // Remove the store element from the DOM
  }, 500);  // Wait 500ms before executing the removal actions
}
