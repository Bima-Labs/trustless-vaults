import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { BtcWalletState } from '../types'; // Assuming EvmWalletState is handled by wagmi internal state now
import Link from 'next/link';
import { ADMIN_WALLETS } from '../lib/admin';

// 1. Add global type definition for UniSat to fix TS errors
declare global {
  interface Window {
    unisat: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getNetwork: () => Promise<'livenet' | 'testnet'>;
      switchNetwork: (network: 'livenet' | 'testnet') => Promise<void>;
      sendBitcoin: (to: string, satoshis: number, options?: { feeRate: number }) => Promise<string>;
      
    };
  }
}

interface WalletProps {
  btcWalletState: BtcWalletState;
  setBtcWalletState: React.Dispatch<React.SetStateAction<BtcWalletState>>;
}

const Wallet: React.FC<WalletProps> = ({ btcWalletState, setBtcWalletState }) => {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const isAdmin = useMemo(() => {
    return evmAddress && ADMIN_WALLETS.includes(evmAddress.toLowerCase());
  }, [evmAddress]);

  // 2. Get connectors and the connect function
  const { connectors, connect } = useConnect();

  const [btcLoading, setBtcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Function to specifically find and connect to MetaMask
  const connectMetaMask = () => {
    // In Wagmi v2, we find the connector instance from the list
    const metaMaskConnector = connectors.find((c) => c.name === 'MetaMask');
    
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    } else {
      // Fallback: Try to connect to the first 'injected' connector if MetaMask isn't explicitly named
      const injected = connectors.find((c) => c.id === 'injected');
      if (injected) {
        connect({ connector: injected });
      } else {
        setError('MetaMask connector not found.');
      }
    }
  };

  const connectBtcWallet = async () => {
    setBtcLoading(true);
    setError(null);

    if (typeof window.unisat === 'undefined') {
      setError('UniSat Wallet not found. Please install it.');
      setBtcLoading(false);
      return;
    }

    try {
      const network = await window.unisat.getNetwork();
      if (network !== 'testnet') {
        await window.unisat.switchNetwork('testnet');
      }
      const accounts = await window.unisat.requestAccounts();
      if (accounts.length > 0) {
        setBtcWalletState({ connected: true, address: accounts[0] });
      }
    } catch (err) {
      console.error('Failed to connect UniSat wallet:', err);
      setError('Failed to connect UniSat. Please try again.');
    } finally {
      setBtcLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
      {!isMounted ? null : (
        <>
          {isEvmConnected ? (
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">EVM:</p>
              <p className="text-sm font-mono">
                {evmAddress ? `${evmAddress.substring(0, 6)}...${evmAddress.substring(evmAddress.length - 4)}` : ''}
              </p>
              <button onClick={() => disconnect()} className="text-xs text-red-500 hover:underline">
                (Disconnect)
              </button>
            </div>
          ) : (
            <button onClick={connectMetaMask} className="btn-secondary">
              Connect MetaMask
            </button>
          )}

          {btcWalletState.connected ? (
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">BTC:</p>
              <p className="text-sm font-mono">
                {btcWalletState.address 
                  ? `${btcWalletState.address.substring(0, 6)}...${btcWalletState.address.substring(btcWalletState.address.length - 4)}`
                  : ''}
              </p>
              <button onClick={() => setBtcWalletState({ connected: false, address: null })} className="text-xs text-red-500 hover:underline">
                (Disconnect)
              </button>
            </div>
          ) : (
            <button onClick={connectBtcWallet} className="btn-secondary" disabled={btcLoading}>
              {btcLoading ? 'Connecting...' : 'Connect UniSat'}
            </button>
          )}

          {isAdmin && (
            <Link href="/admin" className="btn-primary text-sm">
              Admin
            </Link>
          )}
        </>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default Wallet;