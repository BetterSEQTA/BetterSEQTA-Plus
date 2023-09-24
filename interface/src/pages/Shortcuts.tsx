import { useState } from "react";
import Switch from "../components/Switch";
import { useSettingsContext } from "../SettingsContext";

interface Shortcut {
  name: string;
  url: string;
  enabled?: boolean;
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
    const pattern = new RegExp("^(https?:\\/\\/)?[\\w.-]+[\\w.-]+$", "i");
    return pattern.test(url);
  };

  const addNewCustomShortcut = (): void => {
    if (isValidTitle(newTitle) && isValidURL(newURL)) {
      const newShortcut: Shortcut = { name: newTitle.trim(), url: newURL.trim() };
      const updatedCustomShortcuts = [...settingsState.customshortcuts, newShortcut];
      setSettingsState({ ...settingsState, customshortcuts: updatedCustomShortcuts });
      setNewTitle("");
      setNewURL("");
    } else {
      // Replace with a more user-friendly way to display errors
      console.error("Please enter a valid title and URL.");
    }
  };

  const deleteCustomShortcut = (index: number): void => {
    const updatedCustomShortcuts = settingsState.customshortcuts.filter((_, i) => i !== index);
    setSettingsState({ ...settingsState, customshortcuts: updatedCustomShortcuts });
  };

  return (
    <div className="flex flex-col divide-y divide-zinc-100">
      {/* Form Section */}
      <div className="flex items-center justify-between px-4 py-3">
        <input
          type="text"
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="URL"
          value={newURL}
          onChange={(e) => setNewURL(e.target.value)}
        />
        <button onClick={addNewCustomShortcut}>Add</button>
      </div>
            {/* Shortcuts Section */}
            {settingsState.shortcuts ? (
        settingsState.shortcuts.map((shortcut) => (
          <div className="flex items-center justify-between px-4 py-3" key={shortcut.name}>
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
          <div className="flex items-center justify-between px-4 py-3" key={shortcut.name}>
            {shortcut.name}
            <button onClick={() => deleteCustomShortcut(index)}>Delete</button>
          </div>
        ))
      ) : (
        <p>Loading custom shortcuts...</p>
      )}
    </div>
  );
}
