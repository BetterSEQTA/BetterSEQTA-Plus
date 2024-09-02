import "./Switch.css";

export interface SwitchProps {
    onChange: (isOn: boolean) => void;
    state: boolean;
}