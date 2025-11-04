import type { NextApiRequest, NextApiResponse } from 'next';
import { getUnconfirmedTransactions, updateTransaction } from '../../../lib/db';
import { getServerBtcTx, getServerEvmTx } from '../../../lib/explorer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const unconfirmedTxs = await getUnconfirmedTransactions();
      let updatedCount = 0;

      for (const tx of unconfirmedTxs) {
        let isConfirmed = false;

        if (tx.asset === 'tBTC') {
          const btcTx = await getServerBtcTx(tx.txId);
          if (btcTx && btcTx.status.confirmed) {
            isConfirmed = true;
          }
        } else { // wBTC
          const evmTx = await getServerEvmTx(tx.txId);
          // isError === '0' means the transaction was successful.
          if (evmTx && evmTx.blockNumber && evmTx.isError === '0') {
            isConfirmed = true;
          }
        }

        if (isConfirmed) {
          await updateTransaction(tx.id, { status: { confirmed: true } });
          updatedCount++;
        }
      }

      res.status(200).json({ message: `Transaction statuses updated. ${updatedCount} new confirmations.` });
    } catch (error) {
      console.error('Error updating transaction statuses:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: 'Failed to update transaction statuses.', error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}