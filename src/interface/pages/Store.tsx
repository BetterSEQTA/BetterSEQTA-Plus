import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Scrollbar, Autoplay } from 'swiper/modules';
import Header from '../components/store/header';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/autoplay';

const Store = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const swiperCover = useRef<any | null>(null);

  const coverThemes = [
    {
      coverImage: 'https://via.placeholder.com/300x200',
      name: 'Theme Name',
      description: 'Theme description goes here.'
    },
    {
      coverImage: 'https://via.placeholder.com/300x200',
      name: 'Theme Name',
      description: 'Theme description goes here.'
    },
    {
      coverImage: 'https://via.placeholder.com/300x200',
      name: 'Theme Name',
      description: 'Theme description goes here.'
    }
  ]

  return (
    <div className="w-screen h-screen overflow-y-scroll bg-zinc-100 dark:bg-zinc-900">
      
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <div className="px-32 py-12">
        <div className="relative w-full bg-green-100 aspect-[8/3] rounded-xl overflow-clip">
          <Swiper
            ref={swiperCover}
            spaceBetween={0}
            slidesPerView={1}
            modules={[Scrollbar, Autoplay]}
            navigation
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }}
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}    
            onSlideChange={() => console.log('slide change')}
            onSwiper={(swiper) => console.log(swiper)}
          >
            { coverThemes.map((theme, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={theme.coverImage}
                    alt="Theme Preview"
                    className="object-cover w-full h-full"
                  />
                </SwiperSlide>
              )) }
          </Swiper>

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
      </div>

      <div className="grid grid-cols-1 gap-8 px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {
          Array.from({ length: 30 }).map((_, index) => (
          <div key={index} className="overflow-hidden bg-white rounded-lg shadow-md dark:bg-zinc-800">
            <img
              src="https://via.placeholder.com/300x200"
              alt="Theme Preview"
              className="object-cover w-full h-48"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Theme Name
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Theme description goes here.
              </p>
              <button className="px-4 py-2 mt-4 text-white bg-blue-500 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Install
              </button>
            </div>
          </div>))}
      </div>
    </div>
  );
};

export default Store;