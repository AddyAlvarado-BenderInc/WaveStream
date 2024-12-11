import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongodb';
import ProductManager from '../../../models/ProductManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  await connectToDatabase();

  switch (req.method) {
    case 'DELETE':
      try {
        const deletedManager = await ProductManager.findByIdAndDelete(id);
        if (!deletedManager) {
          return res.status(404).json({ error: 'Product manager not found' });
        }
        res.status(200).json({ message: 'Product manager deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete product manager' });
      }
      break;

    case 'PATCH':
      try {
        const { isActive } = req.body;
        const updatedManager = await ProductManager.findByIdAndUpdate(
          id,
          { isActive },
          { new: true }
        );
        if (!updatedManager) {
          return res.status(404).json({ error: 'Product manager not found' });
        }
        res.status(200).json(updatedManager);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update product manager' });
      }
      break;

    default:
      res.setHeader('Allow', ['DELETE', 'PATCH']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}