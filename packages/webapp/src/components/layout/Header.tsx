'use client';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ConnectButton } from '@/components/ui/ConnectButton';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-11 bg-[#0B0F14] border-b border-white/10 z-50">
      <div className="flex items-center justify-between h-full px-4 max-w-[424px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <span className="text-base font-semibold text-white">
            Game Of Life
          </span>
        </div>

        {/* Right side: Connect + Language */}
        <div className="flex items-center gap-2">
          <ConnectButton />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
