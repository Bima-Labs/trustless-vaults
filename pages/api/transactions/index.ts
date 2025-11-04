import type { NextApiRequest, NextApiResponse } from 'next';
import { addTransaction, getTransactions } from '../../../lib/db';
import type { Transaction } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const transactions = await getTransactions();
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  } else if (req.method === 'POST') {
    try {
      const txData = req.body as Omit<Transaction, 'id' | 'timestamp' | 'claimed'>;
      
      // Basic validation
      if (!txData.userAddress || !txData.userEvmAddress || !txData.txId || !txData.amount || !txData.asset) {
        return res.status(400).json({ message: 'Missing required transaction fields' });
      }

      const newTransaction = await addTransaction(txData);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to create transaction' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
