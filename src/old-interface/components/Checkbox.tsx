import React from 'react';

type CheckboxProps = {
  value: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const Checkbox: React.FC<CheckboxProps> = ({ value, onChange }) => {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="absolute opacity-0"
          checked={value}
          onChange={onChange}
        />
        <div
          className={`w-5 h-5 rounded-md bg-gradient-to-tr transition-colors duration-200 ${
            value
              ? 'from-blue-500 to-blue-600'
              : 'from-gray-300 to-gray-400 dark:from-zinc-700 dark:to-zinc-700/50'
          }`}
        />
        {value && (
          <svg
            className="absolute inset-0 m-auto text-white"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </label>
  );
};

export default Checkbox;