import { motion } from "framer-motion";
import "./Switch.css";
import type { SwitchProps } from "../types/SwitchProps";
import { memo } from "react";

function Switch(props: SwitchProps) {
  const toggleSwitch = () => {
    const newIsOn = !props.state;
    props.onChange(newIsOn);
  };

  return (
    <div
      className="flex w-14 p-1 cursor-pointer rounded-full dark:bg-[#38373D] bg-[#DDDDDD] switch"
      data-ison={props.state}
      onClick={toggleSwitch}
    >
      <motion.div
      
        className="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md"
        initial={{ x: props.state ? 0 : 0 }}
        animate={{ x: props.state ? 24 : 0 }}
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

export default memo(Switch);