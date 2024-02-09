import { useState } from "react";
import Switch from "../components/Switch";
import { useSettingsContext } from "../SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { CustomShortcut } from "../types/AppProps";

function formatUrl (inputUrl: string) {
  // Regular expression to check if the URL starts with http://, https://, or ftp://
  const protocolRegex = /^(http:\/\/|https:\/\/|ftp:\/\/)/;

  // Check if the URL starts with one of the protocols
  if (protocolRegex.test(inputUrl)) {
      return inputUrl;  // The URL is fine as is
  } else {
      return `https://${inputUrl}`;  // Prepend https:// to the URL
  }
}

export default function Shortcuts() {
  const { settingsState, setSettingsState } = useSettingsContext();

  const switchChange = (shortcutName: string, isOn: boolean): void => {
    const updatedShortcuts = settingsState.shortcuts.map((shortcut) => {
      if (shortcut.name === shortcutName) {
        return { ...shortcut, enabled: isOn };
      }
      return shortcut;
    });

    setSettingsState({ ...settingsState, shortcuts: updatedShortcuts });
  };

  const [newTitle, setNewTitle] = useState<string>("");
  const [newURL, setNewURL] = useState<string>("");

  const isValidTitle = (title: string): boolean => title.trim() !== "";
  
  const isValidURL = (url: string): boolean => {
    const pattern = new RegExp("^(https?:\\/\\/)?[\\w.-]+[\\w.-]+(/[\\w.-]*)*$", "i");
    return pattern.test(url);
  };

  const addNewCustomShortcut = (): void => {
    if (isValidTitle(newTitle) && isValidURL(newURL)) {
      const newShortcut: CustomShortcut = { name: newTitle.trim(), url: formatUrl(newURL).trim(), icon: newTitle[0] };
      const updatedCustomShortcuts = [...settingsState.customshortcuts, newShortcut];
      setSettingsState({ ...settingsState, customshortcuts: updatedCustomShortcuts });
      setNewTitle("");
      setNewURL("");

      setFormVisible(false);
    } else {
      // Replace with a more user-friendly way to display errors
      console.error("Please enter a valid title and URL.");
    }
  };

  const deleteCustomShortcut = (index: number): void => {
    const updatedCustomShortcuts = settingsState.customshortcuts.filter((_, i) => i !== index);
    setSettingsState({ ...settingsState, customshortcuts: updatedCustomShortcuts });
  };

  const [isFormVisible, setFormVisible] = useState(false);

  const toggleForm = () => {
    setFormVisible(!isFormVisible);
  };

  return (
    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-700">

      <AnimatePresence>
        {isFormVisible ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="flex flex-col items-center mb-4">
              <motion.input
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full p-2 rounded-md bg-zinc-100 dark:bg-zinc-700 focus:outline-none"
                type="text"
                placeholder="Shortcut Name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <motion.input
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full p-2 my-2 rounded-md bg-zinc-100 dark:bg-zinc-700 focus:outline-none"
                type="text"
                placeholder="URL eg. https://google.com"
                value={newURL}
                onChange={(e) => setNewURL(e.target.value)}
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full px-4 py-2 text-white bg-blue-500 rounded-md"
                onClick={ addNewCustomShortcut }
              >
                Add
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ backgroundColor: "rgba(29, 161, 242, 1)", height: "auto" }}
            animate={{ backgroundColor: "rgba(29, 161, 242, 1)", height: "auto" }}
            exit={{ backgroundColor: "rgba(29, 161, 242, 1)", height: "auto" }}
            transition={{ type: 'tween', ease: "easeOut" }}
            className="px-4 py-2 mb-4 text-white bg-blue-500 rounded"
            onClick={toggleForm}
          >
            Add Custom Shortcut
          </motion.button>
        )}
      </AnimatePresence>

      {/* Shortcuts Section */}
      {settingsState.shortcuts ? (
        settingsState.shortcuts.map((shortcut, index) => shortcut.name && (
          <div className="flex items-center justify-between px-4 py-3" key={index}>
            {shortcut.name}
            <Switch state={shortcut.enabled} onChange={(isOn) => switchChange(shortcut.name, isOn)} />
          </div>
        ))
      ) : (
        <p>Loading shortcuts...</p>
      )}
      
      {/* Custom Shortcuts Section */}
      {settingsState.customshortcuts ? (
        settingsState.customshortcuts.map((shortcut, index) => (
          <div className="flex items-center justify-between px-4 py-3" key={index}>
            {shortcut.name}
            <button onClick={() => deleteCustomShortcut(index)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))
      ) : (
        <p>Loading custom shortcuts...</p>
      )}
    </div>
  );
}
