'use client';

import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaDevnet } from '@reown/appkit/networks';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { getDefaultNetwork } from '@/app/lib/solana';

const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

const metadata = {
  name: 'MemeMint',
  description: 'Launch your Solana meme coin in 60 seconds',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://mememint.dev',
  icons: ['/icon.png'],
};

if (projectId) {
  const defaultNetwork = getDefaultNetwork() === 'mainnet' ? solana : solanaDevnet;
  createAppKit({
    adapters: [solanaAdapter],
    networks: [solana, solanaDevnet],
    defaultNetwork,
    projectId,
    metadata,
    features: {
      analytics: true,
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#6366F1',
      '--w3m-border-radius-master': '2px',
    },
  });
}

export function AppKitProvider({ children }) {
  return <>{children}</>;
}
