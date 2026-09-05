import './styles/globals.css';
import './styles/components.css';
import { AppKitProvider } from './providers/AppKitProvider';
import { TokenProvider } from './providers/TokenProvider';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export const metadata = {
  title: 'MemeMint — Launch Your Solana Meme Coin in 60 Seconds',
  description: 'Create and deploy SPL tokens on Solana with on-chain metadata. No coding required. Only 0.1 SOL all-in. Powered by Token-2022.',
  keywords: ['solana', 'meme coin', 'spl token', 'token-2022', 'token creator', 'crypto'],
  openGraph: {
    title: 'MemeMint — Solana Meme Coin Launcher',
    description: 'Create your own SPL token on Solana in 60 seconds. No code required.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <AppKitProvider>
          <ToastProvider>
            <TokenProvider>
              <Navbar />
              <main style={{ minHeight: '100vh' }}>
                {children}
              </main>
              <Footer />
            </TokenProvider>
          </ToastProvider>
        </AppKitProvider>
      </body>
    </html>
  );
}
