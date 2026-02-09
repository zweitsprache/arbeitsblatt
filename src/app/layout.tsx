import type { Metadata } from "next";
import { Asap_Condensed, Encode_Sans, Merriweather } from "next/font/google";
import "./globals.css";

const asapCondensed = Asap_Condensed({
  variable: "--font-asap-condensed",
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
        className={`${asapCondensed.variable} ${encodeSans.variable} ${merriweather.variable} ${asapCondensed.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
