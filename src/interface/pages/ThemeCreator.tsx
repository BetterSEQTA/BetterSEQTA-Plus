import CodeEditor from '../components/CodeEditor';
import { useEffect, useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import Accordion from '../components/Accordian';
import Switch from '../components/Switch';
import { sendThemeUpdate } from '../hooks/ThemeManagment';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { CustomTheme, CustomThemeBase64 } from '../types/CustomThemes';
import browser from 'webextension-polyfill';

function ThemeCreator() {
  // default settings for new themes
  const [theme, setTheme] = useState<CustomTheme>({
    id: uuidv4(),
    name: '',
    description: '',
    defaultColour: '',
    CanChangeColour: true,
    allowBackgrounds: true,
    CustomCSS: '',
    CustomImages: [],
    coverImage: null,
    isEditable: true,
    hideThemeName: false,
  });

  useEffect(() => {
    const getTheme = async (themeID: string) => {
      const theme = await browser.runtime.sendMessage({
        type: 'currentTab',
        info: 'GetTheme',
        body: {
          themeID: themeID,
        }
      }) as CustomThemeBase64 | undefined;

      if (theme) {
        // base64toblob to convert it to a blob url
        const CustomImages = theme.CustomImages.map((image) => {
          const base64Index = image.url.indexOf(',') + 1;
          const imageBase64 = image.url.substring(base64Index);
        
          // Convert base64 to blob
          const byteCharacters = atob(imageBase64);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/png' });
        
          return {
            id: image.id,
            blob: blob,
            variableName: image.variableName,
          };
        });

        const coverImageBase64 = theme.coverImage;
        let coverImageBlob = null;

        if (coverImageBase64) {
          const base64Index = coverImageBase64.indexOf(',') + 1;
          const imageBase64 = coverImageBase64.substring(base64Index);
        
          // Convert base64 to blob
          const byteCharacters = atob(imageBase64);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          coverImageBlob = new Blob([byteArray], { type: 'image/png' });
        }

        setTheme({
          ...theme,
          CustomImages,
          coverImage: coverImageBlob
        });
        
        sendThemeUpdate({
          ...theme,
          CustomImages: CustomImages,
        }, false, true);
      }

    };

    // get ThemeID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const themeID = urlParams.get('themeID');

    if (themeID) {
      getTheme(themeID);
    }

  }, []);

  const generateImageId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then(res => res.blob());
        const imageId = generateImageId();
        const variableName = `custom-image-${theme.CustomImages.length}`;
        const updatedTheme = {
          ...theme,
          CustomImages: [...theme.CustomImages, { id: imageId, blob: imageBlob, variableName }],
        };
        setTheme(updatedTheme);
        sendThemeUpdate(updatedTheme, false, true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = (imageId: string) => {
    const updatedTheme = {
      ...theme,
      CustomImages: theme.CustomImages.filter((image) => image.id !== imageId),
    };
    setTheme(updatedTheme);
  };
  
  const handleImageVariableChange = (imageId: string, variableName: string) => {
    const updatedTheme = {
      ...theme,
      CustomImages: theme.CustomImages.map((image) =>
        image.id === imageId ? { ...image, variableName } : image
      ),
    };
    setTheme(updatedTheme);
  };

  function CodeUpdate(value: string) {
    setTheme((prevTheme) => ({
      ...prevTheme,
      CustomCSS: value,
    }));
  }

  const saveTheme = async () => {
    sendThemeUpdate(theme, true)
  };

  useEffect(() => {
    sendThemeUpdate(theme);
  }, [theme]);
  
  return (
    <div className='w-full min-h-[100vh] bg-zinc-100 dark:bg-zinc-800 dark:text-white transition duration-30'>
      <div className='flex flex-col p-2'>
        <h1 className='text-xl font-semibold'>Theme Creator</h1>

        <Divider />

        <div>
          <div className='pb-2 text-sm'>Theme Name</div>
          <input
            id='themeName'
            type='text'
            placeholder='What is your theme called?'
            value={theme.name}
            onChange={e => setTheme({ ...theme, name: e.target.value })}
            className='w-full p-2 mb-4 transition-all duration-300 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <div>
          <div className='pb-2 text-sm'>Description <span className='italic font-light opacity-80'>(optional)</span></div>
          <textarea
          id='themeDescription'
          placeholder="Don't worry, this one's optional!"
          value={theme.description}
          onChange={e => setTheme({ ...theme, description: e.target.value })}
          className='w-full p-2 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <Divider />

        <p className='pr-2 text-sm font-semibold'>Cover Image <span className='italic font-light opacity-80'>(optional)</span></p>
        <p className='pb-3 text-sm'>Upload an image to use as the cover image for your theme. <span className='italic font-light'>Recommended resolution: 640x128</span></p>

        <div className="relative flex justify-center w-full gap-1 overflow-hidden transition rounded-lg aspect-theme group place-items-center bg-zinc-100 dark:bg-zinc-900">
          <PlusIcon className={`transition pointer-events-none z-30 ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`} height={18} />
          <span className={`dark:text-white pointer-events-none z-30 transition ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>{theme.coverImage ? 'Change' : 'Add'} cover image</span>
          <input type="file" accept='image/*' onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              const reader = new FileReader();
              reader.onload = async () => {
                const imageBlob = await fetch(reader.result as string).then(res => res.blob());
                setTheme({ ...theme, coverImage: imageBlob });
              };
              reader.readAsDataURL(file);
            }
          }} className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
          {
            !theme.hideThemeName && theme.coverImage ?
            <div className="absolute z-30">{theme.name}</div> : <></>
          }
          {
            theme.coverImage &&
              <>
              <div className="absolute z-20 w-full h-full transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 bg-black/20"></div>
              <img src={URL.createObjectURL(theme.coverImage as Blob)} alt='Cover Image' className="absolute z-0 object-cover w-full h-full rounded" />
              </>
          }
        </div>

        <div className='flex items-center justify-between pt-4'>
          <div>
            <div className='pr-2 text-sm font-semibold'>Hide Name</div>
            <div className='pr-2 text-[11px]'>Useful when your cover image contains text</div>
          </div>
          <Switch state={theme.hideThemeName} onChange={value => setTheme({ ...theme, hideThemeName: value })} />
        </div>

        <Divider />

        <div className='flex items-center justify-between'>
          <div>
            <div className='pr-2 text-sm font-semibold'>Custom Theme Colour</div>
            <div className='pr-2 text-[11px]'>Allow users to change the theme colour</div>
          </div>
          <Switch state={theme.CanChangeColour} onChange={value => setTheme({ ...theme, CanChangeColour: value })} />
        </div>

        <div className='flex items-center justify-between pt-4'>
          <div>
            <div className='pr-2 text-sm font-semibold'>Custom Backgrounds</div>
            <div className='pr-2 text-[11px]'>Allow users to set image and video backgrounds</div>
          </div>
          <Switch state={theme.allowBackgrounds} onChange={value => setTheme({ ...theme, allowBackgrounds: value })} />
        </div>

        <Divider />
        
        <Accordion defaultOpened title='Default Theme Colour'>
          <div className='p-2 mt-2 bg-white rounded-lg w-fit dark:bg-zinc-900'>
            <ColorPicker
              width={278}
              disableDarkMode={true}
              hideInputs={true}
              value={theme.defaultColour}
              onChange={(color: string) => setTheme({ ...theme, defaultColour: color })} />
          </div>
        </Accordion>
        
        <Divider />

        <h2 className='pb-1 text-lg font-semibold'>Custom Images</h2>
        <p className='pb-3 text-sm'>Upload images to include them in your theme via CSS variables (gifs supported).</p>

        {theme.CustomImages.map((image) => (
          <div key={image.id} className="flex items-center h-16 py-2 mb-4 bg-white rounded-lg shadow-lg dark:bg-zinc-900">
            <div className="flex-1 h-full ">
              <img src={URL.createObjectURL(image.blob)} alt={image.variableName} className="object-contain h-full rounded" />
            </div>
            <input
              type="text"
              value={image.variableName}
              onChange={(e) => handleImageVariableChange(image.id, e.target.value)}
              placeholder="CSS Variable Name"
              className="flex-grow flex-[3] w-full p-2 transition-all duration-300 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-800/50 dark:text-white"
            />
            <button onClick={() => handleRemoveImage(image.id)} className="p-2 ml-1 transition dark:text-white">
              <XMarkIcon height={20} />
            </button>
          </div>
        ))}

        <div className="relative flex justify-center w-full h-8 gap-1 overflow-hidden transition rounded-lg place-items-center bg-zinc-100 dark:bg-zinc-900">
          <PlusIcon height={18} />
          <span className='dark:text-white'>Add image</span>
          <input type="file" accept='image/*' onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>

        <Divider />
        
        <Accordion defaultOpened title='Custom CSS'>
          <CodeEditor
            className='mt-2'
            height='300px'
            value={theme.CustomCSS}
            setValue={CodeUpdate} />
        </Accordion>

        <Divider />
        
        <button disabled={ theme.name === '' } onClick={saveTheme} className='w-full px-4 py-2 text-white transition bg-blue-500 rounded-lg dark:disabled:bg-zinc-700 disabled:bg-zinc-100 disabled:cursor-not-allowed dark:text-white'>
          Save theme
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <div className='w-full h-0.5 my-4 bg-zinc-200 dark:bg-zinc-700'></div>;
}

export default ThemeCreator;