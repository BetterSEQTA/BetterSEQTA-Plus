import ColorPicker from 'react-best-gradient-color-picker';
import { useSettingsContext } from '../SettingsContext';
import { motion } from "framer-motion";

import "./Picker.css";
import { memo, useEffect, useState } from 'react';

function Picker() {
  const { settingsState, setSettingsState, showPicker, setShowPicker } = useSettingsContext();

  const defaultPresets = [
    'linear-gradient(30deg, rgba(229,209,218,1) 0%, RGBA(235,169,202,1) 46%, rgba(214,155,162,1) 100%)',
    'linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)',
    'linear-gradient(40deg, rgba(0, 141, 201, 0.76) 0%, rgba(8, 5, 170, 0.66) 100%)',
    'linear-gradient(40deg, rgba(0, 201, 20, 0.76) 0%, rgba(4, 160, 105, 0.66) 100%)',
    'linear-gradient(40deg, rgba(199, 20, 55, 0.76) 0%, rgba(95, 11, 160, 0.66) 100%)',
    'linear-gradient(40deg, rgba(24, 20, 199, 0.76) 0%, rgba(23, 173, 65, 0.66) 100%)',
    'radial-gradient(circle, rgba(20, 199, 178, 0.76) 32%, rgba(3, 120, 57, 0.66) 100%)',
    'radial-gradient(circle, rgba(13, 15, 145, 0.76) 12%, rgba(103, 3, 120, 0.66) 100%)',
    'linear-gradient(20deg, rgb(230, 21, 21) 0%, rgb(230, 109, 21) 12%, rgb(230, 34, 21) 26%, rgb(230, 21, 21) 39%, rgb(230, 84, 21) 48%, rgb(230, 34, 21) 58%, rgb(230, 96, 21) 69%, rgb(230, 34, 21) 80%, rgb(230, 71, 21) 89%, rgb(230, 21, 21) 100%)',
    'rgba(114, 1, 170, 0.89)',
    'rgba(93, 135, 63, 0.89)',
    'rgba(4, 4, 138, 0.77)',
    'rgba(21, 20, 20, 0.89)',
    'linear-gradient(340deg, rgb(205, 74, 82) 18%, rgba(132, 8, 8, 0.89) 46%, rgb(204, 78, 85) 72%)',
    'radial-gradient(circle, rgb(74, 205, 158) 0%, rgba(8, 72, 132, 0.89) 99%)',
    'rgba(17, 94, 89, 1)',
    'rgba(30, 64, 175, 0.89)',
    'rgba(134, 25, 143, 1)',
    'rgba(14, 165, 233, 0.9)'
  ];
  const [presets, setPresets] = useState(() => {
    const savedPresets = localStorage.getItem('colorPickerPresets');
    return savedPresets ? JSON.parse(savedPresets) : defaultPresets;
  });

  const handleMessage = (event: MessageEvent) => {
    if (event.data === "popupClosed") {
      setShowPicker(false);
    }
  };

  useEffect(() => {
    // Add event listener for 'message' event
    window.addEventListener("message", handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    // Watch for changes in showPicker and update the presets
    if (!showPicker) {
      // Check if the selected color is already in the presets
      const existingIndex = presets.indexOf(settingsState.customThemeColor);

      let updatedPresets;
      if (existingIndex > -1) {
        // If the color exists, move it to the front
        updatedPresets = [
          settingsState.customThemeColor,
          ...presets.slice(0, existingIndex),
          ...presets.slice(existingIndex + 1)
        ];
      } else {
        // If the color is new, add it to the front and slice the array
        updatedPresets = [settingsState.customThemeColor, ...presets].slice(0, 18);
      }

      setPresets(updatedPresets);
      localStorage.setItem('colorPickerPresets', JSON.stringify(updatedPresets));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker]);

  const colorChange = (color: string) => {
    setSettingsState({
      ...settingsState,
      customThemeColor: color,
    });
  };

  // Define animation variants
  const backgroundVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const scaleVariants = {
    hidden: { scale: 0.3 },
    visible: { scale: 1 },
    exit: { scale: 0.4 } // Adding exit animation
  };

  return (
    // Apply fade-in animation to background
    <motion.div
      initial="hidden"
      animate={showPicker ? "visible" : "exit"}
      exit="exit"
      variants={backgroundVariants}
      transition={{ duration: 0.2 }}
      onClick={() => setShowPicker(false)}
      className={`absolute top-0 left-0 z-50 flex justify-center w-full h-full pt-4 bg-black/20 ${!showPicker ? 'pointer-events-none' : ''}`}
    >
      <div>
        {/* Apply springy scale animation */}
        <motion.div
          initial="hidden"
          animate={showPicker ? "visible" : "exit"}
          exit="exit"
          variants={scaleVariants}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          onClick={(e) => e.stopPropagation()}
          className="h-auto p-4 bg-white border rounded-lg shadow-lg dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
        >
          <ColorPicker disableDarkMode={true} presets={presets} hideInputs={true} value={settingsState.customThemeColor} onChange={colorChange} />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default memo(Picker);
