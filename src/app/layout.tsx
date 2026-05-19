import type { Metadata } from "next";
import { Encode_Sans, Encode_Sans_Semi_Condensed, Merriweather, Shadows_Into_Light } from "next/font/google";
import { fontTheSansB } from "./fonts";
import "./globals.css";

const encodeSansSemiCondensed = Encode_Sans_Semi_Condensed({
  variable: "--font-encode-sans-semi-condensed",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const encodeSans = Encode_Sans({
  variable: "--font-encode-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Arbeitsblatt — Worksheet Builder",
  description: "Create and share worksheets for print and online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${encodeSansSemiCondensed.variable} ${encodeSans.variable} ${merriweather.variable} ${shadowsIntoLight.variable} ${fontTheSansB.variable} ${encodeSansSemiCondensed.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
