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
                const productManager = await ProductManager.findOne(query).lean();
            
                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }
            
                console.log('Fetched ProductManager:', productManager); 
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
                const query = productType ? { _id: id, productType } : { _id: id };
                const allowedFields = [
                    'displayAs',
                    'productId',
                    'intentRange',
                    'selectorMode',
                    'itemTemplate',
                    'descriptionFooter',
                    'initialProductLink',
                    'buyNowButtonText',
                ];
            
                const updatedData = Object.keys(req.body)
                    .filter((key) => allowedFields.includes(key))
                    .reduce((obj, key) => {
                        obj[key] = req.body[key];
                        return obj;
                    }, {} as Record<string, any>);
            
                console.log('Incoming req.body:', req.body);
                console.log('Filtered updatedData:', updatedData);
            
                if (!Object.keys(updatedData).length) {
                    return res.status(400).json({ error: 'No valid fields provided for update' });
                }
            
                const updatedManager = await ProductManager.findOneAndUpdate(
                    query,
                    { $set: updatedData },
                    { new: true }
                );
            
                if (!updatedManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }
            
                console.log('Updated Document in DB:', updatedManager);
                res.status(200).json(updatedManager);
                break;
            }                      

            case 'POST': {
                const query = productType ? { _id: id, productType } : { _id: id };
                const newData = req.body;

                const result = await ProductManager.findOneAndUpdate(
                    query,
                    newData,
                    { upsert: true, new: true }
                );

                res.status(200).json(result);
                break;
            }

            default:
                res.setHeader('Allow', ['GET', 'DELETE', 'PATCH', 'POST']);
                res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Error handling product manager request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
