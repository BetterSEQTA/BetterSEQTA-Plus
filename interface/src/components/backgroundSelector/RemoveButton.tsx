import React from 'react';

interface RemoveButtonProps {
  selectedBackground: string | null;
  selectNoBackground: () => void;
}

export const RemoveButton: React.FC<RemoveButtonProps> = ({ selectedBackground, selectNoBackground }) => {
  return (
    <button disabled={selectedBackground == null} className={`w-full px-4 py-2 mb-4 dark:text-white transition ${selectedBackground == null ? 'dark:bg-zinc-900 bg-zinc-100' : 'bg-blue-500 text-white'} rounded`} onClick={selectNoBackground}>
      {selectedBackground == null ? 'No Background' : 'Remove Background'}
    </button>
  );
};
