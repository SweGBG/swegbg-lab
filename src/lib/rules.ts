/** The looks of the CRiNTRO loading rule (the same styles as on the real sites). */
export type RuleStyle = {
  id: string;
  name: string;
  hint: string;
  /** gradient of the filled rule */
  fill: string;
  /** glow around the rule */
  glow: string;
  /** the bright tip that rides the front of the rule */
  tip: string;
  /** a suggested background for the loader screen */
  bg: string;
  /** colour of the word that gets the accent */
  accent: string;
};

export const RULES: RuleStyle[] = [
  {
    id: "kol", name: "Kol", hint: "Glöder upp som ett kol (Coal is King)",
    fill: "linear-gradient(90deg,#4a140a,#d6391f 30%,#d4a94f 62%,#ff5a1f 85%,#fff1d2)",
    glow: "rgba(255,90,31,.55)", tip: "rgba(255,170,80,.95)", bg: "#0c0a09", accent: "#ff5a1f",
  },
  {
    id: "ugn", name: "Ugn", hint: "Gräddas från deg till glöd (Pizzeria dell'Anima)",
    fill: "linear-gradient(90deg,#efe0c2,#e7b35a 35%,#ff8a3d 68%,#e2412b)",
    glow: "rgba(255,138,61,.5)", tip: "rgba(255,176,90,.95)", bg: "#14100d", accent: "#ff8a3d",
  },
  {
    id: "bar", name: "Bär", hint: "Bärrött med rosa glans (SweProtein)",
    fill: "linear-gradient(90deg,#c9305a,#f2557a 60%,#ffb0bf)",
    glow: "rgba(242,85,122,.5)", tip: "rgba(255,190,205,.95)", bg: "#170c12", accent: "#f2557a",
  },
  {
    id: "guld", name: "Guld", hint: "Mässing som polerar sig själv (SweGBG)",
    fill: "linear-gradient(90deg,#9a7a35,#c98a2c 35%,#f2b544 70%,#fff1c9)",
    glow: "rgba(242,181,68,.5)", tip: "rgba(255,230,170,.95)", bg: "#070d1d", accent: "#f2b544",
  },
  {
    id: "stal", name: "Stål", hint: "Kallt stål med vit gnista (verkstad, bygg)",
    fill: "linear-gradient(90deg,#3d4652,#6b7580 40%,#b8c2cd 80%,#ffffff)",
    glow: "rgba(184,194,205,.45)", tip: "rgba(255,255,255,.95)", bg: "#0e1013", accent: "#ff7a1a",
  },
];

export const ruleById = (id: string) => RULES.find((r) => r.id === id) ?? RULES[3];

/** Simulated networks for the preview: seconds until the film's opening is loaded. */
export const NETS = [
  { id: "wifi", name: "Wifi", load: 0.5 },
  { id: "4g", name: "4G", load: 1.6 },
  { id: "slow", name: "Tunnelbana", load: 5.5 },
] as const;
export type NetId = (typeof NETS)[number]["id"];
