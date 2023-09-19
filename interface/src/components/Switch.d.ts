import "./Switch.css";
interface SwitchProps {
    onChange: (isOn: boolean) => void;
    state: boolean;
}
export default function Switch(props: SwitchProps): import("react/jsx-runtime").JSX.Element;
export {};
