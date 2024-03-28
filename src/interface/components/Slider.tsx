import { memo } from "react";
import "./Slider.css";

interface SliderProps {
  state: number;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ state, onChange }) => {

  return (
    <div className="relative w-full max-w-lg py-8 mx-auto">
      <input
        type="range"
        min="0"
        max="100"
        value={state}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer slider dark:bg-[#38373D] bg-[#DDDDDD]"
      />
    </div>
  );
};

export default memo(Slider);