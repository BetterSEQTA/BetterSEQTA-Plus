export const DEFAULT_FONT_ID = "rubik";

export interface FontPreset {
  id: string;
  name: string;
  stack: string;
  googleUrl?: string;
  sample: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "rubik",
    name: "Rubik",
    stack: "Rubik, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "inter",
    name: "Inter",
    stack: "Inter, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "poppins",
    name: "Poppins",
    stack: "Poppins, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "nunito",
    name: "Nunito",
    stack: "Nunito, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    stack: "Montserrat, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "open-sans",
    name: "Open Sans",
    stack: '"Open Sans", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "lato",
    name: "Lato",
    stack: "Lato, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "source-sans-3",
    name: "Source Sans 3",
    stack: '"Source Sans 3", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "raleway",
    name: "Raleway",
    stack: "Raleway, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    stack: '"DM Sans", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    stack: '"Plus Jakarta Sans", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "outfit",
    name: "Outfit",
    stack: "Outfit, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "roboto",
    name: "Roboto",
    stack: "Roboto, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "work-sans",
    name: "Work Sans",
    stack: '"Work Sans", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "manrope",
    name: "Manrope",
    stack: "Manrope, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "figtree",
    name: "Figtree",
    stack: "Figtree, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "lexend",
    name: "Lexend",
    stack: "Lexend, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    stack: "Ubuntu, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "karla",
    name: "Karla",
    stack: "Karla, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "quicksand",
    name: "Quicksand",
    stack: "Quicksand, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "ibm-plex-sans",
    name: "IBM Plex Sans",
    stack: '"IBM Plex Sans", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    stack: '"Space Grotesk", sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "mulish",
    name: "Mulish",
    stack: "Mulish, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "cabin",
    name: "Cabin",
    stack: "Cabin, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "oswald",
    name: "Oswald",
    stack: "Oswald, sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    stack: "Merriweather, serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "playfair-display",
    name: "Playfair Display",
    stack: '"Playfair Display", serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "lora",
    name: "Lora",
    stack: "Lora, serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "crimson-pro",
    name: "Crimson Pro",
    stack: '"Crimson Pro", serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    stack: '"Libre Baskerville", serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
    sample: "Assessment due tomorrow at 3:30pm",
  },
  {
    id: "system",
    name: "System Default",
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sample: "Assessment due tomorrow at 3:30pm",
  },
];

export function getFontPreset(id?: string | null): FontPreset {
  return (
    FONT_PRESETS.find((preset) => preset.id === id) ??
    FONT_PRESETS.find((preset) => preset.id === DEFAULT_FONT_ID)!
  );
}
