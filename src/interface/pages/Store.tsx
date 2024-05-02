import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import Header from '../components/store/header';
import { motion } from 'framer-motion';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/autoplay';

const Store = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const swiperCover = useRef<any | null>(null);
  const [filteredThemes, setFilteredThemes] = useState<typeof gridThemes>([]);


  const coverThemes = [
    { coverImage: 'https://source.unsplash.com/random', name: 'Ocean View', description: 'Feel the ocean breeze with this theme.' },
    { coverImage: 'https://source.unsplash.com/random?2', name: 'Mountain Majesty', description: 'Elevate your desktop to new heights.' },
    { coverImage: 'https://source.unsplash.com/random?3', name: 'Urban Explorer', description: 'Bring the city life to your screen.' }
  ];

  // Additional mocked themes for the grid with varied names
  const gridThemes = [
    { image: 'https://source.unsplash.com/random', name: 'Serene Landscapes', description: 'Calm landscapes to soothe your soul.' },
    { image: 'https://source.unsplash.com/random?4', name: 'Cosmic Energy', description: 'Explore the outer space.' },
    { image: 'https://source.unsplash.com/random?5', name: 'Abstract Art', description: 'Artistic and abstract designs.' },
    { image: 'https://source.unsplash.com/random?6', name: 'Nature’s Wonders', description: 'The beauty of nature captured in one theme.' },
    { image: 'https://source.unsplash.com/random?7', name: 'Techie Vibes', description: 'For the tech enthusiasts.' },
    { image: 'https://source.unsplash.com/random?8', name: 'Cafe Culture', description: 'Experience the cafe culture on your screen.' },
  ];

  useEffect(() => {
    setFilteredThemes(gridThemes.filter(theme =>
      theme.name.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm]);

  return (
    <div className="w-screen h-screen overflow-y-scroll bg-zinc-100 dark:bg-zinc-900">
      
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <div className="px-24 py-12">
        <div className={`relative w-full rounded-xl overflow-clip transition-opacity ${searchTerm == '' ? 'opacity-100' : 'opacity-0'}`}>
          <motion.div className='overflow-clip' animate={{
            height: searchTerm == '' ? 'auto' : '0px'
          }} transition={{
            type: 'spring',
            bounce: 0,
            duration: 1,
            stiffness: 200,
            damping: 30
          }}>
            <Swiper
              ref={swiperCover}
              spaceBetween={20}
              slidesPerView={1}
              className='w-full aspect-[8/3]'
              modules={[Autoplay]}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
              }}
            >
              { coverThemes.map((theme, index) => (
                  <SwiperSlide className='rounded-xl overflow-clip' key={index}>
                    <img
                      src={theme.coverImage}
                      alt="Theme Preview"
                      className="object-cover w-full h-full"
                    />
                  </SwiperSlide>
                )) }
            </Swiper>
          </motion.div>

          {/* pagination */}
          <div className='absolute z-10 flex gap-2 bottom-2 right-2'>

            <button onClick={ () => {swiperCover.current?.swiper.slidePrev() }} className='flex items-center justify-center w-8 h-8 text-white bg-black bg-opacity-50 rounded-full dark:bg-zinc-800 dark:bg-opacity-50'>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
              </svg>
            </button>

            <button onClick={ () => {swiperCover.current?.swiper.slideNext() }} className='flex items-center justify-center w-8 h-8 text-white bg-black bg-opacity-50 rounded-full dark:bg-zinc-800 dark:bg-opacity-50'>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
          {filteredThemes.map((theme, index) => (
            <div key={index} className='w-full cursor-pointer'>
              <div className="bg-gray-50 w-full transition-all duration-300 relative group/card flex flex-col dark:hover:shadow-2xl dark:hover:shadow-white/[0.1] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl p-6 border">
                <div>

                  <div className="mb-1 text-xl font-bold text-neutral-600 dark:text-white">
                    {theme.name}
                  </div>
                  <p className="max-w-sm mb-4 text-sm text-neutral-500 dark:text-neutral-300">
                    {theme.description}
                  </p>

                </div>
                <div
                    className='w-full'>
                  <img src={theme.image} alt="Theme Preview" className="object-cover w-full h-48 rounded-md" />
                </div>
                <div>
                  <button className="px-4 py-2 mt-4 transition rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2">
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Store;