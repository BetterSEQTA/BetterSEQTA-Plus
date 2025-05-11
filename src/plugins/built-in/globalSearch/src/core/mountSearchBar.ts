// Import the function for rendering a Svelte component and necessary modules
import renderSvelte from "@/interface/main";
import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte"; // Import unmount function for cleaning up Svelte components
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager"; // Import the worker manager for vector indexing

// Function to mount the search bar to the page
export function mountSearchBar(
  titleElement: Element, // The DOM element where the search button will be added
  api: any, // API containing settings such as transparency and sorting preferences
  appRef: { current: any }, // Reference to the Svelte app instance
) {
  // Check if the search button is already added to prevent duplicates
  if (titleElement.querySelector(".search-trigger")) {
    return;
  }

  // Create the search button element
  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger"; // Assign a class for styling
  searchButton.innerHTML = /* html */ `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <p>Quick search...</p>
    <span style="margin-left: auto; display: flex; align-items: center; color: #777; font-size: 12px;">⌘K</span>
  `;

  // Append the search button to the title element
  titleElement.appendChild(searchButton);

  // Create a root element for the search bar and attach a shadow DOM for styling encapsulation
  const searchRoot = document.createElement("div");
  document.body.appendChild(searchRoot);
  const searchRootShadow = searchRoot.attachShadow({ mode: "open" });

  // Event listener to open the command palette when the search button is clicked
  searchButton.addEventListener("click", () => {
    // @ts-ignore - Intentionally adding to window
    window.setCommandPalleteOpen(true);
  });

  // Try rendering the Svelte search bar component
  try {
    appRef.current = renderSvelte(SearchBar, searchRootShadow, {
      transparencyEffects: api.settings.transparencyEffects ? true : false, // Pass transparency setting
      showRecentFirst: api.settings.showRecentFirst, // Pass sorting preference
    });
  } catch (error) {
    console.error("Error rendering Svelte component:", error); // Log any errors during rendering
  }
}

// Function to clean up and remove the search bar
export function cleanupSearchBar(appRef: { current: any }) {
  // Remove the search button and root element
  const searchButton = document.querySelector(".search-trigger");
  const searchRoot = document.querySelector(".global-search-root");
  if (searchButton) searchButton.remove();
  if (searchRoot) searchRoot.remove();

  // Clean up the vector worker and unmount the Svelte app
  VectorWorkerManager.getInstance().terminate();
  unmount(appRef.current); // Unmount the Svelte component
}
