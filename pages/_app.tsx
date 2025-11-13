import type { AppProps } from 'next/app';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes'; // This is the correct provider to use
import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import type { BtcWalletState, EvmWalletState } from '../types';
// Make sure you have a globals.css file with Tailwind directives.
// e.g., @tailwind base; @tailwind components; @tailwind utilities;
import '../styles/globals.css'; 

// 1. Create a Wagmi config
const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

// 2. Create a TanStack Query client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const [btcWalletState, setBtcWalletState] = useState<BtcWalletState>({ connected: false, address: null });
  const [evmWalletState, setEvmWalletState] = useState<EvmWalletState>({ connected: false, address: null });

  // Try to reconnect wallets on page load
  useEffect(() => {
    const checkConnections = async () => {
      // Check UniSat
      if (window.unisat) {
        try {
          const accounts = await window.unisat.getAccounts();
          if (accounts.length > 0) {
            setBtcWalletState({ connected: true, address: accounts[0] });
          }
        } catch (e) { console.error("Could not get UniSat accounts", e) }
      }
      // Check EVM wallet
      if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                setEvmWalletState({ connected: true, address: accounts[0] });
            }
        } catch (e) { console.error("Could not get EVM accounts", e) }
      }
    };
    checkConnections();

    // Listener for account changes in EVM wallet
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setEvmWalletState({ connected: true, address: accounts[0] });
      } else {
        setEvmWalletState({ connected: false, address: null });
      }
    };

    if (window.ethereum?.on) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
        if (window.ethereum?.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
    }

  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class">
          <Navbar btcWalletState={btcWalletState} setBtcWalletState={setBtcWalletState} />
          <Component {...pageProps} btcWalletState={btcWalletState} evmWalletState={evmWalletState} setBtcWalletState={setBtcWalletState} setEvmWalletState={setEvmWalletState} />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
