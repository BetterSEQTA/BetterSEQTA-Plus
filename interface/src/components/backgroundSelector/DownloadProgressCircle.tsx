import React from 'react';

interface DownloadProgressCircleProps {
  progress: number;
}

export const DownloadProgressCircle: React.FC<DownloadProgressCircleProps> = ({ progress }) => {
  const calcCircumference = (radius: number) => 2 * Math.PI * radius;

  return (
    <svg className="absolute z-10 w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
      <circle stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset="0" transform="rotate(-90 18 18)"></circle>
      <circle stroke="#3B82F6" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset={`${calcCircumference(14) * (1 - (progress / 100))}`} transform="rotate(-90 18 18)"></circle>
    </svg>
  );
};
