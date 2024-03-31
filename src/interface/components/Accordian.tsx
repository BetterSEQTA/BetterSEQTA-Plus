import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Accordion = ({ children, title, defaultOpened }: { children: React.ReactNode, title: string, defaultOpened?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<boolean>(false);

  useEffect(() => {
    const show = async () => {
      if (defaultOpened) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setShown(true);
      }
    };

    show();
  }, [])

  return (
    <div>
      <button onClick={() => setShown(!shown)} className='flex items-center justify-between text-[15px] w-full'>
        { title }
        <ChevronDownIcon className={`transition-transform duration-300 ${shown ? 'rotate-180' : ''}`} height='24' aria-hidden />
      </button>
      <div ref={ref} className='overflow-y-hidden transition-all duration-300 ease-in-out' style={{ height: `${shown ? ref.current?.scrollHeight : '0'}px` }}>
        {children}
      </div>
    </div>
  );
};

export default Accordion;
