// This goes in your migration.html's script

// Interface defining the structure of the background data
interface Data {
  id: string; // Unique identifier for the background
  blob: Blob; // The actual background file as a Blob
  type: "image" | "video"; // Type of media (image or video)
}

// Opens a connection to the IndexedDB and returns a Promise that resolves with the database object
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MyDatabase", 1); // Open database "MyDatabase" with version 1
    request.onerror = () => reject(request.error); // Reject promise on error
    request.onsuccess = () => resolve(request.result); // Resolve promise on success
  });
};

// Converts a Blob to a Base64 encoded string (without the data URL prefix)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); // FileReader to read the Blob
    reader.onloadend = () => {
      const base64 = reader.result as string; // Get the Base64 string
      resolve(base64.split(",")[1]); // Remove the "data:image/..." prefix and resolve with Base64 string
    };
    reader.onerror = () => reject(reader.error); // Reject promise on error
    reader.readAsDataURL(blob); // Start reading the Blob as a data URL
  });
};

// Fetches all background data from IndexedDB
const getAllBackgrounds = async (): Promise<Data[]> => {
  const db = await openDB(); // Open the database
  const tx = db.transaction("backgrounds", "readonly"); // Create a readonly transaction
  const store = tx.objectStore("backgrounds"); // Access the "backgrounds" object store
  const request = store.getAll(); // Request all items from the store

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result); // Resolve promise with result when success
    request.onerror = () => reject(request.error); // Reject promise on error
  });
};

// Retrieves the currently selected background ID from localStorage
const getSelectedBackground = (): string | null => {
  return localStorage.getItem("selectedBackground"); // Retrieve selected background from localStorage
};

// Starts the migration process, extracting and sending background data
const startMigration = async () => {
  try {
    console.info("Starting background extraction..."); // Log migration start
    let backgrounds: Data[]; // Array to hold background data
    try {
      backgrounds = await getAllBackgrounds(); // Fetch all backgrounds from IndexedDB
      if (!backgrounds || backgrounds.length === 0) { // Check if no backgrounds exist
        console.info("No backgrounds to migrate"); // Log if no backgrounds to migrate
        window.parent.postMessage({ type: "MIGRATION_COMPLETE" }, "*"); // Send migration complete message
        return;
      }
    } catch (error: any) {
      if (
        error.name === "NotFoundError" &&
        error.message.includes("object stores was not found")
      ) {
        console.info("No backgrounds to migrate: object store not found"); // Log if object store not found
        window.parent.postMessage({ type: "MIGRATION_COMPLETE" }, "*"); // Send migration complete message
        return;
      }
      console.error("Error fetching backgrounds:", error); // Log error fetching backgrounds
      throw new Error("Failed to fetch backgrounds"); // Throw error if fetching fails
    }
    const selectedBackground = getSelectedBackground(); // Get selected background from localStorage
    console.info(`Found ${backgrounds.length} backgrounds`); // Log number of backgrounds found

    window.parent.postMessage({ type: "GET_LAST_PROCESSED_ID" }, "*"); // Request last processed background ID

    // Wait for the message with the last processed ID
    const lastProcessedId = await new Promise<string | null>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === "LAST_PROCESSED_ID") { // Check for the correct message type
          window.removeEventListener("message", handler); // Remove listener after processing
          resolve(event.data.id); // Resolve with the ID
        }
      };
      window.addEventListener("message", handler); // Add event listener for message
    });

    // Determine remaining backgrounds to process based on last processed ID
    const remainingBackgrounds = lastProcessedId
      ? backgrounds.slice(
          backgrounds.findIndex((b) => b.id === lastProcessedId) + 1, // Skip already processed backgrounds
        )
      : backgrounds; // If no last processed ID, process all backgrounds

    console.info(
      `Processing ${remainingBackgrounds.length} remaining backgrounds`, // Log number of remaining backgrounds
    );

    // Process each remaining background
    for (let i = 0; i < remainingBackgrounds.length; i++) {
      const background = remainingBackgrounds[i]; // Get the current background
      const base64Data = await blobToBase64(background.blob); // Convert background blob to Base64 data

      // Send background data to the parent window
      window.parent.postMessage(
        {
          type: "BACKGROUND_DATA",
          payload: {
            id: background.id, // Background ID
            data: base64Data, // Base64 encoded background data
            mediaType: background.type, // Media type (image or video)
            total: backgrounds.length, // Total number of backgrounds
            processed: i + 1, // Number of backgrounds processed so far
            isSelected: background.id === selectedBackground, // Whether this background is the selected one
          },
        },
        "*",
      );

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms before processing next background
    }

    window.parent.postMessage({ type: "MIGRATION_COMPLETE" }, "*"); // Send migration complete message
  } catch (error: any) {
    console.error("Extraction failed:", error); // Log error during extraction
    window.parent.postMessage(
      {
        type: "MIGRATION_ERROR", // Send migration error message
        error: error.message || "Unknown error", // Error message or unknown if none
      },
      "*",
    );
  }
};

// Event listener for messages from the parent window
window.addEventListener("message", (event) => {
  switch (event.data.type) {
    case "PING": // Respond to PING message with PONG
      window.parent.postMessage({ type: "PONG" }, "*");
      break;

    case "START_MIGRATION": // Start migration process on START_MIGRATION message
      startMigration();
      break;
  }
});
