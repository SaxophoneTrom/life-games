'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';

// SSRを無効化してクライアントサイドのみでレンダリング
const SegmentContent = dynamic(() => import('./SegmentContent'), {
  ssr: false,
  loading: () => (
    <div className="py-4 space-y-4 animate-fade-in">
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-white/50">Loading...</p>
        </CardContent>
      </Card>
    </div>
  ),
});

export default function SegmentDetailPage() {
  return <SegmentContent />;
}
