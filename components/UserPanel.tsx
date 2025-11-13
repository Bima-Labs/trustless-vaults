import React, { useState, useEffect, useCallback } from 'react';
import type { BtcWalletState, EvmWalletState, TxProgress, Transaction } from '../types';
import { FEE_RATE, WBTC_TOKEN_ADDRESS, EVM_VAULT_ADDRESS, EVM_NETWORK_ID, FIVE_MINUTES_IN_DAYS } from '../constants';
import { parseUnits } from 'ethers';
import { getVaultAddresses, createTransaction, getTransactions } from '../services/api';
import  wbtcAbi  from'../lib/assets/abi/TestWBTC.json';
import { useAccount, useBalance, useReadContract, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import vaultAbi from '../lib/assets/abi/WbtcStaking.json';

import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ExternalLinkIcon, ClockIcon } from './icons';
import { getBtcTx, getEvmTx } from '../services/explorer';

const MEMPOOL_API_URL = 'https://mempool.space/testnet4/api';

interface UserPanelProps {
  btcWalletState: BtcWalletState;
  evmWalletState: EvmWalletState;
  setBtcWalletState: React.Dispatch<React.SetStateAction<BtcWalletState>>;
  setEvmWalletState: React.Dispatch<React.SetStateAction<EvmWalletState>>;
}

const LOCK_DURATIONS = [7, 30, 365, 730, 1095];
const DURATION_LABELS: { [key: number]: string } = {
  7: '7 Days',
  30: '30 Days',
  365: '1 Year',
  730: '2 Years',
  1095: '3 Years',
};

