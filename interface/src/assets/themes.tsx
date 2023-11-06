import test from './themeCovers/929098bd-40b9-46a5-bd6f-8b9e7d5e648b.webp';
import hacker from './themeCovers/hacker.jpeg'

const themes = [
  {
    name: "Dark",
    url: "https://raw.githubusercontent.com/SethBurkart123/BetterSEQTA-Themes/main/themes/dark.json",
    coverImage: <img className="object-cover object-center w-full h-full" src={test} />,
  },
  {
    name: "Hacker",
    url: "https://raw.githubusercontent.com/SethBurkart123/BetterSEQTA-Themes/main/themes/hacker.json",
    coverImage: <img className="object-cover object-center w-full h-full" src={hacker} />,
  },
];

export default themes;