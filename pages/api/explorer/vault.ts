import type { NextApiRequest, NextApiResponse } from 'next';
import { BTC_VAULT_ADDRESS, EVM_VAULT_ADDRESS } from '../../../constants';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ btc: BTC_VAULT_ADDRESS, evm: EVM_VAULT_ADDRESS });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
