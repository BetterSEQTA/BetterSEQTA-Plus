// @ts-expect-error There aren't any types for the below library
import ColorPicker from 'react-best-gradient-color-picker';
import { useSettingsContext } from '../SettingsContext';
import { motion } from "framer-motion";

import "./Picker.css";
import { useEffect } from 'react';

export default function Picker() {
  const { settingsState, setSettingsState, showPicker, setShowPicker } = useSettingsContext();

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
          <ColorPicker hideInputs={true} value={settingsState.customThemeColor} onChange={colorChange} />
        </motion.div>
      </div>
    </motion.div>
  );
}