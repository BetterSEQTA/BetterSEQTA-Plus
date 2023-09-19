import React, { useState } from 'react';
import "./Slider.css";

interface Slider {
  onValueChange: (value: number) => void;
}

const Slider: React.FC<Slider> = ({ onValueChange }) => {
  const [sliderValue, setSliderValue] = useState(0);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
  };

  const handleMouseUp = () => {
    onValueChange(sliderValue);
  };

  return (
    <div className="relative">
      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onChange={handleInputChange}
        onMouseUp={handleMouseUp}
        className="absolute w-full h-1 rounded-full cursor-pointer range-slider focus:outline-none"
      />
    </div>
  );
};

export default Slider;