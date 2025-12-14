'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SegmentStatus } from '@/components/segment/SegmentStatus';
import type { Segment } from '@/types';

interface SegmentCardProps {
  segment: Segment;
  showDetails?: boolean;
}

export function SegmentCard({ segment, showDetails = false }: SegmentCardProps) {
  return (
    <Link href={`/segment/${segment.id}`}>
      <Card hoverable className="w-[100px] flex-shrink-0">
        {/* サムネイル */}
        <div className="aspect-square bg-[#0B0F14] relative">
          {segment.thumbnailUrl ? (
            <img
              src={segment.thumbnailUrl}
              alt={`Segment #${segment.id}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl text-white/20">#{segment.id}</span>
            </div>
          )}
          <div className="absolute top-1 right-1">
            <SegmentStatus status={segment.status} size="sm" />
          </div>
        </div>

        {/* 情報 */}
        <div className="p-2">
          <div className="text-sm font-medium text-white">#{segment.id}</div>
          {showDetails && (
            <div className="text-xs text-white/50 mt-0.5">
              Gen {segment.startGeneration}-{segment.endGeneration}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// スケルトンローダー
export function SegmentCardSkeleton() {
  return (
    <div className="w-[100px] flex-shrink-0 bg-white/5 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-white/10" />
      <div className="p-2">
        <div className="h-4 bg-white/10 rounded w-12" />
      </div>
    </div>
  );
}
