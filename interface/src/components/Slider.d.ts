import React from 'react';
import "./Slider.css";
interface Slider {
    onValueChange: (value: number) => void;
}
declare const Slider: React.FC<Slider>;
export default Slider;
