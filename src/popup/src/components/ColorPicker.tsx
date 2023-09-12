// TODO: Create types for ColorPicker
// @ts-expect-error No typescript declarations available
import ColorPicker from 'react-best-gradient-color-picker';
import { useState, useRef, useEffect } from 'react';

const Picker = (): JSX.Element => {
  const [color, setColor] = useState<string>('rgba(255,20,255,1)');
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pickerRef]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          'background': color
        }}
        className="w-16 h-8 rounded-md"
      ></button>
      <div className="absolute top-0 right-0 z-10 p-2 bg-white border rounded-lg shadow-2xl border-zinc-200">
        { showPicker &&
          <ColorPicker value={color} onChange={setColor} />
        }
      </div>
    </div>
  );
};

export default Picker;