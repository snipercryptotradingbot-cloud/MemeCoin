'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { solana, solanaDevnet } from '@reown/appkit/networks';
import { getDefaultNetwork } from '@/app/lib/solana';

const STORAGE_KEY = 'mememint_network';

const NetworkContext = createContext({ network: 'devnet', setNetwork: () => {} });

function getInitialNetwork() {
  try {
    if (typeof window === 'undefined') return getDefaultNetwork();
    const raw = localStorage.getItem('mememint_auth');
    if (raw) {
      const user = JSON.parse(raw);
      const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences || '{}') : (user.preferences || {});
      if (prefs.network === 'mainnet' || prefs.network === 'devnet') return prefs.network;
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'mainnet' || stored === 'devnet') return stored;
    }
  } catch {}
  return getDefaultNetwork();
}

export function NetworkProvider({ children }) {
  const [network, setNetworkState] = useState(getInitialNetwork);
  const { caipNetwork, switchNetwork } = useAppKitNetwork();

  useEffect(() => {
    if (!caipNetwork) return;
    const current = caipNetwork.name?.toLowerCase()?.includes('mainnet') ? 'mainnet' : 'devnet';
    if (current !== network) setNetworkState(current);
  }, [caipNetwork]);

  const setNetwork = useCallback((n) => {
    if (n !== 'mainnet' && n !== 'devnet') return;
    setNetworkState(n);
    try { localStorage.setItem(STORAGE_KEY, n); } catch {}

    try {
      const raw = localStorage.getItem('mememint_auth');
      if (raw) {
        const user = JSON.parse(raw);
        const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences || '{}') : (user.preferences || {});
        const token = localStorage.getItem('mememint_token');
        if (token) {
          const merged = { ...prefs, network: n };
          fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ preferences: merged }),
          }).then(r => r.ok ? r.json() : null).then(d => {
            if (d?.user) {
              localStorage.setItem('mememint_auth', JSON.stringify(d.user));
            }
          }).catch(() => {});
        }
      }
    } catch {}

    if (switchNetwork) {
      try {
        switchNetwork(n === 'mainnet' ? solana : solanaDevnet);
      } catch {}
    }
  }, [switchNetwork]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
