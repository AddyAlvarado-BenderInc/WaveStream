import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../lib/mongodb';
import ProductManager from '../../../../models/ProductManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { productType, id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Product manager ID is required' });
    }

    try {
        await connectToDatabase();

        switch (req.method) {
            case 'GET': {
                const query = productType ? { _id: id, productType } : { _id: id };
                const productManager = await ProductManager.findOne(query);

                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }

                res.status(200).json(productManager);
                break;
            }

            case 'DELETE': {
                const query = productType ? { _id: id, productType } : { _id: id };
                const deletedManager = await ProductManager.findOneAndDelete(query);

                if (!deletedManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }

                res.status(200).json({ message: 'Product manager deleted successfully' });
                break;
            }

            case 'PATCH': {
                const { isActive } = req.body;

                if (typeof isActive !== 'boolean') {
                    return res.status(400).json({ error: 'Invalid isActive value' });
                }

                const query = productType ? { _id: id, productType } : { _id: id };
                const updatedManager = await ProductManager.findOneAndUpdate(
                    query,
                    { isActive },
                    { new: true }
                );

                if (!updatedManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }

                res.status(200).json(updatedManager);
                break;
            }

            default:
                res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
                res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Error handling product manager request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
