import './App.css'
import Switch from './components/Switch'

function App() {
  const switchChange = (isOn: boolean) => {
    console.log(isOn)
  }

  return (
    <div className="flex flex-col gap-2 bg-zinc-800">
      <Switch onChange={switchChange} />
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
