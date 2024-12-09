import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../lib/mongodb';
import mongoose from 'mongoose';

const ProductManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    data: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ProductManager = mongoose.models.ProductManager || mongoose.model('ProductManager', ProductManagerSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await connectToDatabase();

    if (req.method === 'POST') {
        const { name, data } = req.body;
        try {
            const productManager = new ProductManager({ name, data });
            await productManager.save();
            res.status(200).json({ success: true, productManager });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save product manager' });
        }
    } else if (req.method === 'GET') {
        try {
            const productManagers = await ProductManager.find({});
            res.status(200).json(productManagers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch product managers' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
