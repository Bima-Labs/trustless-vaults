import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { txId } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { status } = req.body;
      const updatedTransaction = await prisma.transaction.update({
        where: { txId: txId as string },
        data: {
          status: {
            update: status,
          },
        },
      });
      res.status(200).json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update transaction', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}