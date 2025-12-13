import { Metadata } from 'next';
import SegmentPageClient from './SegmentPageClient';

// 動的OGメタデータ生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-life-games.vercel.app';

  return {
    title: `Segment #${id} | Infinite Life`,
    description: `Check out Segment #${id} on Infinite Life - Conway's Game of Life on Base`,
    openGraph: {
      title: `Segment #${id} | Infinite Life`,
      description: `Check out Segment #${id} on Infinite Life - Conway's Game of Life on Base`,
      images: [
        {
          url: `${baseUrl}/api/og/${id}`,
          width: 1200,
          height: 630,
          alt: `Segment #${id}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Segment #${id} | Infinite Life`,
      description: `Check out Segment #${id} on Infinite Life`,
      images: [`${baseUrl}/api/og/${id}`],
    },
  };
}

export default function SegmentDetailPage() {
  return <SegmentPageClient />;
}
