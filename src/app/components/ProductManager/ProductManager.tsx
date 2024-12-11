import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../lib/mongodb';
import mongoose from 'mongoose';

const ProductManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ProductManager =
    mongoose.models.ProductManager || mongoose.model('ProductManager', ProductManagerSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await connectToDatabase();

    if (req.method === 'POST') {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        try {
            const productManager = new ProductManager({ name });
            await productManager.save();
            return res.status(201).json(productManager);
        } catch (error) {
            console.error('Error saving product manager:', error);
            return res.status(500).json({ error: 'Failed to save product manager' });
        }
    } else {
        return res.setHeader('Allow', ['POST', 'GET']).status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
