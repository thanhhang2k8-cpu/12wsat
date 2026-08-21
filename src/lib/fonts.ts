import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
});

export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-reading",
  weight: ["400", "600"],
  display: "swap",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-ui",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});
