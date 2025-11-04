import type { MempoolTx, EtherscanTx } from '../types';

/**
 * Fetches BTC transaction data by calling our own backend proxy.
 */
export const getBtcTx = async (txId: string): Promise<MempoolTx | null> => {
  try {
    const response = await fetch(`/api/explorer/tx/btc/${txId}`);
    if (!response.ok) {
        console.error(`Failed to fetch BTC transaction from proxy ${txId}: ${response.statusText}`);
        return null;
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching BTC tx from proxy:', error);
    return null;
  }
};

/**
 * Fetches EVM transaction data by calling our own backend proxy.
 */
export const getEvmTx = async (txId: string): Promise<EtherscanTx | null> => {
    try {
        const response = await fetch(`/api/explorer/tx/evm/${txId}`);
        if (!response.ok) {
            console.error(`Failed to fetch EVM transaction from proxy ${txId}: ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching EVM tx from proxy:', error);
        return null;
    }
};
