import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import Header from '../components/store/header';
import { Autoplay } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/autoplay';
import SpinnerIcon from '../components/LoadingSpinner';
import localforage from 'localforage';
import { StoreDownloadTheme } from '../../seqta/ui/themes/downloadTheme';

const textVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: {
    type: 'spring',
    bounce: 0,
    stiffness: 80,
    damping: 12
  } },
};

const containerVariants = {
  hidden: {
    y: '100vh',
  },
  visible: {
    y: 0,
    transition: {
      staggerChildren: 0.05,
      type: 'spring',
      bounce: 0,
      stiffness: 400,
      damping: 50
    },
  },
};

export type Theme = {
  name: string;
  description: string;
  coverImage: string;
  marqueeImage: string;
  id: string;
}

type ThemesResponse = {
  themes: Theme[];
}

export const DeleteDownloadedTheme = async (themeID: string) => {
  console.debug('DeleteDownloaded Theme:', themeID)
  await localforage.removeItem(themeID);

  const availableThemesList = await localforage.getItem('availableThemes') as string[];
  const updatedThemesList = availableThemesList.filter(theme => theme !== themeID);

  await localforage.setItem('availableThemes', updatedThemesList);
}

const Store = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const swiperCover = useRef<any | null>(null);
  const [gridThemes, setGridThemes] = useState<Theme[]>([]);
  const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
  const [coverThemes, setCoverThemes] = useState<Theme[]>([]);
  const [installingThemes, setInstallingThemes] = useState<string[]>([]);
  const [currentThemes, setCurrentThemes] = useState<string[]>([]);
  const [displayTheme, setDisplayTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchThemes = async () => {
    try {
    const response = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${(new Date()).getTime()}`, { cache: 'no-store' });
    const data: ThemesResponse = await response.json();
    setGridThemes(data.themes);
    // Select up to 3 random themes to display in coverThemes
    const shuffled = [...data.themes].sort(() => 0.5 - Math.random());
    setCoverThemes(shuffled.slice(0, 3));
    setLoading(false);
    } catch (error) {
    console.error('Failed to fetch themes', error);
    // Retry after 5 seconds
    setTimeout(fetchThemes, 5000);
    }
  };

  useEffect(() => {
    (async () => {
      document.title = 'BetterSEQTA+ Store';

      fetchThemes();
      const availableThemes = await localforage.getItem('availableThemes') as string[] | null;
      if (availableThemes) {
        setCurrentThemes(availableThemes)
      }
    })();
  }, []);

  useEffect(() => {
    setFilteredThemes(gridThemes.filter(theme =>
      theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || theme.description.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm, gridThemes]);

  const downloadTheme = (id: string) => {
    const themeContent = gridThemes.find(theme => theme.id === id);
    if (!themeContent) {
      alert('There was an error, The theme was not found!')
      return
    };

    setInstallingThemes([...installingThemes, id]);

    StoreDownloadTheme({ themeContent }).then(() => {
      setInstallingThemes(installingThemes.filter(theme => theme !== id));
      setCurrentThemes([...currentThemes, id]);
    });
  };

  const removeTheme = async (id: string) => {
    const themeContent = gridThemes.find(theme => theme.id === id);
    if (!themeContent) {
      alert('There was an error, The theme was not found!')
      return
    };

    setInstallingThemes([...installingThemes, id]);

    DeleteDownloadedTheme(id).then(() => {
      setInstallingThemes(installingThemes.filter(theme => theme !== id));
      setCurrentThemes(currentThemes.filter(theme => theme !== id));
    });
  }

  return (
    <div className="w-screen h-screen overflow-y-scroll pt-[4.25rem] bg-zinc-200/50 dark:bg-zinc-900 dark:text-white">
      
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* loader */}
      <div className={`flex items-center justify-center w-full h-full ${!loading && 'hidden'}`}>
        <SpinnerIcon className="w-16 h-16" />
      </div>

      <div className={`px-24 py-12 ${loading && 'hidden'}`}>
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
              { [...coverThemes, ...coverThemes].map((theme, index) => (
                  <SwiperSlide className='relative cursor-pointer rounded-xl overflow-clip' onClick={() => setDisplayTheme(theme)} key={index}>
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

          <div className={displayTheme ? 'pointer-events-auto' : 'pointer-events-none'}>
            <AnimatePresence>
              {displayTheme && (
                <motion.div
                  className={`fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-70`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDisplayTheme(null)}
                >
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xl h-[95%] p-8 pt-5 bg-white rounded-t-2xl dark:bg-zinc-800 overflow-scroll"
                    exit={{ y: "100vh" }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div className="relative h-auto">
                      <motion.button
                        className="absolute top-0 right-0 p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200"
                        onClick={() => setDisplayTheme(null)}
                        variants={textVariants}
                      >
                        {'\ued8a'}
                      </motion.button>
                      <motion.h2 className="mb-4 text-2xl font-bold" variants={textVariants}>
                        {displayTheme.name}
                      </motion.h2>
                      <motion.img src={displayTheme.coverImage} alt="Theme Cover" className="object-cover w-full h-48 mb-4 rounded-md" variants={textVariants} />
                      <motion.p className="mb-4 text-gray-700 dark:text-gray-300" variants={textVariants}>
                        {displayTheme.description}
                      </motion.p>
                      {
                        currentThemes.includes(displayTheme.id) ?
                        <motion.button
                          variants={textVariants}
                          onClick={() => removeTheme(displayTheme.id)}
                          className="flex px-4 py-2 mt-4 ml-auto rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2">
                          { installingThemes.includes(displayTheme.id) ? 
                            <>
                            <SpinnerIcon className="w-4 h-4 mr-2" />
                            Removing...
                            </> :
                            <> Remove </>
                          }
                        </motion.button> :
                        <motion.button
                          variants={textVariants}
                          onClick={() => downloadTheme(displayTheme.id)}
                          className="flex px-4 py-2 mt-4 ml-auto rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2">
                          { installingThemes.includes(displayTheme.id) ? 
                            <>
                            <SpinnerIcon className="w-4 h-4 mr-2" />
                            Installing...
                            </> :
                            <> Install </>
                          }
                        </motion.button>
                      }

                      <motion.div className="my-8 border-b border-zinc-200 dark:border-zinc-700" variants={textVariants} />

                      <motion.h3 className="mb-4 text-lg font-bold" variants={textVariants}>
                        Similar Themes
                      </motion.h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {gridThemes.filter(theme => theme.id !== displayTheme.id).sort((a, b) => a.name.localeCompare(displayTheme.name) - b.name.localeCompare(displayTheme.name)).map((theme, index) => (
                          <motion.div key={index} onClick={() => { setDisplayTheme(null); setDisplayTheme(theme); }} className='w-full cursor-pointer' variants={textVariants}>
                            <div
                              className="w-full overflow-clip rounded-xl transition-all duration-300 relative group/card flex flex-col hover:shadow-xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] h-auto"
                            >
                              <div className='absolute bottom-0 left-0 z-10 p-2'>
                                <h6 className="text-xl font-bold text-neutral-600 dark:text-white">
                                  {theme.name}
                                </h6>
                                <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-200">
                                  {theme.description}
                                </p>
                              </div>
                              <div className='absolute bottom-0 z-0 w-full h-3/4 bg-gradient-to-t from-black/80 to-transparent' />
                              <img src={theme.coverImage} alt="Theme Preview" className="object-cover w-full h-48" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
            <div onClick={() => setDisplayTheme(theme)} key={index} className='w-full cursor-pointer'>
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
                  {
                    currentThemes.includes(theme.id) ?
                    <button
                      onClick={() => removeTheme(theme.id)}
                      className="flex px-4 py-2 mt-4 ml-auto transition rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2">
                      { installingThemes.includes(theme.id) ? 
                        <>
                        <SpinnerIcon className="w-4 h-4 mr-2" />
                        Removing...
                        </> :
                        <> Remove </>
                      }
                    </button> :
                    <button
                      onClick={() => downloadTheme(theme.id)}
                      className="flex px-4 py-2 mt-4 ml-auto transition rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2">
                      { installingThemes.includes(theme.id) ? 
                        <>
                        <SpinnerIcon className="w-4 h-4 mr-2" />
                        Installing...
                        </> :
                        <> Install </>
                      }
                    </button>
                  }
                </div>
              </div>
            </div>
          ))}

        </div>
        {filteredThemes.length == 0 && !loading && (
          <div className="flex flex-col items-center justify-center w-full text-center h-96">
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">That doesnt exist! 😭😭😭</h1>
            <p className="mt-6 text-lg leading-7 text-zinc-600 dark:text-zinc-300">Sorry, we couldn’t find the theme you’re looking for. Maybe... you could create it?</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Store;