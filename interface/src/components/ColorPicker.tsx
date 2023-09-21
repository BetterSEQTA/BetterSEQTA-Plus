// @ts-expect-error There aren't any types for the below library
import ColorPicker from 'react-best-gradient-color-picker';
import { useState, useRef, useEffect } from 'react';
import type { ColorPickerProps } from '../types/ColorPickerProps';

const Picker = ({ color, onChange }: ColorPickerProps) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  return (
    <div className="">
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{ background: color }}
        className="w-16 h-8 rounded-md"
      ></button>
      {showPicker && (
        <div ref={ref} className="fixed top-0 left-0 z-50 p-4 bg-white border rounded-lg shadow-lg border-zinc-00">
          <ColorPicker value={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default Picker;
