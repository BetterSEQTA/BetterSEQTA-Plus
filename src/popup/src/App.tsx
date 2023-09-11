import './App.css'
import Slider from './components/Slider'
import Switch from './components/Switch'

function App() {
  const switchChange = (isOn: boolean) => {
    console.log(isOn)
  }

  return (
    <div className="flex flex-col gap-2 dark:bg-zinc-800">
      <Switch onChange={switchChange} />
      <div className="w-48">
        <Slider onValueChange={(value) => console.log(value)} />
      </div>
      <Switch onChange={switchChange} />
      <Switch onChange={switchChange} />
      <Switch onChange={switchChange} />
      <Switch onChange={switchChange} />
      <Switch onChange={switchChange} />
      <Switch onChange={switchChange} />
    </div>
  )
}

export default App
