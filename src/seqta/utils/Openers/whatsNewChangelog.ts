export type WhatsNewRelease = {
  title: string;
  items: string[];
};

export const WHATS_NEW_CHANGELOG: WhatsNewRelease[] = [
  {
    "title": "3.7.3 – Timetable sync to Calendar & Bugfix Bundle",
    "items": [
      "Added an option in the Timetable to sync to Google Calendar and Outlook Calendar",
      "Improved the sidebar to be more stable and performant.",
      "Fixed dropdown contrast and readability in settings and across SEQTA pages.",
      "Fixed Analytics sidebar item not hiding when toggled off in Edit Sidebar.",
      "Fixed timetable subject colour picker not reopening after closing (#221).",
      "Fixed theme wallpaper images not applying on Firefox (#206).",
      "Fixed missing subjects in upcoming assessments on the home page (#454).",
      "Added home page assessment limits (subjects, per-subject count, include past).",
      "Fixed assessment overview showing <code>Undefined%</code> for letter grades (#430).",
      "Fixed notifications older than a year being removed; added local per-account archive (#443).",
      "Fixed notices on the home screen sometimes failing to load (#388).",
      "Fixed multi-target builds exiting early and masking Vite errors.",
      "Improved background music autoplay with a tap-to-start hint when blocked.",
      "Added verbose logging toggle under Developer settings.",
      "Restored theme settings Edit/Done label and improved custom Select keyboard accessibility.",
      "Cloud sign-in now sends a device name for account management."
    ]
  },
  {
    "title": "3.7.2 – Analytics Fixes",
    "items": [
      "Fixed analytics page breaking on certain configurations.",
      "Added safer DOM handling for analytics to prevent crashes.",
      "Fixed hovering tooltip for forecast analytics chart.",
      "Improved grade analytics layout, controls, and forecast chart rendering.",
      "Updated update image for new layout."
    ]
  },
  {
    "title": "3.7.0 – Grade Analytics, Enhanced Navigation, fonts, Global Search & SEQTA Engage Improvements",
    "items": [
      "Added Enhanced Navigation for courses: the navigator now auto-scrolls to the selected lesson (e.g. inside the \"Go to…\" popup) and prev/next arrows for jumping between lessons.",
      "Added Grade Analytics, new sidebar page with grade trend charts synced from SEQTA.",
      "Added Grade distribution auto-detects your school’s letter scale from released marks for analytics page.",
      "Added documents, notices, portals, folios, goals, and more to Global Search.",
      "Added shortcuts to SEQTA Engage home page.",
      "Added assessments overview and assessment weighting overrides for SEQTA Engage.",
      "Added BetterSEQTA sidebar icons to SEQTA Engage.",
      "Added more capabilities for an upcoming interactive theme.",
      "Added font picker in settings.",
      "Added rubric copy on assessment detail pages.",
      "Added manual weight entry when an assessment weight is N/A.",
      "Added an automatic reindex of assessments if any of a series of tracked values change (title, release state, etc). Helps keep weightings up to date.",
      "Fixed BetterSEQTA sidebar injection issues on some pages.",
      "Tweak Theme of the Month popup making it more clear about dismissals and respecting “Don’t show again”.",
      "Fixed duplicate-result fixes.",
      "Improved assessments overview with a better look.",
      "Fixed assement overview showing old subjects."
    ]
  },
  {
    "title": "3.6.5 - Theme of the Month, custom message folders & assessment weighting overrides",
    "items": [
      "Added Theme of the Month — a monthly featured theme popup with a link to view it in the theme store.",
      "Added custom message folders for organising direct DM's with drag to reorder.",
      "Added the ability to override/add weightings to assessments (on assessment page).",
      "Fixed custom room and teacher names not showing in the timetable popup.",
      "Fixed assessment averages treating N/A weightings incorrectly in subject average calculations.",
      "Fixed the display of weightings that could not automatically be discovered.",
      "Fixed the formatting of the weighting tag that was broken due to a SEQTA update."
    ]
  },
  {
    "title": "3.6.4 - Theme flavours and fixes, Upcoming Assements improvement",
    "items": [
      "Added advanced colour adjustments variables for theme customisation.",
      "Improved logic for upcoming assements dashlet to improve compatibility.",
      "BS Cloud can now automatically download themes from other devices.",
      "Added theme flavours for multiple colour variations of the same theme."
    ]
  },
  {
    "title": "3.6.3 - Assessment overview fix",
    "items": [
      "Fixed assessments overview failing to load."
    ]
  },
  {
    "title": "3.6.2 - Cloud backup, various fixes & SEQTA Engage support",
    "items": [
      "BetterSEQTA Cloud: back up and restore extension settings from your account (General settings).",
      "Optional automatic cloud sync if signed in (on by default).",
      "Option to use cloud profile photo as the local SEQTA profile picture",
      "Firefox: fixed the extension settings popup.",
      "SEQTA Engage: Added BetterSEQTA Plus support for SEQTA Engage for Parents.",
      "Added smooth transitions to adaptive themes (on by default)",
      "Added adaptive theme variables to custom themes (try it out with the Windows XP theme)",
      "Fixed today's lessons on the homepage misbehaving in developer mode.",
      "Reduced overlap between BetterSEQTA subject averages and SEQTA's built-in averages UI.",
      "Updated outdated in-app links and update some under the hood code (Vite 8).",
      "Added a notifications panel animation to work like settings.",
      "Fix timetable edit plugin not working correctly."
    ]
  },
  {
    "title": "3.5.3 - Adaptive theme updates",
    "items": [
      "Fixed adaptive theming on current-year course and assessment pages."
    ]
  },
  {
    "title": "3.5.2 - PDF & store compliance",
    "items": [
      "Put PDF.js with the extension so assessment weighting stays compatible with Chrome Web Store rules"
    ]
  },
  {
    "title": "3.5.1 - QR & session link fix",
    "items": [
      "Fixed DesQTA Connect Mobile App QR generation on Chrome"
    ]
  },
  {
    "title": "3.5.0 - Adaptive Theme, Timetable Editor & More",
    "items": [
      "Added adaptive theme colour",
      "Added optional soft gradient for adaptive theme when viewing a class",
      "Added timetable editor",
      "Added icon-only sidebar option for a compact layout",
      "Added empty states for notices and homepage cards",
      "Added BetterSEQTA Cloud sign-in and improved store browsing details",
      "Improved popup rendering to better handle floating UI elements",
      "Fixed assessment colouring issues",
      "Fixed icon loading on SEQTA pages and improved Windows dropdown styling",
      "Fixed sidebar issues with compact mode, keyboard focus, and tab navigation",
      "Fixed unnecessary notice modal scrolling and other popup styling issues",
      "Added new kanban categories to the assessments overview",
      "Added DesQTA QR code generation in settings for linking to the DesQTA (BetterSEQTA) mobile app",
      "New store with improved theme browsing and backgrounds",
      "Other minor bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.16 - Subject Averages Fixes",
    "items": [
      "Fixed subject averages not showing correctly with letter grades and weighted marks"
    ]
  },
  {
    "title": "3.4.15 - SEQTA New UI Patch",
    "items": [
      "Fixed compatibility issues caused by the new SEQTA UI update",
      "Adjusted styling to match updated SEQTA layout changes",
      "Other minor bug fixes and stability improvements"
    ]
  },
  {
    "title": "3.4.14 - Search & Assessments Update",
    "items": [
      "Global Search improvements: indexing progress, more accurate results, and now includes past assessments/assignments",
      "Assessment Averages now parse weightings when possible for more accurate subject averages",
      "Added weight labels to assessment items (including proper handling of 0% and missing weights)",
      "Fixed homepage tutor lesson colours and assessments/courses visibility issues",
      "Fixed upcoming lessons tutorial room not displaying",
      "Fixed favicon not showing / race condition issues",
      "Other minor styling and stability improvements"
    ]
  },
  {
    "title": "3.4.13 - Bug Fixes & Styling Improvements",
    "items": [
      "Fixed house/year box hard failing when house_colour does not exist",
      "Fixed message of the day being unreadable in light mode",
      "Fixed global font styling issues due to SEQTA updates",
      "Fixed styling issues with title bar and other elements",
      "Other minor bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.12 - Privacy Updates & Bug Fixes",
    "items": [
      "Added privacy statement",
      "Added disclaimer modal to assessment averages switch",
      "Improved popup management system",
      "Other minor bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.11 - New Features & Bug Fixes",
    "items": [
      "Added Background Music plugin",
      "Added empty state for assessments on homepage",
      "Added Colour Picker hex/rgba controls",
      "Fixed custom shortcuts positioning (moved above regular shortcuts)",
      "Fixed Go to popup not scrolling properly",
      "Made theme edit mode more plain",
      "Other minor bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.10 - Minor bug fixes",
    "items": [
      "Fixed UI file styling incorrectly applying to documents",
      "Fixed missing styles in global search",
      "Added icons for image files in file viewer",
      "Added rounded corners when dragging calendar events",
      "Improved performance of element scanning",
      "Other minor improvements"
    ]
  },
  {
    "title": "3.4.9 - Bug Fixes and Performance Improvements",
    "items": [
      "Fixed performance issues with large notices on the homepage",
      "Improved performance when global search is disabled",
      "Improved performance of storage handling",
      "Other bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.8 - Improvements!",
    "items": [
      "Added new assessments kanban overview",
      "Added custom profile pictures",
      "Added custom shortcut icons",
      "Added modern and animated notices on homepage",
      "Improved global search performance and bug fixes",
      "Fixed sidebar icons reverting to old style after reload",
      "Fixed settings popup not appearing on disabled pages",
      "Fixed 12-hour time not applying correctly in timetable",
      "Fixed background flickering on page load",
      "Fixed homepage lessons not properly changing days",
      "Performance improvements for global search",
      "Performance improvements across the extension",
      "Other bug fixes and improvements"
    ]
  },
  {
    "title": "3.4.7 - Global Search",
    "items": [
      "Added a new global search bar (enable in settings)\n        <span class=\"beta\">beta</span>\n      ",
      "Fixed news feed not loading",
      "Style changes and improvements",
      "Other bug fixes"
    ]
  },
  {
    "title": "3.4.6.1 - Hot patch!",
    "items": [
      "Fixed storage not updating and sometimes being replaced with default values"
    ]
  },
  {
    "title": "3.4.6 - Massive internal reworks!",
    "items": [
      "Fix SEQTA classes not being applied correctly causing a totally broken experience",
      "Reworked internals to function as a plugin system (more on this soon)",
      "Rebuilt theme system that is significantly less buggy",
      "Performance improvements",
      "Other minor bug fixes"
    ]
  },
  {
    "title": "3.4.5 - News, Bug Fixes, and improvements!",
    "items": [
      "Added alternative news sources",
      "Notifications now open direct messages",
      "Added Toggle for Letter/Percent Grades",
      "Added fullscreen to the theme creator CSS editor",
      "Added warning if BetterSEQTA is installed",
      "Removed max width from theme creator",
      "Fixed discord icon colour in light mode",
      "Fixed subject averages not showing up with letter grades",
      "Tweaked compose UI"
    ]
  },
  {
    "title": "3.4.4 - Bug Fixes and Improvements",
    "items": [
      "Added vertical zoom to the timetable",
      "Fixed theme importing failing when images were included",
      "Removed broken gradients on the backgrounds of certain buttons",
      "Fixed timetable quickbar arrow receiving the wrong colour",
      "Auto-applied selected theme after saving in theme creator",
      "Fixed a bug where timetable was clipped at certain times",
      "Fixed custom sidebar layouts not applying on page load",
      "Improved spacing of the message editor buttons",
      "Added HEX colour input to the theme creator",
      "Fixed theme application in the creator",
      "Performance improvements",
      "Other minor bug fixes"
    ]
  },
  {
    "title": "3.4.3 - Minor Bug Fixes",
    "items": [
      "Fixed a bug where timetable colours couldn't be changed",
      "Other minor bug fixes"
    ]
  },
  {
    "title": "3.4.2 - Minor Bug Fixes",
    "items": [
      "Fixed a bug where Assessment Average wasn't enabled by default",
      "Fixed floating menus would sometimes be placed behind other elements"
    ]
  },
  {
    "title": "3.4.1 - Bug Fixes and Performance Improvements",
    "items": [
      "Added a new \"Subject Average\" section to the assessments page",
      "Fixed a bug where animations wouldn't play correctly",
      "Added loading animations to the home page",
      "Under the hood performance improvements",
      "Improved animation performance",
      "Better Animations!",
      "Minor style tweaks"
    ]
  },
  {
    "title": "3.4.0 - Major Performance Update",
    "items": [
      "Completely rebuilt the extension popup using Svelte for dramatically improved performance",
      "Added a brand new background store with search functionality and downloadable backgrounds",
      "Significant code cleanup and optimization across the extension",
      "Improved overall responsiveness and load times",
      "Smoother animations and improved scrolling",
      "Fixed Firefox compatibility issues",
      "Other minor bug fixes and under the hood improvements"
    ]
  },
  {
    "title": "3.3.1 - Hot Fix",
    "items": [
      "Fixed assessments not loading when no notices are available"
    ]
  },
  {
    "title": "3.3.0 - Overhauled Theming System",
    "items": [
      "Added a theme store!",
      "Added the new theme creator!",
      "Fixed Notices not working on home page",
      "Fixed dark/light button labels inverted",
      "Switched to GitHub for hosting the update video",
      "Fixed an issue where the settings menu wouldn't change theme",
      "Fixed custom shortcuts not allowing ports to be used",
      "Fixed occasional flashing when using animations",
      "Fixed loading of the tab icon",
      "Made animations toggle apply to settings",
      "Small styling improvements",
      "Other minor bug fixes"
    ]
  },
  {
    "title": "3.2.7 - Minor Improvements",
    "items": [
      "Improved performance!",
      "Fixed a bug where the icon wasn't showing up"
    ]
  },
  {
    "title": "3.2.6 - Bug fixes and performance improvements",
    "items": [
      "Improved contrast for notifications",
      "Added 12-hour time format toggle",
      "Using external update video to ensure smaller package size",
      "Refactored underlying code to improve performance",
      "Removed old theme system <span style=\"font-style: italic;\">*revamp coming soon*</span>",
      "Improved notices contrast",
      "Remove Telemetry completely - as we weren't using it too much",
      "Added Error handling to settings interface",
      "Fixed HTML message editor cursor becoming misaligned",
      "Enabled spellcheck inside of direct messages",
      "Fixed timetable dates being misaligned",
      "Other minor bug fixes and under the hood improvements"
    ]
  },
  {
    "title": "3.2.5 - More Bug Fixes",
    "items": [
      "New direct message scroll animations",
      "Added error message for brave browser shields breaking backgrounds",
      "Fixed homepage assessment tooltips being cut off",
      "Improved direct message styling",
      "Made settings panel auto size to height of screen",
      "Fixed timetable dates not visible",
      "Other minor bug fixes"
    ]
  },
  {
    "title": "3.2.4 - Bug Fixes",
    "items": [
      "Added an open changelog button to settings",
      "Fixed a memory overflow bug with Education Perfect",
      "Fixed a bug where the background wouldn't change instantly",
      "Fixed news feed not loading",
      "Fixed home items duplicating",
      "Fixed Upcoming assessments not showing"
    ]
  },
  {
    "title": "3.2.2 - Minor Improvements",
    "items": [
      "Added Settings open-close animation",
      "Minor Bug Fixes"
    ]
  },
  {
    "title": "3.2.0 - Custom Themes",
    "items": [
      "Added transparency (blur) effects",
      "Added custom themes",
      "Added colour picker history",
      "Heaps of bug fixes"
    ]
  },
  {
    "title": "3.1.3 - Custom Backgrounds",
    "items": [
      "Added custom backgrounds with support for images and videos",
      "Overhauled topbar",
      "New animated hamburger icon",
      "Minor bug fixes"
    ]
  },
  {
    "title": "3.1.2 - New settings menu!",
    "items": [
      "Overhauled the settings menu",
      "Added custom gradients",
      "Added HEAPS of animations",
      "Fixed a bug where shortcuts don't show up",
      "Other minor bugs fixed"
    ]
  },
  {
    "title": "3.1.1 - Minor Bug fixes",
    "items": [
      "Fixed assessments overlapping",
      "Fixed houses not displaying if they aren't a specific color",
      "Fixed Chrome Webstore Link"
    ]
  },
  {
    "title": "3.1.0 - Design Improvements",
    "items": [
      "Minor UI improvements",
      "Added Animation Speed Slider",
      "Animation now enables and disables without reloading SEQTA",
      "Changed logo"
    ]
  },
  {
    "title": "3.0.0 - BetterSEQTA+ *Complete Overhaul*",
    "items": [
      "Redesigned appearance",
      "Upgraded to manifest V3 (longer support)",
      "Fixed transitional glitches",
      "Under the hood improvements",
      "Fixed News Feed"
    ]
  },
  {
    "title": "2.0.7 - Added support to other domains + Minor bug fixes",
    "items": [
      "Fixed BetterSEQTA+ not loading on some pages",
      "Fixed text colour of notices being unreadable",
      "Fixed pages not reloading when saving changes"
    ]
  },
  {
    "title": "2.0.2 - Minor bug fixes",
    "items": [
      "Fixed indicator for current lesson",
      "Fixed text colour for DM messages list in Light mode",
      "Fixed user info text colour"
    ]
  },
  {
    "title": "Sleek New Layout",
    "items": [
      "Updated with a new font and presentation, BetterSEQTA+ has never looked better."
    ]
  },
  {
    "title": "New Updated Sidebar",
    "items": [
      "Condensed appearance with new updated icons."
    ]
  },
  {
    "title": "Independent Light Mode and Dark Mode",
    "items": [
      "Dark mode and Light mode are now available to pick alongside your chosen Theme Colour. Your Theme Colour will now become an accent colour for the page.\n      Light/Dark mode can be toggled with the new button, found in the top-right of the menu bar."
    ]
  },
  {
    "title": "Create Custom Shortcuts",
    "items": [
      "Found in the BetterSEQTA+ Settings menu, custom shortcuts can now be created with a name and URL of your choice."
    ]
  }
];

export function renderWhatsNewChangelogHtml(): string {
  return WHATS_NEW_CHANGELOG.map(
    (release) =>
      `<h1>${release.title}</h1>\n${release.items.map((item) => `<li>${item}</li>`).join("\n")}`,
  ).join("\n\n      ");
}
