'use client';

import { PALETTE } from '@/types';

interface ColorPickerProps {
  selectedIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function ColorPicker({
  selectedIndex,
  onChange,
  className = '',
}: ColorPickerProps) {
  return (
    <div className={`grid grid-cols-8 gap-2 ${className}`}>
      {PALETTE.map((color, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={`w-8 h-8 rounded-md transition-all duration-200 ${
            selectedIndex === index
              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F14] scale-110'
              : 'hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
          title={`Color ${index}: ${color}`}
        />
      ))}
    </div>
  );
}

// コンパクト版（ワンラインで表示）
export function ColorPickerCompact({
  selectedIndex,
  onChange,
  className = '',
}: ColorPickerProps) {
  return (
    <div className={`flex gap-1 overflow-x-auto pb-1 ${className}`}>
      {PALETTE.map((color, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={`w-6 h-6 rounded-md flex-shrink-0 transition-all duration-200 ${
            selectedIndex === index
              ? 'ring-2 ring-white scale-110'
              : 'hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
