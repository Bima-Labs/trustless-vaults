import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import type { BtcWalletState, EvmWalletState } from '../types';
import { View } from '../types';
import UserPanel from '../components/UserPanel';
import AdminPanel from '../components/AdminPanel';
import { ADMIN_EVM_ADDRESS } from '../constants';

interface AppProps {
  btcWalletState: BtcWalletState;
  evmWalletState: EvmWalletState;
  setBtcWalletState: React.Dispatch<React.SetStateAction<BtcWalletState>>;
  setEvmWalletState: React.Dispatch<React.SetStateAction<EvmWalletState>>;
}

const HomePage: NextPage<AppProps> = ({ btcWalletState, evmWalletState, setBtcWalletState, setEvmWalletState }) => {
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

  return (
    <div className="min-h-screen">
       <Head>
        <title>Trustless Vault</title>
        <meta name="description" content="Stake tBTC and wBTC for dividends across chains" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="main-container"> 
        {currentView === View.USER && <UserPanel btcWalletState={btcWalletState} evmWalletState={evmWalletState} setBtcWalletState={setBtcWalletState} setEvmWalletState={setEvmWalletState} />}
        {currentView === View.ADMIN && isAdmin && <AdminPanel />}
      </main>
    </div>
  );
};

export default HomePage;
