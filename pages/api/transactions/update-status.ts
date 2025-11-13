import type { NextApiRequest, NextApiResponse } from 'next';
import { getUnconfirmedTransactions, updateTransaction } from '../../../lib/db';
import { getBtcTx, getEvmTx } from '../../../services/explorer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const unconfirmedTxs = await getUnconfirmedTransactions();
    let updatedCount = 0;

    for (const tx of unconfirmedTxs) {
      try {
        let isConfirmed = false;
        if (tx.asset === 'tBTC') {
          const btcTx = await getBtcTx(tx.txId);
          if (btcTx?.status.confirmed) {
            isConfirmed = true;
          }
        } else if (tx.asset === 'wBTC') {
          const evmTx = await getEvmTx(tx.txId);
          // Etherscan returns '1' for success and '0' for error.
          // A non-null blockNumber also indicates it's mined.
          if (evmTx && evmTx.blockNumber && evmTx.isError === '0') {
            isConfirmed = true;
          }
        }

        if (isConfirmed) {
          await updateTransaction(tx.id, {
            ...tx,
            status: { ...tx.status, confirmed: true },
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to update status for tx ${tx.id} (${tx.txId}):`, error);
        // Continue to the next transaction even if one fails
      }
    }

    res.status(200).json({ message: `Successfully updated ${updatedCount} transaction(s).`, updatedCount });
  } catch (error) {
    console.error('Error in update-status handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Failed to update transaction statuses.', error: errorMessage });
  }
}