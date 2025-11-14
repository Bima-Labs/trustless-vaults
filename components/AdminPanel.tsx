import React, { useState, useEffect, useMemo } from 'react';
import type { Transaction } from '../types';
import { claimDividends, getTransactions } from '../services/api';
import { getBtcTx, getEvmTx } from '../services/explorer';
import ClaimModal from './ClaimModal';
import { CheckCircleIcon, ClockIcon, ExternalLinkIcon } from './icons';;
import { formatLargeNumber, getDurationLabel } from '../lib/format';
import { useWriteContract } from 'wagmi';
import vaultAbi from '../lib/assets/abi/WbtcStaking.json';
import { EVM_VAULT_ADDRESS } from '../constants';
import { useAccount } from 'wagmi';
import { ADMIN_WALLETS } from '../lib/admin';

const MEMPOOL_API_URL = 'https://mempool.space/testnet4/api';

const AdminPanel: React.FC = () => {
  const { address } = useAccount();

  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  if (!isAdmin) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Unauthorized Access</h2>
        <p className="text-foreground/70 dark:text-foreground-dark/70">You are not authorized to view this page. Please connect with an admin wallet.</p>
      </div>
    );
  }
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { writeContractAsync: buyBackWbtc } = useWriteContract();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e: any) {
      setError(e.message || 'Failed to fetch transactions.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleClaim = async () => {
    if (!selectedTx) return;

    if (selectedTx.asset === 'wBTC') {
      // This is a buyback action
      setIsClaiming(true);
      try {
        // Ensure stakeId exists for wBTC transactions before calling buyBack
        if (selectedTx.status.stakeId === undefined) {
          alert("Error: stakeId is missing for this wBTC transaction. Cannot perform buy back.");
          setIsClaiming(false);
          return;
        }
        await buyBackWbtc({
          address: EVM_VAULT_ADDRESS,
          abi: vaultAbi.abi,
          functionName: 'buyBack',
          args: [selectedTx.status.stakeId],
        });
        // You might want to wait for transaction confirmation before refetching
        await fetchTransactions();
        setSelectedTx(null);
      } catch (err) {
        alert(`Buy back failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsClaiming(false);
      }
      return;
    }

    // This is for tBTC distribution
    setIsClaiming(true);
    try {
      await claimDividends(selectedTx.id);
      // Re-fetch transactions to show the updated status
      fetchTransactions();
      setSelectedTx(null); // Close modal on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      alert(`Failed to claim dividends: ${errorMessage}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/transactions/refresh-prices', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to refresh prices.');
      }
      // Re-fetch transactions to show updated prices
      await fetchTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      alert(`Error refreshing prices: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatuses = async () => {
    setIsRefreshing(true);
    try {
      const pendingTxs = transactions.filter(tx => !tx.status.confirmed);

      if (pendingTxs.length === 0) {
        alert("No pending transactions to update.");
        setIsRefreshing(false);
        return;
      }

      const confirmationPromises = pendingTxs.map(async (tx) => {
        let isConfirmed = false;
        try {
          if (tx.asset === 'tBTC' && tx.network === 'Bitcoin Testnet') {
            const btcTxDetails = await getBtcTx(tx.txId);
            if (btcTxDetails?.status.confirmed) {
              isConfirmed = true;
            }
          } else if (tx.network === 'EVM Testnet') {
            const evmTxDetails = await getEvmTx(tx.txId);
            if (evmTxDetails && evmTxDetails.blockNumber && evmTxDetails.isError === '0') {
              isConfirmed = true;
            }
          }

          if (isConfirmed) {
            const response = await fetch(`/api/transactions/${tx.id}/confirm`, {
              method: 'POST',
            });
            if (!response.ok) {
              console.error(`Failed to update status for tx: ${tx.id}`);
            }
          }
        } catch (err) {
          console.error(`Error checking status for tx ${tx.txId}:`, err);
        }
      });

      await Promise.all(confirmationPromises);

      // Re-fetch all transactions to show updated statuses
      await fetchTransactions();
      alert(
        `Status check complete. Refreshed transaction list.`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      alert(`Error updating statuses: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getExplorerUrl = (tx: Transaction) => {
    if (tx.network === 'Bitcoin Testnet') {
      return `${MEMPOOL_API_URL.replace('/api', '')}/tx/${tx.txId}`;
    }
    return `https://sepolia.etherscan.io/tx/${tx.txId}`;
  };

  const isLockPeriodOver = (tx: Transaction): boolean => {
    const lockEndDate = new Date(tx.timestamp);
    const durationInMs = tx.lockDurationDays * 24 * 60 * 60 * 1000;
    lockEndDate.setTime(lockEndDate.getTime() + durationInMs);
    return Date.now() >= lockEndDate.getTime();
  };

  const isActionable = (tx: Transaction): boolean => {
    // An action can be taken if the transaction is confirmed and not yet claimed.
    return tx.status.confirmed && !tx.claimed;
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) {
      return transactions;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return transactions.filter(tx =>
      tx.userAddress?.toLowerCase().includes(lowercasedQuery) ||
      tx.userEvmAddress?.toLowerCase().includes(lowercasedQuery) ||
      tx.txId.toLowerCase().includes(lowercasedQuery)
    );
  }, [transactions, searchQuery]);

  if (loading) return <div className="text-center py-4">Loading transactions...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>;

  return (
    <div className="card">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
          <input
            type="text"
            placeholder="Search by address or TxID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-full bg-accent/50 dark:bg-accent-dark/20 border border-transparent focus:ring-2 focus:ring-primary-dark focus:outline-none"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            className="btn-secondary"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
          <button
            onClick={handleUpdateStatuses}
            disabled={isRefreshing}
            className="btn-primary"
          >
            {isRefreshing ? 'Updating...' : 'Refresh Statuses'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground/80 dark:text-foreground-dark/80">
          <thead className="text-xs text-foreground/70 dark:text-foreground-dark/70 uppercase bg-accent/50 dark:bg-accent-dark/20">
            <tr>
              <th scope="col" className="px-6 py-3">User</th>
              <th scope="col" className="px-6 py-3">Asset</th>
              <th scope="col" className="px-6 py-3">Amount</th>
              <th scope="col" className="px-6 py-3">BTC Price @ Tx</th>
              <th scope="col" className="px-6 py-3">Stake Date</th>
              <th scope="col" className="px-6 py-3">Duration</th>
              <th scope="col" className="px-6 py-3">Confirmation Status</th>
              <th scope="col" className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-accent dark:border-accent-dark hover:bg-accent/50 dark:hover:bg-accent-dark/20 transition-colors">
                <td className="px-6 py-4 font-mono text-xs" title={tx.userAddress}>
                  <div className="flex items-center">
                    <span>{`${tx.userAddress.substring(0, 10)}...${tx.userAddress.substring(tx.userAddress.length - 4)}`}</span>
                    <a href={getExplorerUrl(tx)} target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-500 hover:text-orange-400">
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4">{tx.asset}</td>
                <td className="px-6 py-4">{tx.amount}</td>
                <td className="px-6 py-4 font-mono">
                  ${tx.btcPriceAtTx > 0 ? formatLargeNumber(tx.btcPriceAtTx) : 'N/A'}
                </td>
                <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4">{getDurationLabel(tx.lockDurationDays)}</td>
                <td className="px-6 py-4">
                  {tx.status.confirmed ? (
                    <span className="flex items-center text-green-400"><CheckCircleIcon className="h-4 w-4 mr-1" /> Confirmed</span>
                  ) : (
                    <span className="flex items-center text-yellow-400"><ClockIcon className="h-4 w-4 mr-1" /> Pending</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    if (tx.claimed) {
                      return <button disabled className="bg-gray-400 dark:bg-gray-600 text-white font-bold py-1 px-3 text-xs rounded-md cursor-not-allowed">Done</button>;
                    }
                    if (!tx.status.confirmed) { // Common for both
                      return <button disabled className="bg-gray-400 dark:bg-gray-600 text-white font-bold py-1 px-3 text-xs rounded-md cursor-not-allowed">Pending</button>;
                    }
                    if (tx.asset === 'wBTC') {
                      return (
                        <button onClick={() => setSelectedTx(tx)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-xs rounded-md transition-colors">
                          Buy Back
                        </button>
                      );
                    }
                    // For tBTC
                    if (isLockPeriodOver(tx)) {
                      return <button onClick={() => setSelectedTx(tx)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 text-xs rounded-md transition-colors">Distribute</button>;
                    } else {
                      return <button onClick={() => setSelectedTx(tx)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 text-xs rounded-md transition-colors">Buy Back</button>;
                    }
                  })()}
                </td>
              </tr>
            ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-foreground/70 dark:text-foreground-dark/70">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedTx && (
        <ClaimModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onConfirm={handleClaim}
          isClaiming={isClaiming}
        />
      )}
    </div>
  );
};

export default AdminPanel;