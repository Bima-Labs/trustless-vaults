import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerBtcTx, getServerEvmTx } from '../../../../../lib/explorer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { asset, txId } = req.query;

    if (typeof asset !== 'string' || typeof txId !== 'string') {
        return res.status(400).json({ message: 'Invalid asset or transaction ID' });
    }

    try {
        let txData = null;
        if (asset === 'btc') {
            txData = await getServerBtcTx(txId);
        } else if (asset === 'evm') {
            txData = await getServerEvmTx(txId);
        } else {
            return res.status(400).json({ message: 'Unsupported asset type' });
        }

        if (txData) {
            res.status(200).json(txData);
        } else {
            res.status(404).json({ message: 'Transaction not found' });
        }
    } catch (error) {
        console.error('API route error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}