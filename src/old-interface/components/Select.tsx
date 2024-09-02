export default function Select({ state, onChange, options }: { state: string, onChange: (value: string) => void, options: { value: string, label: string }[] }) {
  return (
    <select className='px-4 py-1.5 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white focus:border-none rounded-md mt-2 block w-full border-0 pl-3 pr-10 text-gray-900 focus:outline-none sm:text-sm sm:leading-6' value={state} onChange={(e) => onChange(e.target.value)}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
  )
}