"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-xs font-bold text-white">LG</span>
          </div>
          <span className="font-semibold text-white text-sm">
            Life Games
          </span>
        </Link>

        {/* Wallet Connection */}
        <div className="flex items-center">
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
