import { MEMPOOL_API_URL, ETHERSCAN_API_KEY } from '../constants';
import type { MempoolTx, EtherscanTx } from '../types';

const TESTNET4_API_URL = 'https://mempool.space/testnet4/api';

/**
 * Fetches a Bitcoin transaction from the Mempool API.
 * @param txId The Bitcoin transaction ID.
 * @returns The transaction details or null if not found.
 */
export const getBtcTx = async (txId: string): Promise<MempoolTx | null> => {
  try {
    const response = await fetch(`${TESTNET4_API_URL}/tx/${txId}`);
    if (!response.ok) {
      // If the transaction is not found, Mempool API returns a non-200 status.
      return null;
    }
    const tx: MempoolTx = await response.json();
    return tx;
  } catch (error) {
    console.error(`Error fetching BTC tx ${txId} from Mempool:`, error);
    return null;
  }
};

/**
 * Fetches an EVM transaction receipt from the Etherscan API.
 * @param txHash The EVM transaction hash.
 * @returns The transaction receipt or null if not found.
 */
export const getEvmTx = async (txHash: string): Promise<EtherscanTx | null> => {
  // Using eth_getTransactionReceipt for a more robust check.
  const url = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // The `result` will be null if the tx is pending, and an object if it's mined.
    // `status: '0x1'` means success, `status: '0x0'` means reverted.
    if (data.result && data.result.status === '0x1') {
      return {
        hash: txHash,
        blockNumber: data.result.blockNumber,
        isError: '0',
        from: data.result.from, to: data.result.to, value: '', timeStamp: '' // Other fields can be added if needed
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching EVM tx ${txHash} from Etherscan:`, error);
    return null;
  }
};