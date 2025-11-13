import type { Transaction } from '../types';
import { getBtcPriceInUsd } from './price';
// The `getBtcPriceInUsd` import is now used here.
import { query, type RowDataPacket, type ResultSetHeader } from './mysql';

// Maps database snake_case columns to camelCase object properties
const mapDbRowToTransaction = (row: RowDataPacket): Transaction => {
  return {
    id: row.id,
    userAddress: row.user_address,
    userEvmAddress: row.user_evm_address,
    lockDurationDays: row.lock_duration_days,
    timestamp: new Date(row.timestamp).toISOString(),
    claimed: !!row.claimed,
    txId: row.tx_id,
    amount: parseFloat(row.amount),
    asset: row.asset,
    network: row.network,
    btcPriceAtTx: parseFloat(row.btc_price_at_tx),
    status: {
      confirmed: !!row.status_confirmed,
    },
  };
};

// Find or create a user and return their ID.
const getOrCreateUser = async (btcAddress: string, evmAddress: string): Promise<number> => {
    // Try to find user by either address
    const findUserSql = 'SELECT id FROM users WHERE btc_address = ? OR evm_address = ? LIMIT 1';
    const users = await query<RowDataPacket[]>(findUserSql, [btcAddress, evmAddress]);

    if (users.length > 0) {
        // User exists, may need to update if one address was missing
        const userId = users[0].id;
        const updateUserSql = 'UPDATE users SET btc_address = ?, evm_address = ? WHERE id = ?';
        await query(updateUserSql, [btcAddress, evmAddress, userId]);
        return userId;
    } else {
        // User does not exist, create new user
        const insertUserSql = 'INSERT INTO users (btc_address, evm_address) VALUES (?, ?)';
        const result = await query<ResultSetHeader>(insertUserSql, [btcAddress, evmAddress]);
        return result.insertId;
    }
};


export const getTransactions = async (): Promise<Transaction[]> => {
  // This query now needs to combine results from both btc_transactions and wbtc_transactions
  // and join with users to get the addresses.
  const sql = `
    SELECT 
      'btc' as type, b.id, u.btc_address as user_address, u.evm_address as user_evm_address, b.lock_duration_days, b.timestamp, b.claimed, b.tx_id, b.amount, 'tBTC' as asset, 'Bitcoin Testnet' as network, b.confirmed as status_confirmed, b.btc_price_at_tx, b.claimed_at
    FROM btc_transactions b
    JOIN users u ON b.user_id = u.id
    UNION ALL
    SELECT 
      'wbtc' as type, w.id, u.btc_address as user_address, u.evm_address as user_evm_address, w.lock_duration_days, w.timestamp, w.claimed, w.tx_id, w.amount, 'wBTC' as asset, 'EVM Testnet' as network, w.confirmed as status_confirmed, w.btc_price_at_tx, w.claimed_at
    FROM wbtc_transactions w
    JOIN users u ON w.user_id = u.id 
    ORDER BY timestamp DESC;
  `;
  const results = await query<RowDataPacket[]>(sql);
  // The map function needs to be adjusted to handle the combined result
  return results.map(row => ({
    id: `${row.type}-${row.id}`,
    userAddress: row.user_address,
    userEvmAddress: row.user_evm_address,
    lockDurationDays: row.lock_duration_days,
    timestamp: new Date(row.timestamp).toISOString(),
    claimed: !!row.claimed,
    txId: row.tx_id,
    amount: parseFloat(row.amount),
    asset: row.asset,
    network: row.network,
    btcPriceAtTx: parseFloat(row.btc_price_at_tx),
    status: {
      confirmed: !!row.status_confirmed,
    },
  }));
};

export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  const [type, dbId] = id.split('-');
  if (!type || !dbId) return null;

  const tableName = type === 'btc' ? 'btc_transactions' : 'wbtc_transactions';
  const asset: 'tBTC' | 'wBTC' = type === 'btc' ? 'tBTC' : 'wBTC';
  const network = type === 'btc' ? 'Bitcoin Testnet' : 'EVM Testnet';

  const sql = `
    SELECT t.*, u.btc_address as user_address, u.evm_address as user_evm_address, t.btc_price_at_tx, t.claimed_at
    FROM ${tableName} t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `;

  const results = await query<RowDataPacket[]>(sql, [dbId]);
  if (results.length === 0) {
    return null;
  }
  const row = results[0];
  return {
    id: `${type}-${row.id}`,
    userAddress: row.user_address,
    userEvmAddress: row.user_evm_address,
    lockDurationDays: row.lock_duration_days,
    timestamp: new Date(row.timestamp).toISOString(),
    claimed: !!row.claimed,
    txId: row.tx_id,
    amount: parseFloat(row.amount),
    asset: asset,
    network: network,
    btcPriceAtTx: parseFloat(row.btc_price_at_tx),
    status: {
      confirmed: !!row.confirmed,
    },
  };
};

