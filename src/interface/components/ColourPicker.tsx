import ColorPicker from "react-best-gradient-color-picker"; // Importing the ColorPicker component from the react-best-gradient-color-picker library
import { useEffect, useRef, useState } from "react"; // Importing React hooks for managing state and side effects
import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"; // Importing settings state for managing selected color from a global state

// Default color presets for the color picker
const defaultPresets = [
  "linear-gradient(30deg, rgba(229,209,218,1) 0%, RGBA(235,169,202,1) 46%, rgba(214,155,162,1) 100%)",
  "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
  "linear-gradient(40deg, rgba(0, 141, 201, 0.76) 0%, rgba(8, 5, 170, 0.66) 100%)",
  "linear-gradient(40deg, rgba(0, 201, 20, 0.76) 0%, rgba(4, 160, 105, 0.66) 100%)",
  "linear-gradient(40deg, rgba(199, 20, 55, 0.76) 0%, rgba(95, 11, 160, 0.66) 100%)",
  "linear-gradient(40deg, rgba(24, 20, 199, 0.76) 0%, rgba(23, 173, 65, 0.66) 100%)",
  "radial-gradient(circle, rgba(20, 199, 178, 0.76) 32%, rgba(3, 120, 57, 0.66) 100%)",
  "radial-gradient(circle, rgba(13, 15, 145, 0.76) 12%, rgba(103, 3, 120, 0.66) 100%)",
  "linear-gradient(20deg, rgb(230, 21, 21) 0%, rgb(230, 109, 21) 12%, rgb(230, 34, 21) 26%, rgb(230, 21, 21) 39%, rgb(230, 84, 21) 48%, rgb(230, 34, 21) 58%, rgb(230, 96, 21) 69%, rgb(230, 34, 21) 80%, rgb(230, 71, 21) 89%, rgb(230, 21, 21) 100%)",
  "rgba(114, 1, 170, 0.89)",
  "rgba(93, 135, 63, 0.89)",
  "rgba(4, 4, 138, 0.77)",
  "rgba(21, 20, 20, 0.89)",
  "linear-gradient(340deg, rgb(205, 74, 82) 18%, rgba(132, 8, 8, 0.89) 46%, rgb(204, 78, 85) 72%)",
  "radial-gradient(circle, rgb(74, 205, 158) 0%, rgba(8, 72, 132, 0.89) 99%)",
  "rgba(17, 94, 89, 1)",
  "rgba(30, 64, 175, 0.89)",
  "rgba(134, 25, 143, 1)",
  "rgba(14, 165, 233, 0.9)",
];

interface PickerProps {
  customOnChange?: (color: string) => void; // Callback function for when the color changes
  customState?: string; // Custom initial color state passed from the parent component
  savePresets?: boolean; // Boolean to decide whether to save presets in localStorage
}

// Picker component that renders the ColorPicker component with the necessary props
export default function Picker({
  customOnChange,
  customState,
  savePresets = true,
}: PickerProps) {
  const [customThemeColor, setCustomThemeColor] = useState<string | null>(); // State for holding the selected custom color
  const [presets, setPresets] = useState<string[]>(); // State for holding the color presets

  // Ref for holding the latest values of props and state to prevent stale closures
  const latestValuesRef = useRef({
    customThemeColor,
    customOnChange,
    savePresets,
    presets,
  });

  // Side effect for setting initial custom theme color and loading presets
  useEffect(() => {
    if (customState !== undefined && customState !== null) {
      setCustomThemeColor(customState); // Use custom state if provided
    } else {
      setCustomThemeColor(settingsState.selectedColor ?? null); // Otherwise, use global settings
    }

    // Load presets from localStorage or use the default presets
    if (presets === undefined) {
      const savedPresets = localStorage.getItem("colorPickerPresets");
      setPresets(savedPresets ? JSON.parse(savedPresets) : defaultPresets);
    }
  }, []);

  // Update latest values in the ref whenever relevant props or state change
  useEffect(() => {
    latestValuesRef.current = {
      customThemeColor,
      customOnChange,
      savePresets,
      presets,
    };
  }, [customThemeColor, customOnChange, savePresets, presets]);

  // Side effect to save the presets to localStorage when the component unmounts or state changes
  useEffect(() => {
    return () => {
      const { customThemeColor, customOnChange, savePresets, presets } =
        latestValuesRef.current;
      if (!(customThemeColor && !customOnChange && savePresets && presets))
        return;

      // Only proceed if presets are different (avoid unnecessary updates)
      const existingIndex = presets.indexOf(customThemeColor);
      let updatedPresets;

      if (existingIndex === 0) {
        // No need to update if the selected color is already the first element
        return;
      } else if (existingIndex > -1) {
        updatedPresets = [
          customThemeColor,
          ...presets.slice(0, existingIndex),
          ...presets.slice(existingIndex + 1),
        ];
      } else {
        updatedPresets = [customThemeColor, ...presets].slice(0, 18);
      }

      // Save the updated presets to localStorage
      localStorage.setItem(
        "colorPickerPresets",
        JSON.stringify(updatedPresets),
      );
    };
  }, []);

  // Side effect for updating the global settings state when the color changes
  useEffect(() => {
    if (customThemeColor && !customOnChange) {
      settingsState.selectedColor = customThemeColor; // Update global selected color
    }
  }, [customThemeColor, customOnChange]);

  // Render the ColorPicker component
  return (
    <ColorPicker
      disableDarkMode={true} // Disable dark mode for the color picker
      presets={presets} // Pass the presets for the color picker
      hideInputs={customOnChange ? false : true} // Hide inputs if no customOnChange callback is provided
      value={customThemeColor ?? ""} // Set the current value of the picker
      onChange={(color: string) => {
        // Handle color change
        if (customOnChange) {
          customOnChange(color); // Call the customOnChange if provided
          setCustomThemeColor(color); // Update the custom theme color state
        } else {
          setCustomThemeColor(color); // Otherwise, just update the custom theme color state
        }
      }}
    />
  );
}
