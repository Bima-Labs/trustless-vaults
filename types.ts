export interface BtcWalletState {
  connected: boolean;
  address: string | null;
}

export interface EvmWalletState {
  connected: boolean;
  address: string | null;
}

export interface Transaction { // Corrected type for btcPriceAtTx
  btcPriceAtTx: number;
  // App-specific data
  id: string;
  userAddress: string;
  userEvmAddress: string;
  lockDurationDays: number;
  timestamp: string;
  claimed: boolean; // <-- New field
  // On-chain data
  txId: string;
  amount: number;
  asset: 'tBTC' | 'wBTC';
  network: 'Bitcoin Testnet' | 'EVM Testnet';
  status: {
    stakeId?: number;
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}


export enum View {
  USER = 'user',
  ADMIN = 'admin',
}

// Type for tracking user's in-flight transaction
export interface TxProgress {
  status: 'idle' | 'pending' | 'confirmed' | 'failed';
  txId: string | null;
  asset: 'tBTC' | 'wBTC' | null;
  message: string;
}

// API Response Types
export interface MempoolTx {
  txid: string;
  vin: { prevout: { scriptpubkey_address: string } }[];
  vout: { value: number; scriptpubkey_address: string }[];
  status: {
    confirmed: boolean;
    block_height: number;
    block_time: number;
  };
}

export interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  isError: string;
}


declare global {
  interface Window {
    unisat: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getNetwork: () => Promise<'livenet' | 'testnet'>;
      switchNetwork: (network: 'livenet' | 'testnet') => Promise<void>;
      sendBitcoin: (to: string, satoshis: number, options?: { feeRate: number }) => Promise<string>;
    };
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, listener: (...args: any[]) => void) => void;
      removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
    };
  }
}
