import { useEffect, useState } from "react";
import PocketBase from 'pocketbase';
import { ThemesRecord } from "../types/pocketbase-types";
import ConfettiExplosion from 'react-confetti-explosion';
import { LinkIcon } from "@heroicons/react/24/outline";
import { ToastContainer, toast } from 'react-toastify';
import browser from 'webextension-polyfill';
import 'react-toastify/dist/ReactToastify.css';
import localforage from "localforage";

const pb = new PocketBase('https://betterseqta.pockethost.io');

const Theme = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemesRecord | null>(null);
  const [themeID, setThemeID] = useState<string>('');
  const [justCreated, setJustCreated] = useState(false);
  const [displayConfetti, setDisplayConfetti] = useState(true);
  const [currentThemes, setCurrentThemes] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayConfetti(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const themeID = urlParams.get('id');
    const justCreated = urlParams.get('justCreated');
    if (themeID) {
      setThemeID(themeID);
    }

    const getTheme = async (themeID: string) => {
      const theme = await pb.collection<ThemesRecord>('themes').getOne(themeID);
      console.debug(theme);
      setIsLoading(false);
      setTheme(theme);

      const availableThemes = await localforage.getItem('availableThemes') as string[];
      setCurrentThemes(availableThemes)  
    }

    if (themeID && themeID !== 'null') {
      getTheme(themeID);
      setJustCreated(justCreated === 'true');
    }
  }, [])

  return (
    <>
      { isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-32 h-32 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      { theme && (
        <div className="flex flex-col items-center justify-center min-h-screen dark:text-white">
          <div className="p-8 text-center shadow-xl rounded-2xl bg-zinc-800 min-w-96">
            { justCreated ? (
              <>
                {
                  displayConfetti && (
                    <ConfettiExplosion
                      className="absolute"
                      colors={['#FF0000', '#FF7F50', '#DE3163', '#40E0D0', '#6495ED']}
                      duration={5000}
                      width={1500}
                      force={1}
                    />
                  )
                }
                <>
                  <h2 className="mb-2 text-2xl font-bold">Theme Created Successfully!</h2>
                  <p className="mb-8">Share the install link below with your friends to install the theme!</p>
                  <div
                    className="flex gap-2 py-2 pl-3 pr-2 text-white backdrop-blur-sm rounded-3xl ring-white/20 ring-1 bg-zinc-950/50"
                  >
                    <span className="my-auto">
                      {`https://share.betterseqta/theme?id=${themeID}`}
                    </span>
                    
                    <button
                      className="flex gap-1 px-3 py-2 text-white transition cursor-pointer rounded-2xl ring-white/20 ring-1 bg-zinc-950/20 hover:bg-black/85"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://share.betterseqta/theme?id=${themeID}`);
                        toast("Link copied to clipboard!");
                      }}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                </>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-2xl font-bold">{theme.name}</h2>
                <p className="mb-8">{theme.description}</p>
                {
                  currentThemes.includes((theme.theme as { id: string }).id) ?
                  <button
                      className="flex justify-center w-full gap-1 px-3 py-2 text-white transition cursor-not-allowed rounded-2xl ring-white/20 ring-1 bg-zinc-950/20"
                  >
                    Theme Installed!
                  </button>
                :
                  <button
                      className="flex justify-center w-full gap-1 px-3 py-2 text-white transition cursor-pointer rounded-2xl ring-white/20 hover:ring-white/10 ring-1 bg-zinc-950/20 hover:bg-zinc-950/40"
                      onClick={() => {
                        browser.runtime.sendMessage({ type: 'DownloadTheme', body: { theme } });
                        setCurrentThemes([...currentThemes, (theme.theme as { id: string }).id]);
                      }}
                  >
                    Install Theme
                  </button>
                }
              </>
            )}
          </div>
          <ToastContainer theme="dark" />
        </div>
      )}
    </>
  );
};

export default Theme;

