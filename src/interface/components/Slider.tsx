import { memo } from "react";
import { useSettingsContext } from "../SettingsContext";
import "./Slider.css";

interface SliderProps {
  state: number;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ state, onChange }) => {
  const { settingsState } = useSettingsContext();

  return (
    <div className="relative w-full max-w-lg py-8 mx-auto">
      <input
        type="range"
        min="0"
        max="100"
        value={state}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer slider"
        style={{ background: `${settingsState.customThemeColor}` }}
      />
    </div>
  );
};

export default memo(Slider);