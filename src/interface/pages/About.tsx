const About: React.FC = () => {

  return (
    <div className="flex flex-col overflow-y-scroll divide-y divide-zinc-100/50 dark:divide-zinc-700/50">
      <div>
        <h2 className="text-lg font-bold">About</h2>
        <p className="py-2">BetterSEQTA+ is a branch of BetterSEQTA which was originally developed by Nulkem. It was discontinued. So BetterSEQTA+ has come in to fill in that gap!</p>
        <p className="py-2">We are currently working on fixing bugs and adding new features. If you want to request a feature or report a bug, you can do so on 
          <a className="pl-1 text-blue-500 underline hover:text-blue-600" href="https://github.com/BetterSEQTA/BetterSEQTA-Plus" target="_blank">Github</a>.
        </p>
      </div>
      <div>
        <h2 className="pt-2 text-lg font-bold">Credits</h2>
        <p className="py-2">Nulkem for the original extension, OG-RandomTechChannel, Crazypersonalph, and the current maintainer BetterSEQTA</p>
      </div>
    </div>
  );
};

export default About;
