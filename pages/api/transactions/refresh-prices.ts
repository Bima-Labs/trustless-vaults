import type { NextApiRequest, NextApiResponse } from 'next';
import { getBtcPriceInUsd } from '../../../lib/price';
import { getTransactions, updateTransaction } from '../../../lib/db';
import type { Transaction } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const currentBtcPrice = await getBtcPriceInUsd();

      if (currentBtcPrice === 0) {
        console.error("Failed to fetch current BTC price for refresh.");
        return res.status(500).json({ message: 'Failed to fetch current BTC price.' });
      }

      console.log(`Refreshing BTC prices for transactions. Current price: $${currentBtcPrice}`);

      // Get all transactions
      const allTransactions: Transaction[] = await getTransactions();

      let updatedCount = 0;
      for (const tx of allTransactions) {
        // Only update if the price is 0, which was the previous placeholder.
        if (tx.btcPriceAtTx === 0) {
          // We only need to pass the fields we are updating
          await updateTransaction(tx.id, { btcPriceAtTx: currentBtcPrice });
          updatedCount++;
        }
      }

      res.status(200).json({
        message: `Successfully refreshed BTC prices for ${updatedCount} transactions.`,
        currentBtcPrice,
        updatedCount,
      });
    } catch (error) {
      console.error('Error refreshing BTC prices:', error);
      res.status(500).json({ message: 'Failed to refresh BTC prices.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}