export const addTransaction = async (txData: Omit<Transaction, 'id' | 'timestamp' | 'claimed'>): Promise<Transaction> => {
  const { userAddress, userEvmAddress, lockDurationDays, txId, amount, asset, network, status } = txData;
  const userId = await getOrCreateUser(userAddress, userEvmAddress);
  
  const btcPriceAtTx = await getBtcPriceInUsd();

  const tableName = asset === 'tBTC' ? 'btc_transactions' : 'wbtc_transactions';
  const sql = `INSERT INTO ${tableName} (user_id, tx_id, amount, lock_duration_days, confirmed, btc_price_at_tx) VALUES (?, ?, ?, ?, ?, ?)`;
  const result = await query<ResultSetHeader>(sql, [
    userId,
    txId,
    amount,
    lockDurationDays,
    status.confirmed,
    btcPriceAtTx, // This will be 0 for wBTC as it's fetched later or not applicable
  ]);
  
  const newTxId = `${asset === 'tBTC' ? 'btc' : 'wbtc'}-${result.insertId}`;
  const newTx = await getTransactionById(newTxId);
  if (!newTx) {
    throw new Error("Failed to retrieve new transaction after creation.");
  }
  return newTx;
};

export const getUnconfirmedTransactions = async (): Promise<Transaction[]> => {
  const sql = `
    SELECT
      'btc' as type, b.id, u.btc_address as user_address, u.evm_address as user_evm_address, b.lock_duration_days, b.timestamp, b.claimed, b.tx_id, b.amount, 'tBTC' as asset, 'Bitcoin Testnet' as network, b.confirmed as status_confirmed, b.btc_price_at_tx, b.claimed_at
    FROM btc_transactions b
    JOIN users u ON b.user_id = u.id
    WHERE b.confirmed = FALSE
    UNION ALL 
    SELECT
      'wbtc' as type, w.id, u.btc_address as user_address, u.evm_address as user_evm_address, w.lock_duration_days, w.timestamp, w.claimed, w.tx_id, w.amount, 'wBTC' as asset, 'EVM Testnet' as network, w.confirmed as status_confirmed, w.btc_price_at_tx, w.claimed_at
    FROM wbtc_transactions w
    JOIN users u ON w.user_id = u.id
    WHERE w.confirmed = FALSE
  `;
  const results = await query<RowDataPacket[]>(sql);
  return results.map(row => ({
    id: `${row.type}-${row.id}`,
    userAddress: row.user_address,
    userEvmAddress: row.user_evm_address,
    lockDurationDays: row.lock_duration_days,
    timestamp: new Date(row.timestamp).toISOString(),
    earlyDisbursementRequested: !!row.early_disbursement_requested,
    claimed: !!row.claimed,
    txId: row.tx_id,
    amount: parseFloat(row.amount),
    asset: row.asset,
    network: row.network,
    btcPriceAtTx: parseFloat(row.btc_price_at_tx),
    status: {
      confirmed: !!row.status_confirmed,
    },
  }));
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction | null> => {
    const [type, dbId] = id.split('-');
    if (!type || !dbId) return null;

    const tableName = type === 'btc' ? 'btc_transactions' : 'wbtc_transactions';

    const currentTx = await getTransactionById(id);
    if (!currentTx) {
        throw new Error("Transaction not found.");
    }

    const updatedTx = { ...currentTx, ...updates };

    // Build the SET part of the query dynamically to avoid updating all fields
    const setClauses = [];
    const params = [];
    if (updates.status) { setClauses.push('confirmed = ?'); params.push(!!updates.status.confirmed); }
    if (updates.claimed !== undefined) { setClauses.push('claimed = ?'); params.push(!!updates.claimed); if(updates.claimed) { setClauses.push('claimed_at = NOW()'); } }
    
    const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`;
    await query(sql, [...params, dbId]);

    return getTransactionById(id);
};