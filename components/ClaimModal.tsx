import React from 'react';
import type { Transaction } from '../types';
import { SpinnerIcon } from './icons';
import { getDurationLabel, formatTimeLeft } from '../lib/format';

interface ClaimModalProps {
  tx: Transaction;
  onClose: () => void;
  onConfirm: () => void;
  isClaiming: boolean;
}

const ClaimModal: React.FC<ClaimModalProps> = ({ tx, onClose, onConfirm, isClaiming }) => {
  // Determine if the lock duration has passed
  const lockEndDate = new Date(tx.timestamp);
  const durationInMs = tx.lockDurationDays * 24 * 60 * 60 * 1000;
  lockEndDate.setTime(lockEndDate.getTime() + durationInMs);
  const isLockPeriodOver = Date.now() >= lockEndDate.getTime();

  let payoutTitle: string;
  let tbtcReturnAmount: string | null = null;
  let evmDividend: string | null = null;

  if (tx.asset === 'wBTC') {
    payoutTitle = "Claim wBTC Dividends";
    evmDividend = "To be calculated and sent via smart contract.";
  } else { // tBTC
    payoutTitle = isLockPeriodOver ? "Normal Disbursement (Time Completed)" : "Early Buy-Back";
    tbtcReturnAmount = isLockPeriodOver ? tx.amount.toFixed(8) : (tx.amount / 2).toFixed(8);
    evmDividend = isLockPeriodOver ? '0.00' : ((tx.amount / 2) * tx.btcPriceAtTx).toFixed(2);
  }


  const handleConfirm = () => {
    onConfirm();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 modal-backdrop" onClick={onClose}>
      <div className="bg-gray-800 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-8 modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{payoutTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="space-y-4 text-sm">
            <div className="flex justify-between p-3 bg-black/20 rounded-md">
                <span className="text-gray-400">Beneficiary Address:</span>
                <span className="font-mono text-cyan-300">{tx.userEvmAddress}</span>
            </div>
            <div className="flex justify-between p-3 bg-black/20 rounded-md">
                <span className="text-gray-400">Original Stake:</span>
                <span className="font-semibold">{tx.amount} {tx.asset}</span>
            </div>
             <div className="flex justify-between p-3 bg-black/20 rounded-md">
                <span className="text-gray-400">Lock Duration:</span>
                <span className="font-semibold">{getDurationLabel(tx.lockDurationDays)}</span>
            </div>
            <div className="flex justify-between p-3 bg-black/20 rounded-md">
                <span className="text-gray-400">Time Remaining:</span>
                <span className="font-mono text-xs">{formatTimeLeft(lockEndDate)}</span>
            </div>
        </div>

        <hr className="border-gray-700 my-6" />

        <div className="space-y-6 ">
            <h3 className="text-lg font-semibold">{payoutTitle}</h3>
            {tbtcReturnAmount !== null && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      tBTC Principal Return {isLockPeriodOver ? '(100%)' : '(50%)'}
                    </label>
                    <div className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-gray-400">
                        {tbtcReturnAmount} tBTC 
                    </div>
                </div>
            )}
            {evmDividend !== null && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        EVM Asset Dividend (USDC)
                    </label>
                    <div className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white">
                        {tx.asset === 'tBTC' && isLockPeriodOver 
                        ? <span className="text-gray-500">None (Full BTC principal returned)</span>
                        : tx.asset === 'wBTC' ? evmDividend : `$${evmDividend}`
                        }
                    </div>
                </div>
            )}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                Cancel
            </button>
            <button 
                onClick={handleConfirm} 
                disabled={isClaiming}
                className="w-48 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-800/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-all duration-300"
            >
                {isClaiming ? <><SpinnerIcon className="animate-spin h-5 w-5 mr-3" />Processing...</> : 'Confirm & Send'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimModal;