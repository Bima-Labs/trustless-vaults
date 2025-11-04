import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import type { BtcWalletState, EvmWalletState } from '../types';
import { View } from '../types';
import Header from '../components/Header';
import UserPanel from '../components/UserPanel';
import AdminPanel from '../components/AdminPanel';
import { ADMIN_EVM_ADDRESS } from '../constants';

const HomePage: NextPage = () => {
  const [btcWalletState, setBtcWalletState] = useState<BtcWalletState>({ connected: false, address: null });
  const [evmWalletState, setEvmWalletState] = useState<EvmWalletState>({ connected: false, address: null });
  const [currentView, setCurrentView] = useState<View>(View.USER);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for admin status when EVM wallet connects
  useEffect(() => {
    if (evmWalletState.connected && evmWalletState.address) {
      setIsAdmin(evmWalletState.address.toLowerCase() === ADMIN_EVM_ADDRESS);
    } else {
      setIsAdmin(false);
      setCurrentView(View.USER); // Revert to user view if admin disconnects
    }
  }, [evmWalletState]);

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
    <div className="text-white min-h-screen">
       <Head>
        <title>MultiChain Vault</title>
        <meta name="description" content="Stake tBTC and wBTC for dividends across chains" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header
        btcWalletState={btcWalletState}
        setBtcWalletState={setBtcWalletState}
        evmWalletState={evmWalletState}
        setEvmWalletState={setEvmWalletState}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isAdmin={isAdmin}
      />
      <main> 
        {currentView === View.USER && <UserPanel btcWalletState={btcWalletState} evmWalletState={evmWalletState} onDisconnect={async () => {
          // Disconnect UniSat
          if (window.unisat) {
            // UniSat doesn't have a direct disconnect method, but clearing accounts effectively disconnects
            setBtcWalletState({ connected: false, address: null });
          }
          // Disconnect EVM wallet (MetaMask)
          if (window.ethereum) {
            setEvmWalletState({ connected: false, address: null });
          }
        }} />}
        {currentView === View.ADMIN && isAdmin && <AdminPanel />}
      </main>
    </div>
  );
};

export default HomePage;
