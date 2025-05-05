import ColorPicker from "react-best-gradient-color-picker";
import { useEffect, useRef, useState } from "react";
import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts";

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
  customOnChange?: (color: string) => void;
  customState?: string;
  savePresets?: boolean;
}

export default function Picker({
  customOnChange,
  customState,
  savePresets = true,
}: PickerProps) {
  const [customThemeColor, setCustomThemeColor] = useState<string | null>();
  const [presets, setPresets] = useState<string[]>();

  const latestValuesRef = useRef({
    customThemeColor,
    customOnChange,
    savePresets,
    presets,
  });

  useEffect(() => {
    if (customState !== undefined && customState !== null) {
      setCustomThemeColor(customState);
    } else {
      setCustomThemeColor(settingsState.selectedColor ?? null);
    }

    if (presets === undefined) {
      const savedPresets = localStorage.getItem("colorPickerPresets");
      setPresets(savedPresets ? JSON.parse(savedPresets) : defaultPresets);
    }
  }, []);

  useEffect(() => {
    latestValuesRef.current = {
      customThemeColor,
      customOnChange,
      savePresets,
      presets,
    };
  }, [customThemeColor, customOnChange, savePresets, presets]);

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

      localStorage.setItem(
        "colorPickerPresets",
        JSON.stringify(updatedPresets),
      );
    };
  }, []);

  useEffect(() => {
    if (customThemeColor && !customOnChange) {
      settingsState.selectedColor = customThemeColor;
    }
  }, [customThemeColor, customOnChange]);

  return (
    <ColorPicker
      disableDarkMode={true}
      presets={presets}
      hideInputs={customOnChange ? false : true}
      value={customThemeColor ?? ""}
      onChange={(color: string) => {
        if (customOnChange) {
          customOnChange(color);
          setCustomThemeColor(color);
        } else {
          setCustomThemeColor(color);
        }
      }}
    />
  );
}
