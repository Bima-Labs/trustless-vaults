import React, { useState } from 'react';
import type { BtcWalletState, EvmWalletState } from '../types';
import { View } from '../types';
import { WalletIcon, SpinnerIcon, MetamaskIcon } from './icons';

interface HeaderProps {
  btcWalletState: BtcWalletState;
  setBtcWalletState: React.Dispatch<React.SetStateAction<BtcWalletState>>;
  evmWalletState: EvmWalletState;
  setEvmWalletState: React.Dispatch<React.SetStateAction<EvmWalletState>>;
  currentView: View;
  setCurrentView: (view: View) => void;
  isAdmin: boolean;
}

const WalletButton: React.FC<{
  onClick: () => void;
  isLoading: boolean;
  loadingText: string;
  idleText: string;
  icon: React.ReactNode;
  bgColor: string;
}> = ({ onClick, isLoading, loadingText, idleText, icon, bgColor }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`flex items-center justify-center ${bgColor} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-all duration-300 text-sm`}
  >
    {isLoading ? (
      <>
        <SpinnerIcon className="animate-spin h-5 w-5 mr-2" />
        {loadingText}
      </>
    ) : (
      <>
        {icon}
        {idleText}
      </>
    )}
  </button>
);

const Header: React.FC<HeaderProps> = ({ 
  btcWalletState, setBtcWalletState, 
  evmWalletState, setEvmWalletState, 
  currentView, setCurrentView, isAdmin
}) => {
  const [btcLoading, setBtcLoading] = useState(false);
  const [evmLoading, setEvmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (accounts.length > 0) setBtcWalletState({ connected: true, address: accounts[0] });
    } catch (err) {
      console.error('Failed to connect UniSat wallet:', err);
      setError('Failed to connect UniSat. Please try again.');
    } finally {
      setBtcLoading(false);
    }
  };

  const connectEvmWallet = async () => {
    setEvmLoading(true);
    setError(null);
    if (typeof window.ethereum === 'undefined') {
      setError('EVM Wallet not found. Please install MetaMask or a similar extension.');
      setEvmLoading(false);
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) setEvmWalletState({ connected: true, address: accounts[0] });
    } catch (err) {
      console.error('Failed to connect EVM wallet:', err);
      setError('Failed to connect EVM wallet. Please try again.');
    } finally {
      setEvmLoading(false);
    }
  };

  const NavButton: React.FC<{ view: View; label: string }> = ({ view, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        currentView === view ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  const AddressPill: React.FC<{ address: string | null; icon: React.ReactNode }> = ({ address, icon }) => (
    <div className="flex items-center bg-gray-700 px-3 py-2 rounded-full text-sm font-mono">
      {icon}
      {`${address?.substring(0, 6)}...${address?.substring(address.length - 4)}`}
    </div>
  );

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-white whitespace-nowrap">
              <span className="text-blue-400">MultiChain</span> Vault
            </h1>
            <nav className="hidden md:flex items-center space-x-2 bg-gray-900/50 p-1 rounded-lg">
              <NavButton view={View.USER} label="Stake" />
              {isAdmin && <NavButton view={View.ADMIN} label="Admin Panel" />}
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            {btcWalletState.connected ? (
              <AddressPill address={btcWalletState.address} icon={<WalletIcon className="h-4 w-4 mr-2 text-yellow-400" />} />
            ) : (
              <WalletButton onClick={connectBtcWallet} isLoading={btcLoading} loadingText="Connecting..." idleText="Connect UniSat" icon={<WalletIcon className="h-5 w-5 mr-2" />} bgColor="bg-yellow-600" />
            )}
            {evmWalletState.connected ? (
               <AddressPill address={evmWalletState.address} icon={<MetamaskIcon className="h-4 w-4 mr-2 text-orange-500" />} />
            ) : (
              <WalletButton onClick={connectEvmWallet} isLoading={evmLoading} loadingText="Connecting..." idleText="Connect EVM" icon={<MetamaskIcon className="h-5 w-5 mr-2" />} bgColor="bg-orange-600" />
            )}
          </div>
        </div>
        {error && <div className="text-center text-red-400 pb-2 text-sm">{error}</div>}
      </div>
    </header>
  );
};

export default Header;
