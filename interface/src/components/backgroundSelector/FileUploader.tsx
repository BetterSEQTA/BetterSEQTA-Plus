import React, { ChangeEvent } from 'react';

interface FileUploaderProps {
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ handleFileChange }) => {
  return (
    <div className="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500">
        {/*  Plus icon */}
        
      </div>
      <input type="file" accept='image/*, video/*' onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
    </div>
  );
};