import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../lib/mongodb';
import Counter from '../../models/Counter';
import ProductManager from '../../models/ProductManager';

async function getNextSequence(name: string) {
    const totalCount = await ProductManager.countDocuments();
    if (totalCount === 0) {
        await Counter.findOneAndUpdate(
            { name },
            { $set: { sequenceValue: 0 } },
            { upsert: true }
        );
    }

    const result = await Counter.findOneAndUpdate(
        { name },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true }
    );

    if (!result || result.sequenceValue == null) {
        throw new Error('Failed to fetch or increment counter');
    }
    return result.sequenceValue;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await connectToDatabase();
        console.log('Database connected in API route');
    } catch (error) {
        console.error('Database connection error in API route:', error);
        return res.status(500).json({ error: 'Failed to connect to database' });
    }

    if (req.method === 'POST') {
        const { name, productType } = req.body;

        if (!name || !productType) {
            return res.status(400).json({ error: 'Name and productType are required' });
        }

        try {
            const nextId = await getNextSequence('productManager');
            console.log(`Generated ID: ${nextId}`);
            const productManager = new ProductManager({
                _id: nextId.toString().padStart(3, '0'),
                name,
                productType,
            });
            console.log(`Saving product manager: ${JSON.stringify(productManager)}`);
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
