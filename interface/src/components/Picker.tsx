import ColorPicker from 'react-best-gradient-color-picker';
import { useSettingsContext } from '../SettingsContext';
import { motion } from "framer-motion";

import "./Picker.css";
import { useEffect, useState } from 'react';

export default function Picker() {
  const { settingsState, setSettingsState, showPicker, setShowPicker } = useSettingsContext();

  const defaultPresets = [
    'linear-gradient(30deg, rgba(229,209,218,1) 0%, RGBA(235,169,202,1) 46%, rgba(214,155,162,1) 100%)',
    'linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)',
    'linear-gradient(40deg, rgba(0, 141, 201, 0.76) 0%, rgba(8, 5, 170, 0.66) 100%)',
    'rgba(4, 4, 138, 0.77)',
    
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <ColorPicker presets={presets} hideInputs={true} value={settingsState.customThemeColor} onChange={colorChange} />
        </motion.div>
      </div>
    </motion.div>
  );
}