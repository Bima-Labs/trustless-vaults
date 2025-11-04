
// Blockchain network configuration
export const BTC_NETWORK = 'testnet'; // 'livenet' or 'testnet'
export const EVM_NETWORK_ID = '11155111'; // Sepolia testnet

// Vault addresses - REPLACE WITH YOUR ACTUAL ADDRESSES
export const BTC_VAULT_ADDRESS = 'tb1qemtt7nescd7alxcvv9694n2psxq9aetn9tyx6m'; 
export const EVM_VAULT_ADDRESS = '0x2ae8F3F41c991f0923F451744eafF186952a702b';
export const WBTC_TOKEN_ADDRESS = '0xA02b9C28D949243772087d4993FB3A486dF98359';
export const USDC_TOKEN_ADDRESS = '0xC26B8569f3081Dbb8087892CEFb9706fE423d207';

// API Endpoints
export const MEMPOOL_API_URL = 'https://mempool.space/testnet4/api';
export const ETHERSCAN_API_URL = 'https://api-sepolia.etherscan.io/api';
// This is now a server-side only environment variable.
// It must be set in your deployment environment or in a .env.local file.
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''; 

// Application settings
// Admin's EVM wallet address (lowercase)
export const ADMIN_EVM_ADDRESS = '0x39d2770abcc456f6c6be820705ed966592e0ad96'; 
export const ADMIN_BTC_ADDRESS = 'tb1qemtt7nescd7alxcvv9694n2psxq9aetn9tyx6m';
export const FIVE_MINUTES_IN_DAYS = 5 / (24 * 60); // Approx 0.00347
export const LOCK_DURATIONS = [FIVE_MINUTES_IN_DAYS, 30, 90, 365]; // in days
export const FEE_RATE = 10; // satoshis per vbyte for BTC transactions

export const DURATION_LABELS: { [key: number]: string } = {
    [FIVE_MINUTES_IN_DAYS]: '5 min',
    30: '30 days',
    90: '90 days',
    365: '365 days',
};
