import './App.css'
import Switch from './components/Switch'
import logo from './assets/betterseqta-dark-full.png'
import logoDark from './assets/betterseqta-light-full.png'
import ColorPicker from './components/ColorPicker'

const switchChange = (isOn: boolean) => {
  console.log(isOn)
}

const settings = [
  {
    title: "Notification Collector", 
    description: "Uncaps the 9+ limit for notifications, showing the real number.",
    modifyElement: <Switch onChange={switchChange} />
  },
  {  
    title: "Lesson Alerts",
    description: "Sends a native browser notification ~5 minutes prior to lessons.", 
    modifyElement: <Switch onChange={switchChange} />
  },
  {
    title: "Animated Background",
    description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
    modifyElement: <Switch onChange={switchChange} /> 
  },
  {
    title: "Animated Background Speed",
    description: "Controls the speed of the animated background.",
    modifyElement: <Switch onChange={switchChange} /> 
  },
  {
    title: "Custom Theme Colour",
    description: "Customise the overall theme colour of SEQTA Learn.",
    modifyElement: <ColorPicker />
  },
  {
    title: "BetterSEQTA+", 
    description: "Unlocks premium features.",
    modifyElement: <Switch onChange={switchChange} />
  }
]

function App() {

  return (
    <div className="flex flex-col gap-2 dark:bg-zinc-800">
      <div className="grid border-b border-b-zinc-200 place-items-center h-1/2">
        <img src={logo} className="w-4/5 dark:hidden" />
        <img src={logoDark} className="hidden w-4/5 dark:block" />
      </div>
      {settings.map((setting, index) => (
        <div className="flex justify-between px-4 place-items-center" key={index}>
          <div className="dark:text-white">
            <h2 className="text-sm font-bold">{setting.title}</h2>
            <p className="text-xs">{setting.description}</p>
          </div>
          <div>
            {setting.modifyElement}
          </div>
        </div>
      ))}
    </div>
  )
}

export default App