'use client';

import { useTranslation } from '@/components/i18n/LanguageContext';
import type { SegmentStatus as SegmentStatusType } from '@/types';

interface SegmentStatusProps {
  status: SegmentStatusType;
  size?: 'sm' | 'md';
}

export function SegmentStatus({ status, size = 'md' }: SegmentStatusProps) {
  const t = useTranslation();

  const isPending = status === 'pending';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${
        isPending
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-green-500/20 text-green-400'
      }`}
    >
      {isPending && (
        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
      )}
      {t(status)}
    </span>
  );
}
