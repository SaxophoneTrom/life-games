import { Metadata } from 'next';
import EpochPageClient from './EpochPageClient';

// 動的OGメタデータ生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-life-games.vercel.app';

  return {
    title: `Epoch #${id} | Infinite Life`,
    description: `Check out Epoch #${id} on Infinite Life - Shared Conway's Game of Life Archive on Base`,
    openGraph: {
      title: `Epoch #${id} | Infinite Life`,
      description: `Check out Epoch #${id} on Infinite Life - Shared Conway's Game of Life Archive on Base`,
      images: [
        {
          url: `${baseUrl}/api/og/default`,
          width: 1200,
          height: 630,
          alt: `Epoch #${id}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Epoch #${id} | Infinite Life`,
      description: `Check out Epoch #${id} on Infinite Life`,
      images: [`${baseUrl}/api/og/default`],
    },
  };
}

export default function EpochDetailPage() {
  return <EpochPageClient />;
}
