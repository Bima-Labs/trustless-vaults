import type { NextApiRequest, NextApiResponse } from 'next';
import { getTransactionById, updateTransaction } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'POST') {
    if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    try {
        const transaction = await getTransactionById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        if (transaction.claimed) {
            return res.status(400).json({ message: 'Dividends already claimed for this transaction' });
        }

        // In a real application, this is where you would trigger the on-chain dividend distribution transactions.
        // For this mock application, we just update the status in our in-memory DB.
        const updatedTransaction = await updateTransaction(id, { claimed: true });
        
        res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to claim dividends' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
