import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../lib/mongodb';
import mongoose from 'mongoose';

const ProductManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    productType: { type: String, required: true}
});

const ProductManager =
    mongoose.models.ProductManager || mongoose.model('ProductManager', ProductManagerSchema);


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await connectToDatabase();
        console.log('Database connected in API route');
    } catch (error) {
        console.error('Database connection error in API route:', error);
        return res.status(500).json({ error: 'Failed to connect to database' });
    }

    if (req.method === 'POST') {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        try {
            const productManager = new ProductManager({ name });
            await productManager.save();
            res.status(201).json(productManager);
        } catch (error) {
            console.error('Error saving product manager:', error);
            res.status(500).json({ error: 'Failed to save product manager' });
        }
    } else if (req.method === 'GET') {
        try {
            const productManagers = await ProductManager.find({});
            res.status(200).json(productManagers);
        } catch (error) {
            console.error('Error fetching product managers:', error);
            res.status(500).json({ error: 'Failed to fetch product managers' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}