import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import './globals.css';
import farcasterConfig from '../../public/.well-known/farcaster.json';

// farcaster.jsonからEmbed用メタタグを動的に生成
function generateFarcasterEmbedMeta() {
  const { miniapp } = farcasterConfig;

  const embedData = {
    version: '1',
    imageUrl: miniapp.ogImageUrl || miniapp.heroImageUrl,
    button: {
      title: '🎮 Play',
      action: {
        type: 'launch_miniapp',
        url: miniapp.homeUrl,
        name: miniapp.name,
        splashImageUrl: miniapp.splashImageUrl,
        splashBackgroundColor: miniapp.splashBackgroundColor,
      },
    },
  };

  // fc:frame用（後方互換性）
  const frameData = {
    ...embedData,
    button: {
      ...embedData.button,
      action: {
        ...embedData.button.action,
        type: 'launch_frame',
      },
    },
  };

  return {
    miniapp: JSON.stringify(embedData),
    frame: JSON.stringify(frameData),
  };
}

const farcasterEmbed = generateFarcasterEmbedMeta();

export const metadata: Metadata = {
  title: farcasterConfig.miniapp.name,
  description: farcasterConfig.miniapp.description,
  openGraph: {
    title: farcasterConfig.miniapp.ogTitle,
    description: farcasterConfig.miniapp.ogDescription,
    type: 'website',
    images: [farcasterConfig.miniapp.ogImageUrl],
  },
  other: {
    'fc:miniapp': farcasterEmbed.miniapp,
    'fc:frame': farcasterEmbed.frame,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0B0F14] text-white">
        <Providers>
          <Header />
          <SafeAreaWrapper>
            <main className="max-w-[424px] mx-auto px-6">
              {children}
            </main>
          </SafeAreaWrapper>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
