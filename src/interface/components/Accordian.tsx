import { useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Accordion = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<boolean>(false);

  return (
    <div>
      <button onClick={() => setShown(!shown)} className='flex items-center justify-between text-[15px] w-full'>
        Custom CSS
        <ChevronDownIcon className={`transition-transform duration-300 ${shown ? 'rotate-180' : ''}`} height='24' aria-hidden />
      </button>
      <div ref={ref} className='overflow-y-hidden transition-all' style={{ height: `${shown ? ref.current?.scrollHeight : '0'}px` }}>
        {children}
      </div>
    </div>
  );
};

export default Accordion;
