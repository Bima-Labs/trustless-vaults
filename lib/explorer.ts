import { MEMPOOL_API_URL, ETHERSCAN_API_URL, ETHERSCAN_API_KEY } from '../constants';
import type { MempoolTx, EtherscanTx } from '../types';

// Server-side function to fetch BTC tx data
export const getServerBtcTx = async (txId: string): Promise<MempoolTx | null> => {
  try {
    const response = await fetch(`${MEMPOOL_API_URL}/tx/${txId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error fetching BTC tx from mempool.space:', error);
    return null;
  }
};

// Server-side function to fetch EVM tx data securely
export const getServerEvmTx = async (txId: string): Promise<EtherscanTx | null> => {
    if (!ETHERSCAN_API_KEY) {
        console.error("Etherscan API key is not configured on the server.");
        return null;
    }
    try {
        // This logic is moved from the old client-side service/explorer.ts
        const proxyResponse = await fetch(
            `${ETHERSCAN_API_URL}?module=proxy&action=eth_getTransactionByHash&txhash=${txId}&apikey=${ETHERSCAN_API_KEY}`
        );
        if (!proxyResponse.ok) throw new Error('Failed to fetch EVM transaction proxy');
        const proxyRes = await proxyResponse.json();
        if (!proxyRes.result) return null;

        const receiptResponse = await fetch(
            `${ETHERSCAN_API_URL}?module=proxy&action=eth_getTransactionReceipt&txhash=${txId}&apikey=${ETHERSCAN_API_KEY}`
        );
        if (!receiptResponse.ok) throw new Error('Failed to fetch EVM transaction receipt');
        const receiptRes = await receiptResponse.json();
        if (!receiptRes.result) return null;
        
        const blockResponse = await fetch(
            `${ETHERSCAN_API_URL}?module=proxy&action=eth_getBlockByNumber&tag=${receiptRes.result.blockNumber}&boolean=false&apikey=${ETHERSCAN_API_KEY}`
        );
        if (!blockResponse.ok) throw new Error('Failed to fetch block details');
        const blockRes = await blockResponse.json();
        if (!blockRes.result) return null;

        return {
            hash: proxyRes.result.hash,
            from: proxyRes.result.from,
            to: proxyRes.result.to,
            value: proxyRes.result.value,
            timeStamp: parseInt(blockRes.result.timestamp, 16).toString(),
            blockNumber: proxyRes.result.blockNumber,
            isError: receiptRes.result.status === "0x0" ? "1" : "0",
        };
    } catch (error) {
        console.error('Error fetching EVM tx from Etherscan on server:', error);
        return null;
    }
};
