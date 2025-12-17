'use client';

import { STAMPS, StampTemplate } from '@/lib/stamps';

interface StampPickerProps {
  selectedStampId: string | null;
  onSelect: (stamp: StampTemplate | null) => void;
}

export function StampPicker({ selectedStampId, onSelect }: StampPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAMPS.map((stamp) => (
        <button
          key={stamp.id}
          onClick={() => onSelect(selectedStampId === stamp.id ? null : stamp)}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-xl
            transition-all duration-200 border-2
            ${
              selectedStampId === stamp.id
                ? 'bg-[#F67280]/30 border-[#F67280] scale-110'
                : 'bg-white/10 border-transparent hover:bg-white/20 hover:scale-105'
            }
          `}
          title={stamp.name}
        >
          {stamp.icon}
        </button>
      ))}
    </div>
  );
}
