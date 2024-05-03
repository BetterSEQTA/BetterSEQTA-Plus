import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import Header from '../components/store/header';
import { motion } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/autoplay';

interface Theme {
  name: string;
  description: string;
  coverImage: string;
  marqueeImage: string;
  id: string;
}

interface ThemesResponse {
  themes: Theme[];
}

const Store = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const swiperCover = useRef<any | null>(null);
  const [gridThemes, setGridThemes] = useState<Theme[]>([]);
  const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
  const [coverThemes, setCoverThemes] = useState<Theme[]>([]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json', { cache: 'no-store' })
      .then(response => response.json())
      .then((data: ThemesResponse) => {
        setGridThemes(data.themes);
        // Select up to 3 random themes to display in coverThemes
        const shuffled = [...data.themes].sort(() => 0.5 - Math.random());
        setCoverThemes(shuffled.slice(0, 3));
      })
      .catch(error => console.error('Failed to fetch themes', error));
  }, []);

  useEffect(() => {
    setFilteredThemes(gridThemes.filter(theme =>
      theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || theme.description.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm, gridThemes]);

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
              loop={true}
              className='w-full aspect-[8/3]'
              modules={[Autoplay]}
              autoplay={{
                delay: 5000,
                stopOnLastSlide: false,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
              }}
            >
              { coverThemes.map((theme, index) => (
                  <SwiperSlide className='relative rounded-xl overflow-clip' key={index}>
                    <img
                      src={theme.marqueeImage}
                      alt="Theme Preview"
                      className="object-cover w-full h-full"
                    />
                    <div className='absolute bottom-0 left-0 p-8 z-[1]'>
                      <h2 className='text-4xl font-bold text-white'>{theme.name}</h2>
                      <p className='text-lg text-white'>{theme.description}</p>
                    </div>

                    {/* shadow from the bottom of the image */}
                    <div className='absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent' />
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
              <div className="bg-gray-50 w-full transition-all duration-300 relative group/card flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl p-6 border">
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
                  <img src={theme.coverImage} alt="Theme Preview" className="object-cover w-full h-48 rounded-md" />
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
        {filteredThemes.length == 0 && (
          <div className="flex flex-col items-center justify-center w-full text-center h-96">
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">That doesnt exist! 😭😭😭</h1>
            <p className="mt-6 text-lg leading-7 text-gray-600">Sorry, we couldn’t find the theme you’re looking for. Maybe... you could create it?</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Store;