const UserPanel: React.FC<UserPanelProps> = ({ btcWalletState, evmWalletState, setBtcWalletState, setEvmWalletState }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Wagmi hooks for EVM wallet state and actions
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { chains, switchChain } = useSwitchChain();

  const [selectedAsset, setSelectedAsset] = useState<'tBTC' | 'wBTC'>('tBTC');
  const [amount, setAmount] = useState('');
  const [lockDuration, setLockDuration] = useState(LOCK_DURATIONS[0]);
  const [vaultAddresses, setVaultAddresses] = useState<{ btc: string; evm: string } | null>(null);
  const [txProgress, setTxProgress] = useState<TxProgress>({ status: 'idle', txId: null, message: '', asset: null });
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wagmi hooks for fetching balances
  const { data: wbtcBalanceData, isLoading: isLoadingWbtcBalance } = useBalance({
    address: evmAddress,
    token: WBTC_TOKEN_ADDRESS,
    query: { enabled: isEvmConnected && !!evmAddress },
  });
  const [btcBalance, setBtcBalance] = useState('0');

  const { writeContractAsync: approveWbtc } = useWriteContract();
  const { writeContractAsync: stakeWbtc } = useWriteContract();

  const [evmTxHash, setEvmTxHash] = useState<`0x${string}` | undefined>();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: evmTxHash,
    query: {
      enabled: !!evmTxHash,
    }
  });

  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const addresses = await getVaultAddresses();
        setVaultAddresses(addresses);
      } catch (err) {
        setError('Could not fetch vault addresses. Please refresh.');
        console.error(err);
      }
    };
    fetchVaults();
  }, []);

  const fetchUserTransactions = useCallback(async () => {
      if (!btcWalletState.address && !evmAddress) {
          setUserTransactions([]);
          setLoadingTxs(false);
          return;
      }
      setLoadingTxs(true);
      try {
          const allTxs = await getTransactions();
          const filteredTxs = allTxs.filter(tx => 
              (btcWalletState.address && tx.userAddress?.toLowerCase() === btcWalletState.address.toLowerCase()) ||
              (evmAddress && tx.userEvmAddress?.toLowerCase() === evmAddress.toLowerCase())
          );
          setUserTransactions(filteredTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (err) {
          setError("Failed to fetch user's transactions.");
          console.error(err);
      } finally {
          setLoadingTxs(false);
      }
  }, [btcWalletState.address, evmAddress]);

  useEffect(() => {
    fetchUserTransactions();
    const fetchBalances = async () => {
      setLoadingBalances(true);
      try {
        if (btcWalletState.connected && window.unisat) {
          // Fetch tBTC balance using Mempool API
          try {
            const response = await fetch(`${MEMPOOL_API_URL}/address/${btcWalletState.address}/utxo`);
            if (!response.ok) {
              throw new Error(`Mempool API error: ${response.statusText}`);
            }
            const utxos = await response.json();
            const totalSatoshis = utxos.reduce((sum: number, utxo: { value: number }) => sum + utxo.value, 0);
            setBtcBalance((totalSatoshis / 1e8).toFixed(8)); // Convert satoshis to BTC
          } catch (err) {
            console.error("Failed to fetch tBTC balance from Mempool API:", err);
            // Don't show an error to the user, just log it.
          }
        }
      } catch (err) {
        console.error("Failed to fetch balances:", err);
        // Don't show an error to the user, just log it.
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();

  }, [fetchUserTransactions, btcWalletState.connected, isEvmConnected, btcWalletState.address]);

  useEffect(() => {
    if (isConfirming) {
      setTxProgress({ status: 'pending', txId: evmTxHash ?? null, message: 'Waiting for blockchain confirmation...', asset: 'wBTC' });
    }
    if (isConfirmed) {
      setTxProgress({ status: 'confirmed', txId: evmTxHash ?? null, message: 'Transaction confirmed! Stake is active.', asset: 'wBTC' });
      fetchUserTransactions(); // Refresh user transactions list
      setEvmTxHash(undefined); // Reset for next transaction
      setTimeout(() => setTxProgress({ status: 'idle', txId: null, message: '', asset: null }), 5000);
    }
    // We could also handle isError here to show a failure message
  }, [isConfirming, isConfirmed, evmTxHash, fetchUserTransactions]);


  const pollForConfirmation = useCallback(async (txId: string, asset: 'tBTC' | 'wBTC') => {
    setTxProgress({ status: 'pending', txId, message: 'Waiting for blockchain confirmation...', asset });

    const interval = setInterval(async () => {
      try {
        let confirmed = false;
        if (asset === 'tBTC') {
          const btcTx = await getBtcTx(txId);
          if (btcTx?.status.confirmed) confirmed = true;
        } else { // wBTC
          const evmTx = await getEvmTx(txId);
          if (evmTx && evmTx.blockNumber && evmTx.isError === '0') confirmed = true;
        }

        if (confirmed) {
          clearInterval(interval);
          setTxProgress({ status: 'confirmed', txId, message: 'Transaction confirmed! Stake is active.', asset });
          fetchUserTransactions(); // Refresh user transactions list
          setTimeout(() => setTxProgress({ status: 'idle', txId: null, message: '', asset: null }), 5000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Keep polling
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [fetchUserTransactions]);

  const handleStake = async () => {
    setError(null);
    const stakeAmount = parseFloat(amount);

    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!btcWalletState.connected || !btcWalletState.address || !isEvmConnected || !evmAddress) {
      setError('Both UniSat and EVM wallets must be connected to stake.');
      return;
    }
    if (!vaultAddresses) {
      setError('Vault addresses not loaded. Please wait or refresh.');
      return;
    }

    setTxProgress({ status: 'pending', txId: null, message: 'Please approve the transaction in your wallet...', asset: selectedAsset });

    try {
      let txId: string;
      if (selectedAsset === 'tBTC') {
        const satoshis = Math.floor(stakeAmount * 100_000_000);
        if (typeof window.unisat === 'undefined') throw new Error('UniSat Wallet not found.');
        txId = await window.unisat.sendBitcoin(vaultAddresses.btc, satoshis, { feeRate: FEE_RATE });
      } else { // wBTC
        if (typeof window.ethereum === 'undefined') throw new Error('EVM Wallet not found.');
        
        const chainId = chains.find(c => c.id === parseInt(EVM_NETWORK_ID, 10))?.id;
        if (!chainId) {
          throw new Error('Sepolia network not configured in wagmi.');
        }
        switchChain({ chainId });

        const decimals = wbtcBalanceData?.decimals ?? 18;
        const amountInSmallestUnit = parseUnits(amount, decimals);

        setTxProgress({ status: 'pending', txId: null, message: 'Approving wBTC transfer...', asset: selectedAsset });
        const approveHash = await approveWbtc({
          address: WBTC_TOKEN_ADDRESS,
          abi: wbtcAbi.abi,
          functionName: 'approve',
          args: [EVM_VAULT_ADDRESS, amountInSmallestUnit],
        });

        // You might want a more robust way to wait for confirmations
        await new Promise(res => setTimeout(res, 5000)); // Simple wait

        setTxProgress({ status: 'pending', txId: null, message: 'Staking wBTC...', asset: selectedAsset });

        let option;
        if (lockDuration > 5) {
          option = 0;
        } else {
          option = 1;
        }

        const stakeHash = await stakeWbtc({
          address: EVM_VAULT_ADDRESS,
          abi: vaultAbi.abi,
          functionName: 'stake',
          args: [amountInSmallestUnit, option],
        });
        txId = stakeHash;
        setEvmTxHash(stakeHash); // Start waiting for the receipt
      }
      
      setTxProgress({ status: 'pending', txId, message: 'Transaction sent. Waiting for confirmation...', asset: selectedAsset });

      // Save transaction to our backend
      await createTransaction({
        userAddress: btcWalletState.address,
        userEvmAddress: evmAddress,
        lockDurationDays: lockDuration,
        txId,
        amount: stakeAmount,
        asset: selectedAsset,
        btcPriceAtTx: 0,
        network: selectedAsset === 'tBTC' ? 'Bitcoin Testnet' : 'EVM Testnet',
        status: { confirmed: false }
      });
      
      // Start polling for on-chain confirmation only for BTC
      if (selectedAsset === 'tBTC') {
        pollForConfirmation(txId, selectedAsset);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Transaction failed: ${errorMessage}`);
      setTxProgress({ status: 'failed', txId: null, message: `Transaction failed.`, asset: selectedAsset });
      console.error(err);
    }
  };
  
  const getExplorerUrl = (tx: Transaction | { txId: string, asset: 'tBTC' | 'wBTC' }) => {
      if (!tx.txId) return '#';
      const network = (tx as Transaction).network;
      if (network === 'Bitcoin Testnet' || (!network && tx.asset === 'tBTC')) {
          return `${MEMPOOL_API_URL.replace('/api', '')}/tx/${tx.txId}`;
      }
      return `https://sepolia.etherscan.io/tx/${tx.txId}`;
  };

  const isWalletConnected = btcWalletState.connected && isEvmConnected;

  return (
    <div className="flex flex-wrap lg:flex-nowrap gap-8">
      {/* Staking Panel */}
      <div className="w-full lg:w-1/3">
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Stake Your Assets</h2>
          
          {/* Asset Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Asset</label>
            <div className="flex bg-gray-200 dark:bg-gray-900/50 p-1 rounded-lg">
              <button onClick={() => setSelectedAsset('tBTC')} className={`w-1/2 py-2 text-sm rounded-md transition-colors ${selectedAsset === 'tBTC' ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                tBTC
              </button>
              <button onClick={() => setSelectedAsset('wBTC')} className={`w-1/2 py-2 text-sm rounded-md transition-colors ${selectedAsset === 'wBTC' ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                wBTC
              </button>
            </div>
          </div>

          {/* Balances Display */}
          <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Your tBTC Balance:</span>
              <span className="font-mono">{loadingBalances ? '...' : `${parseFloat(btcBalance).toFixed(6)} tBTC`}</span>
            </div>
            <div className="flex justify-between">
              <span>Your wBTC Balance:</span>
              <span className="font-mono">{isMounted && isLoadingWbtcBalance ? '...' : `${wbtcBalanceData?.formatted.substring(0, 8) ?? '0.00'} wBTC`}</span>
            </div>
          </div>
          {/* Amount Input */}
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount to Stake</label>
            <input 
              type="number" 
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" 
              className="w-full bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Lock Duration */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lock Duration</label>
            <div className="flex space-x-2">
              {LOCK_DURATIONS.map(days => (
                <button key={days} onClick={() => setLockDuration(days)} className={`flex-1 py-2 text-sm rounded-md transition-all ${lockDuration === days ? 'bg-orange-500 text-white ring-2 ring-orange-400' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>
                  {DURATION_LABELS[days] || `${days} days`}
                </button>
              ))}
            </div>
          </div>

          {/* Stake Button */}
          <button
            onClick={handleStake}
            disabled={!isWalletConnected || txProgress.status === 'pending' || txProgress.status === 'confirmed'}
            className="w-full btn-primary flex items-center justify-center"
          >
            {txProgress.status === 'pending' ? <SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> : null}
            {!isWalletConnected ? 'Connect Wallets to Stake' : 'Stake Now'}
          </button>

          {isWalletConnected && (
            <button
              onClick={() => {
                setBtcWalletState({ connected: false, address: null });
                setEvmWalletState({ connected: false, address: null });
              }}
              className="w-full mt-3 btn-secondary"
            >
              Disconnect Wallets
            </button>
          )}

          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
          
          {/* Transaction Progress */}
          {txProgress.status !== 'idle' && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-black/20 rounded-lg border border-gray-300 dark:border-white/10">
              <div className="flex items-center">
                {txProgress.status === 'pending' && <SpinnerIcon className="animate-spin h-5 w-5 mr-3 text-orange-500" />}
                {txProgress.status === 'confirmed' && <CheckCircleIcon className="h-5 w-5 mr-3 text-green-400" />}
                {txProgress.status === 'failed' && <XCircleIcon className="h-5 w-5 mr-3 text-red-400" />}
                <p className="text-sm text-gray-700 dark:text-white">{txProgress.message}</p>
              </div>
              {txProgress.txId && txProgress.asset && (
                <a href={getExplorerUrl({txId: txProgress.txId, asset: txProgress.asset})} target="_blank" rel="noopener noreferrer" className="text-orange-500 text-xs mt-2 hover:underline flex items-center">
                  View on explorer <ExternalLinkIcon className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Transactions */}
      <div className="w-full lg:w-2/3">
         <div className="card">
           <h3 className="text-xl font-bold mb-6">Your Stakes</h3>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                  <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                          <th scope="col" className="px-6 py-3">Asset</th>
                          <th scope="col" className="px-6 py-3">Amount</th>
                          <th scope="col" className="px-6 py-3">Date</th>
                          <th scope="col" className="px-6 py-3">Duration</th>
                          <th scope="col" className="px-6 py-3">Dividend Status</th>
                          <th scope="col" className="px-6 py-3">Tx</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loadingTxs ? (
                        <tr><td colSpan={6} className="text-center py-8">Loading your transactions...</td></tr>
                      ) : userTransactions.length > 0 ? (
                          userTransactions.map(tx => (
                              <tr key={tx.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                  <td className="px-6 py-4 font-semibold">{tx.asset}</td>
                                  <td className="px-6 py-4">{tx.amount}</td>
                                  <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleDateString()}</td>
                                  <td className="px-6 py-4">{DURATION_LABELS[tx.lockDurationDays] || `${tx.lockDurationDays} days`}</td>
                                  <td className="px-6 py-4">
                                      {tx.claimed ? (
                                          <span className="flex items-center text-green-400"><CheckCircleIcon className="h-4 w-4 mr-1" /> Claimed</span>
                                      ) : (
                                          <span className="flex items-center text-yellow-400"><ClockIcon className="h-4 w-4 mr-1" /> Pending</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <a href={getExplorerUrl(tx)} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">
                                          <ExternalLinkIcon className="h-4 w-4" />
                                      </a>
                                  </td>
                              </tr>
                          ))
                      ) : (
                         <tr><td colSpan={6} className="text-center py-8">You have no staking history.</td></tr>
                      )}
                  </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default UserPanel;
