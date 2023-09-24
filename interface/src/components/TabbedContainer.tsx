import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { TabbedContainerProps } from '../types/TabbedContainerProps';
import { useSettingsContext } from '../SettingsContext';

const TabbedContainer: React.FC<TabbedContainerProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const [tabWidth, setTabWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(position);
  const themeColor = useSettingsContext().settingsState.customThemeColor;

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
    <div ref={containerRef} className="top-0 z-10 text-[0.875rem] mb-2 pb-2 mx-4">
      <div className="relative flex">          
        <motion.div
          className="absolute top-0 left-0 z-0 h-full rounded-full opacity-40"
          style={{ width: `${tabWidth}px`, background: themeColor }}
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
        <div className="absolute flex w-full" style={{ left: `${-position}%` }}>
          {tabs.map((tab, index) => (
            <div
              key={index}
              className={`w-full ${activeTab === index ? '' : 'hidden'}`}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default TabbedContainer;
