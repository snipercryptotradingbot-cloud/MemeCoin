import { Connection } from '@solana/web3.js';

const RPC_URLS = {
  mainnet: process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET,
  devnet: process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET,
};

/**
 * Get a Solana connection for the specified network
 */
export function getConnection(network = 'devnet') {
  const url = RPC_URLS[network];
  if (!url) throw new Error(`Unknown network: ${network}`);
  return new Connection(url, 'confirmed');
}

/**
 * Get the default network from environment
 */
export function getDefaultNetwork() {
  return process.env.NEXT_PUBLIC_DEFAULT_NETWORK || 'devnet';
}

/**
 * Build a Solscan explorer URL
 */
export function getExplorerUrl(address, type = 'account', network = 'devnet') {
  const base = 'https://solscan.io';
  const cluster = network === 'devnet' ? '?cluster=devnet' : '';

  switch (type) {
    case 'tx':
      return `${base}/tx/${address}${cluster}`;
    case 'token':
      return `${base}/token/${address}${cluster}`;
    case 'account':
    default:
      return `${base}/account/${address}${cluster}`;
  }
}

/**
 * Shorten a Solana address for display
 */
export function shortenAddress(address, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
  if (!num) return '0';
  return Number(num).toLocaleString('en-US');
}

/**
 * Format SOL amount
 */
export function formatSol(lamports) {
  return (lamports / 1e9).toFixed(4);
}

/**
 * Get platform fee in lamports
 */
export function getPlatformFeeLamports() {
  const fee = parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || '0.1');
  return Math.floor(fee * 1e9);
}

/**
 * Build a tweet sharing URL
 */
export function getShareTweetUrl(tokenName, tokenSymbol, mintAddress, network) {
  const explorerUrl = getExplorerUrl(mintAddress, 'token', network);
  const text = `I just launched $${tokenSymbol} (${tokenName}) on Solana using MemeMint!\n\nCheck it out: ${explorerUrl}\n\n#Solana #MemeCoin #SPLToken`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
