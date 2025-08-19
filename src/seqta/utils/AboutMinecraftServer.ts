import { settingsState } from "./listeners/SettingsState";
import { animate, stagger } from "motion";
import stringToHTML from "./stringToHTML";

// fetches live player count
async function fetchPlayerCount(): Promise<number | string> {
  try {
    const res = await fetch("https://api.mcsrvstat.us/2/mc.betterseqta.org");
    const data = await res.json();
    return data?.players?.online ?? "??";
  } catch {
    return "??";
  }
}

export async function DeleteWhatsNew() {
  const bkelement = document.getElementById("whatsnewbk");
  const popup = document.querySelector(".whatsnewContainer") as HTMLElement;

  if (!settingsState.animations) {
    bkelement?.remove();
    return;
  }

  animate(
    [popup, bkelement!],
    { opacity: [1, 0], scale: [1, 0] },
    { ease: [0.22, 0.03, 0.26, 1] },
  ).then(() => {
    bkelement?.remove();
  });
}

export async function OpenMinecraftServerPopup() {
  const playerCount = await fetchPlayerCount();

  if (!document.querySelector('link[href*="minecraftia"]')) {
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.cdnfonts.com/css/minecraftia";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }

  const background = document.createElement("div");
  background.id = "whatsnewbk";
  background.classList.add("whatsnewBackground");

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");

  const header: any = stringToHTML(
    `<div class="whatsnewHeader">
        <h1>Minecraft Server</h1>
        <p>The official BetterSEQTA+ Minecraft Server</p>
      </div>`,
  ).firstChild;

  const imagecont = document.createElement("div");
  imagecont.classList.add("whatsnewImgContainer");

  const video = document.createElement("video");
  video.style.aspectRatio = "16/9";
  video.style.background = "black";
  const source = document.createElement("source");

  source.setAttribute(
    "src",
    "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/server-video.mp4",
  );
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.appendChild(source);
  video.classList.add("whatsnewImg");
  imagecont.appendChild(video);

  const textcontainer = document.createElement("div");
  textcontainer.classList.add("whatsnewTextContainer");

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer" style="height: 50%; overflow-y: scroll;">
      <h1>Join our community in Minecraft!</h1>
      <p style="margin-left: 0;">Join the official BetterSEQTA+ Minecraft Server community now!</p>

      <h1>Server Features</h1>
      <ul>
        <li>SMP as our first release gamemode</li>
        <li>Community events and competitions</li>
        <li>Custom world generation</li>
        <li>Shop system with buying and selling</li>
        <li>Regular updates and maintenance</li>
        <li>The End dimension will be enabled during an upcoming live event</li>
      </ul>

      <p style="
        font-family: 'Minecraftia', sans-serif;
        color: white;
        font-weight: bold;
        font-size: 34px;
        text-align: center;
        margin-top: 0.5em;
        margin-bottom: 0.1em;
        text-shadow:
          -1px -1px 0 #000,
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000;
      ">
        mc.betterseqta.org
      </p>

      <p style="
        font-family: 'Minecraftia', sans-serif;
        color: white;
        font-weight: bold;
        font-size: 12px;
        text-align: center;
        margin-top: 0;
        text-shadow:
          -1px -1px 0 #000,
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000;
      ">
        Version: 1.21.4
      </p>

      <p style="
        font-family: 'Minecraftia', sans-serif;
        color: white;
        font-weight: bold;
        font-size: 12px;
        text-align: center;
        margin-top: 0;
        text-shadow:
          -1px -1px 0 #000,
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000;
      ">
        Players Online: ${playerCount}
      </p>
    </div>
  `).firstChild;

  const footer = stringToHTML(/* html */ `
      <div class="whatsnewFooter">
        <div>
         Resources and Feedback:
         <!-- YOUR LINK ICONS GO HERE, I'M NOT DUPLICATING THAT WALL LMAOO -->
        </div>
      </div>
    `).firstChild;

  const exitbutton = document.createElement("div");
  exitbutton.id = "whatsnewclosebutton";

  container.append(
    header,
    imagecont,
    text as HTMLElement,
    footer as HTMLElement,
    exitbutton,
  );

  background.append(container);

  document.getElementById("container")!.append(background);

  const bkelement = document.getElementById("whatsnewbk");
  const popup = document.getElementsByClassName("whatsnewContainer")[0];

  if (settingsState.animations) {
    animate(
      [popup, bkelement as HTMLElement],
      { scale: [0, 1] },
      {
        type: "spring",
        stiffness: 220,
        damping: 18,
      },
    );

    animate(
      ".whatsnewTextContainer *",
      { opacity: [0, 1], y: [10, 0] },
      {
        delay: stagger(0.05, { startDelay: 0.1 }),
        duration: 0.5,
        ease: [0.22, 0.03, 0.26, 1],
      },
    );
  }

  delete settingsState.justupdated;

  bkelement!.addEventListener("click", function (event) {
    if (event.target === bkelement) {
      DeleteWhatsNew();
    }
  });

  const closeelement = document.getElementById("whatsnewclosebutton");
  closeelement!.addEventListener("click", function () {
    DeleteWhatsNew();
  });
}
