import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { useTheme } from 'next-themes';
import Wallet from './Wallet';
import { BtcWalletState } from '../types';
import Button from './Button';

interface NavbarProps {
  btcWalletState: BtcWalletState;
  setBtcWalletState: React.Dispatch<React.SetStateAction<BtcWalletState>>;
}

const Navbar: React.FC<NavbarProps> = ({ btcWalletState, setBtcWalletState }) => {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  return (
    <nav className="bg-light-background/50 dark:bg-dark-background/50 backdrop-blur-sm border-b border-accent-light dark:border-accent-dark sticky top-0 z-10">
      <div className="main-container">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-light-text dark:text-dark-text whitespace-nowrap">
              <span className="text-orange-500">Trustless</span> Vault
            </Link>
            
          </div>
          <div className="flex items-center space-x-4">
            <Wallet btcWalletState={btcWalletState} setBtcWalletState={setBtcWalletState} />

            <div className="hidden md:flex items-center space-x-4">
              <Button href="/app" variant="secondary">
                Dashboard
              </Button>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-light-text dark:text-dark-text hover:text-orange-500 focus:outline-none"
            >
              
              {isMounted && theme === 'dark' ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
