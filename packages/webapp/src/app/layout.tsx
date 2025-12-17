import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Infinite Life',
  description: 'Shared Conway\'s Game of Life on Farcaster',
  openGraph: {
    title: 'Infinite Life',
    description: 'Shared Conway\'s Game of Life on Farcaster',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Mini App メタタグ */}
        <meta name="fc:miniapp" content="true" />
      </head>
      <body className="bg-[#0B0F14] text-white">
        <Providers>
          <Header />
          <SafeAreaWrapper>
            <main className="max-w-[424px] mx-auto px-4">
              {children}
            </main>
          </SafeAreaWrapper>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
