'use client';

import { useNetwork } from '@/app/providers/NetworkProvider';

export default function NetworkBadge({ network: networkProp }) {
  const { network: contextNetwork } = useNetwork();
  const network = networkProp || contextNetwork;
  const isMainnet = network === 'mainnet' || network === 'mainnet-beta';

  return (
    <span className={`badge ${isMainnet ? 'badge-warning' : 'badge-success'}`} id="network-badge">
      <span className="network-dot" />
      {isMainnet ? 'Mainnet' : 'Devnet'}

      <style jsx>{`
        .network-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background: currentColor;
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}
