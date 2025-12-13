import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FarcasterProvider } from "@/providers/FarcasterProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Mini App Embed メタデータ
const miniAppEmbed = {
  version: "1",
  imageUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://life-games.vercel.app"}/og-image.png`,
  button: {
    title: "Play Life Games",
    action: {
      type: "launch_frame",
      name: "Life Games",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://life-games.vercel.app",
      splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://life-games.vercel.app"}/splash.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

export const metadata: Metadata = {
  title: "Life Games",
  description: "Conway's Game of Life NFT Competition on Base",
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FarcasterProvider>{children}</FarcasterProvider>
      </body>
    </html>
  );
}
