import stringToHTML from "../stringToHTML";
import browser from "webextension-polyfill";
import { settingsState } from "../listeners/SettingsState";
import { animate, stagger } from "motion";
import { DeleteWhatsNew } from "../Whatsnew";

export function OpenAboutPage() {
  console.log("OpenAboutPage ran!"); // Debug log

 
  if (!document.getElementById('about-here-link-style')) {
    const style = document.createElement('style');
    style.id = 'about-here-link-style';
    style.textContent = `
      .about-here-link {
      background: rgba(0, 102, 255, 0.07) !important;
      border-radius: 0.3em !important;
      padding: 2px 10px !important;
      color: #176bb2 !important;
      font-weight: 500 !important;
      transition: background 0.2s, color 0.2s !important;
      cursor: pointer !important;
    }
    .about-here-link:hover {
      background: rgba(0, 102, 255, 0.13) !important;
      color: #124c87 !important;
    }
    `;
    document.head.appendChild(style);
  }
  const background = document.createElement("div");
  background.id = "whatsnewbk";
  background.classList.add("whatsnewBackground");

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");

  var header: any = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>About</h1>
        <p>BetterSEQTA+ V${browser.runtime.getManifest().version}</p>
      </div>`,
  ).firstChild;

  let text = stringToHTML(/* html */ `
      <div class="whatsnewTextContainer" style="overflow-y: hidden;">
        <img src="${settingsState.DarkMode ? "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/branding/dark.jpg" : "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/branding/light.jpg"}" class="aboutImg" />
  
        <p>BetterSEQTA+ is a fork of BetterSEQTA (originally developed by Nulkem), which was discontinued. BetterSEQTA+ continued development of BetterSEQTA, while incorporating a plethora of features. </p>
        <p>We are currently working on fixing bugs and adding useful features. If you want to make a feature request or report a bug, you can do so on GitHub (find icon below). We are always looking for more contributors!</p>
        <h1>Credits:</h1>
        <p>Nulkem created the original extension, was ported to Manifest V3 by MEGA-Dawg68, and is under active development by Crazypersonalph, SethBurkart123, and other contributors.</p>
        <p> Full contributors list <a href="https://github.com/BetterSEQTA/BetterSEQTA-Plus/graphs/contributors" class="about-here-link">here</a></p>
      </div>
    `).firstChild;

  let footer = stringToHTML(/* html */ `
      <div class="whatsnewFooter">
        <div>
        Report bugs and feedback:
          <a class="socials" href="https://github.com/BetterSEQTA/BetterSEQTA-Plus" style="background: none !important; margin: 0 5px; padding:0;">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25px" height="25px" viewBox="0 0 256 250" version="1.1" preserveAspectRatio="xMidYMid">
              <g><path d="M128.00106,0 C57.3172926,0 0,57.3066942 0,128.00106 C0,184.555281 36.6761997,232.535542 87.534937,249.460899 C93.9320223,250.645779 96.280588,246.684165 96.280588,243.303333 C96.280588,240.251045 96.1618878,230.167899 96.106777,219.472176 C60.4967585,227.215235 52.9826207,204.369712 52.9826207,204.369712 C47.1599584,189.574598 38.770408,185.640538 38.770408,185.640538 C27.1568785,177.696113 39.6458206,177.859325 39.6458206,177.859325 C52.4993419,178.762293 59.267365,191.04987 59.267365,191.04987 C70.6837675,210.618423 89.2115753,204.961093 96.5158685,201.690482 C97.6647155,193.417512 100.981959,187.77078 104.642583,184.574357 C76.211799,181.33766 46.324819,170.362144 46.324819,121.315702 C46.324819,107.340889 51.3250588,95.9223682 59.5132437,86.9583937 C58.1842268,83.7344152 53.8029229,70.715562 60.7532354,53.0843636 C60.7532354,53.0843636 71.5019501,49.6441813 95.9626412,66.2049595 C106.172967,63.368876 117.123047,61.9465949 128.00106,61.8978432 C138.879073,61.9465949 149.837632,63.368876 160.067033,66.2049595 C184.49805,49.6441813 195.231926,53.0843636 195.231926,53.0843636 C202.199197,70.715562 197.815773,83.7344152 196.486756,86.9583937 C204.694018,95.9223682 209.660343,107.340889 209.660343,121.315702 C209.660343,170.478725 179.716133,181.303747 151.213281,184.472614 C155.80443,188.444828 159.895342,196.234518 159.895342,208.176593 C159.895342,225.303317 159.746968,239.087361 159.746968,243.303333 C159.746968,246.709601 162.05102,250.70089 168.53925,249.443941 C219.370432,232.499507 256,184.536204 256,128.00106 C256,57.3066942 198.691187,0 128.00106,0 Z M47.9405593,182.340212 C47.6586465,182.976105 46.6581745,183.166873 45.7467277,182.730227 C44.8183235,182.312656 44.2968914,181.445722 44.5978808,180.80771 C44.8734344,180.152739 45.876026,179.97045 46.8023103,180.409216 C47.7328342,180.826786 48.2627451,181.702199 47.9405593,182.340212 Z M54.2367892,187.958254 C53.6263318,188.524199 52.4329723,188.261363 51.6232682,187.366874 C50.7860088,186.474504 50.6291553,185.281144 51.2480912,184.70672 C51.8776254,184.140775 53.0349512,184.405731 53.8743302,185.298101 C54.7115892,186.201069 54.8748019,187.38595 54.2367892,187.958254 Z M58.5562413,195.146347 C57.7719732,195.691096 56.4895886,195.180261 55.6968417,194.042013 C54.9125733,192.903764 54.9125733,191.538713 55.713799,190.991845 C56.5086651,190.444977 57.7719732,190.936735 58.5753181,192.066505 C59.3574669,193.22383 59.3574669,194.58888 58.5562413,195.146347 Z M65.8613592,203.471174 C65.1597571,204.244846 63.6654083,204.03712 62.5716717,202.981538 C61.4524999,201.94927 61.1409122,200.484596 61.8446341,199.710926 C62.5547146,198.935137 64.0575422,199.15346 65.1597571,200.200564 C66.2704506,201.230712 66.6095936,202.705984 65.8613592,203.471174 Z M75.3025151,206.281542 C74.9930474,207.284134 73.553809,207.739857 72.1039724,207.313809 C70.6562556,206.875043 69.7087748,205.700761 70.0012857,204.687571 C70.302275,203.678621 71.7478721,203.20382 73.2083069,203.659543 C74.6539041,204.09619 75.6035048,205.261994 75.3025151,206.281542 Z M86.046947,207.473627 C86.0829806,208.529209 84.8535871,209.404622 83.3316829,209.4237 C81.8013,209.457614 80.563428,208.603398 80.5464708,207.564772 C80.5464708,206.498591 81.7483088,205.631657 83.2786917,205.606221 C84.8005962,205.576546 86.046947,206.424403 86.046947,207.473627 Z M96.6021471,207.069023 C96.7844366,208.099171 95.7267341,209.156872 94.215428,209.438785 C92.7295577,209.710099 91.3539086,209.074206 91.1652603,208.052538 C90.9808515,206.996955 92.0576306,205.939253 93.5413813,205.66582 C95.054807,205.402984 96.4092596,206.021919 96.6021471,207.069023 Z" fill="currentColor" /></g>
            </svg>
          </a>
          <a class="socials" href="https://chromewebstore.google.com/detail/betterseqta+/afdgaoaclhkhemfkkkonemoapeinchel" style="background: none !important; margin: 0 5px; padding:0;">
            <svg style="width:25px;height:25px" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,20L15.46,14H15.45C15.79,13.4 16,12.73 16,12C16,10.8 15.46,9.73 14.62,9H19.41C19.79,9.93 20,10.94 20,12A8,8 0 0,1 12,20M4,12C4,10.54 4.39,9.18 5.07,8L8.54,14H8.55C9.24,15.19 10.5,16 12,16C12.45,16 12.88,15.91 13.29,15.77L10.89,19.91C7,19.37 4,16.04 4,12M15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12M12,4C14.96,4 17.54,5.61 18.92,8H12C10.06,8 8.45,9.38 8.08,11.21L5.7,7.08C7.16,5.21 9.44,4 12,4M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
          </a>
          <a class="socials" href="https://discord.gg/YzmbnCDkat" style="background: none !important; margin: 0 5px; padding: 0;">
            <svg style="width: 25px; height: 25px;" viewBox="0 0 16 16">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" fill="currentColor"/>
            </svg>
          </a>
        </div>
      </div>
    `).firstChild;

  let exitbutton = document.createElement("div");
  exitbutton.id = "whatsnewclosebutton";

  container.append(header);
  container.append(text as ChildNode);
  container.append(footer as ChildNode);
  container.append(exitbutton);

  background.append(container);

  document.getElementById("container")!.append(background);

  let bkelement = document.getElementById("whatsnewbk");
  let popup = document.getElementsByClassName("whatsnewContainer")[0];

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
    // Check if the click event originated from the element itself and not any of its children
    if (event.target === bkelement) {
      DeleteWhatsNew();
    }
  });

  var closeelement = document.getElementById("whatsnewclosebutton");
  closeelement!.addEventListener("click", function () {
    DeleteWhatsNew();
  });
}
