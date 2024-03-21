import React, { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import type { TabbedContainerProps } from '../types/TabbedContainerProps';

const TabbedContainer: React.FC<TabbedContainerProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const [tabWidth, setTabWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(position);


    // Function to handle message
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "popupClosed") {  
        setActiveTab(0);
      }
    };
  
    useEffect(() => {
      // Add event listener for 'message' event
      window.addEventListener("message", handleMessage);
  
      // Cleanup
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, []);


  useEffect(() => {
    const newPosition = -activeTab * 100;
    setPosition(newPosition);
    positionRef.current = newPosition;
  }, [activeTab]);

  const containerRef = useRef(null);

  const springTransition = { type: 'spring', stiffness: 250, damping: 25 };

  useEffect(() => {
    if (containerRef.current) {
      // @ts-expect-error for some reason its giving an error in TS but it works...
      const width = containerRef.current.getBoundingClientRect().width;
      setTabWidth(width / tabs.length);
    }
  }, [tabs.length]);

  const calcXPos = (index: number | null) => {
    if (index !== null) {
      return tabWidth * index;
    }
    return tabWidth * activeTab;
  };

  return (
    <>
    <div ref={containerRef} className="top-0 z-10 text-[0.875rem] pb-0.5 mx-4">
      <div className="relative flex">          
        <motion.div
          className="absolute top-0 left-0 z-0 h-full bg-[#DDDDDD] dark:bg-[#38373D] rounded-full opacity-40"
          style={{ width: `${tabWidth}px` }}
          initial={false}
          animate={{ x: calcXPos(hoveredTab) }}
          transition={springTransition}
        />
        {tabs.map((tab, index) => (
          <button
            key={index}
            className="relative z-10 flex-1 px-4 py-2"
            onClick={() => setActiveTab(index)}
            onMouseEnter={() => setHoveredTab(index)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            {tab.title}
          </button>
        ))}
      </div>
    </div>
    <div className="h-full px-4 overflow-y-scroll overflow-x-clip">
        <motion.div
          initial={false}
          animate={{ x: `${position}%` }}
          transition={springTransition}
        >
          <div className="flex">
            {tabs.map((tab, index) => (
            <div className={`absolute w-full transition-opacity duration-300 pb-4 ${activeTab === index ? 'opacity-100' : 'opacity-0'}`}
              style={{left: `${index * 100}%`}}>
                {tab.content}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default memo(TabbedContainer);
