import { useState } from "react";
import Switch from "../components/Switch";

export default function Shortcuts() {
  const [shortcutState, setShortcutState] = useState({
    youtube: false,
    outlook: false,
    office: false,
    spotify: false,
    google: false,
    duckduckgo: false,
    coolmathgames: false,
    sace: false,
    googlescholar: false,
    gmail: false,
    netflix: false
  });

  // Handler for Switches
  const switchChange = (key: string, isOn: boolean) => {
    setShortcutState({
      ...shortcutState,
      [key]: isOn,
    });
  };

  const DefaultShortcuts = [
    {
      title: "YouTube",
      link: "https://youtube.com",
      modifyElement: <Switch state={shortcutState.youtube} onChange={(isOn: boolean) => switchChange('youtube', isOn)} />
    },
    {
      title: "Outlook",
      link: "https://outlook.office.com/mail/inbox",
      modifyElement: <Switch state={shortcutState.outlook} onChange={(isOn: boolean) => switchChange('outlook', isOn)} />
    },
    {
      title: "Office",
      link: "https://www.office.com/",
      modifyElement: <Switch state={shortcutState.office} onChange={(isOn: boolean) => switchChange('office', isOn)} />
    },
    {
      title: "Spotify",
      link: "https://www.spotify.com/",
      modifyElement: <Switch state={shortcutState.spotify} onChange={(isOn: boolean) => switchChange('spotify', isOn)} />
    },
    {
      title: "Google",
      link: "https://www.google.com/",
      modifyElement: <Switch state={shortcutState.google} onChange={(isOn: boolean) => switchChange('google', isOn)} />
    },
    {
      title: "DuckDuckGo",
      link: "https://duckduckgo.com/",
      modifyElement: <Switch state={shortcutState.duckduckgo} onChange={(isOn: boolean) => switchChange('duckduckgo', isOn)} />
    },
    {
      title: "Cool Math Games",
      link: "https://www.coolmathgames.com/",
      modifyElement: <Switch state={shortcutState.coolmathgames} onChange={(isOn: boolean) => switchChange('coolmathgames', isOn)} />
    },
    {
      title: "SACE",
      link: "https://www.sace.sa.edu.au/",
      modifyElement: <Switch state={shortcutState.sace} onChange={(isOn: boolean) => switchChange('sace', isOn)} />
    },
    {
      title: "Google Scholar",
      link: "https://scholar.google.com/",
      modifyElement: <Switch state={shortcutState.googlescholar} onChange={(isOn: boolean) => switchChange('googlescholar', isOn)} />
    },
    {
      title: "Gmail",
      link: "https://mail.google.com/",
      modifyElement: <Switch state={shortcutState.gmail} onChange={(isOn: boolean) => switchChange('gmail', isOn)} />
    },
    {
      title: "Netflix",
      link: "https://www.netflix.com/",
      modifyElement: <Switch state={shortcutState.netflix} onChange={(isOn: boolean) => switchChange('netflix', isOn)} />
    }
  ];

  return (
    <div className="flex flex-col divide-y divide-zinc-100">
      {DefaultShortcuts.map((shortcut, index) => (
        <div className="flex items-center justify-between px-4 py-3" key={index}>
          {shortcut.title}
          {shortcut.modifyElement}
        </div>
      ))}
    </div>
  );
}
