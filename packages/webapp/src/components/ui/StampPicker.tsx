'use client';

import { STAMPS, StampTemplate } from '@/lib/stamps';

interface StampPickerProps {
  selectedStampId: string | null;
  onSelect: (stamp: StampTemplate | null) => void;
  onSecretAction?: () => void;
}

export function StampPicker({ selectedStampId, onSelect, onSecretAction }: StampPickerProps) {
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
      {/* 秘密ボタン - Baseロゴを挿入 */}
      {onSecretAction && (
        <button
          onClick={onSecretAction}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl
            transition-all duration-200 border-2
            bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/50
            hover:from-blue-500/30 hover:to-purple-500/30 hover:scale-105 hover:border-blue-400"
          title="Secret: Insert Base Logo"
        >
          ㊙️
        </button>
      )}
    </div>
  );
}
