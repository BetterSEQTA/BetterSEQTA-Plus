import { useState } from "react";
import { motion } from "framer-motion";
import "./Switch.css";

interface SwitchProps {
  onChange: (isOn: boolean) => void;
}

export default function Switch(props: SwitchProps) {
  const [isOn, setIsOn] = useState(false);

  const toggleSwitch = () => {
    const newIsOn = !isOn;
    setIsOn(newIsOn);
    props.onChange(newIsOn);
  };

  return (
    <div
      className="flex w-14 p-1 cursor-pointer rounded-full dark:bg-[#38373D] bg-[#DDDDDD] switch"
      data-isOn={isOn}
      onClick={toggleSwitch}
    >
      <motion.div
        className="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md"
        layout
        transition={spring}
      />
    </div>
  );
}

const spring = {
  type: "spring",
  stiffness: 700,
  damping: 30
};