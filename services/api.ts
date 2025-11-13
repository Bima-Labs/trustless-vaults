import type { Transaction } from '../types';

export const getVaultAddresses = async (): Promise<{ btc: string; evm: string }> => {
  const response = await fetch('/api/explorer/vault');
  if (!response.ok) throw new Error('Failed to fetch vault addresses');
  return response.json();
};

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch('/api/transactions');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch transactions');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const createTransaction = async (
    txData: Omit<Transaction, 'id' | 'timestamp' | 'claimed'>
): Promise<Transaction> => {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create transaction');
  }
  return response.json();
};


export const claimDividends = async (txId: string): Promise<Transaction> => {
    const response = await fetch(`/api/transactions/${txId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Body can be empty for this mock, but could pass data in real app
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim dividends');
    }
    return response.json();
};
