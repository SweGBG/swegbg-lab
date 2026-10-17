import type { Metadata, Viewport } from "next";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lab.swegbg.com"),
  title: "SweGBG Lab – lek med din sajt",
  description:
    "Prova verktygen från SweGBG direkt i webbläsaren: gör ditt eget laddintro med din logga och dra genom en scrollfilm. Allt körs hos dig, inget laddas upp.",
  openGraph: { title: "SweGBG Lab", description: "Lek med din sajt. Allt körs i din webbläsare.", locale: "sv_SE", type: "website" },
};

export const viewport: Viewport = { themeColor: "#070d1d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
