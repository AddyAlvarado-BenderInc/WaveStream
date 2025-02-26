import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../../lib/mongodb';
import ProductManager from '../../../../../models/ProductManager';
import { getGridFSBucket } from '../../../../../lib/gridFSBucket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { productType, id } = req.query;
    const { filename } = req.query;

    try {
        if (!id || !filename) {
            return res.status(400).json({ 
                error: 'Both product ID and icon filename are required' 
            });
        }

        const productId = Array.isArray(id) ? id[0] : id;
        const iconFilename = Array.isArray(filename) ? filename[0] : filename;

        await connectToDatabase();

        const updatedManager = await ProductManager.findOneAndUpdate(
            { _id: productId, productType },
            { 
                $pull: { 
                    icon: iconFilename,
                    iconPreview: { 
                        $regex: `${encodeURIComponent(iconFilename)}$` 
                    }
                }
            },
            { new: true }
        );

        if (!updatedManager) {
            return res.status(404).json({ error: 'Product manager or icon not found' });
        }

        const bucket = await getGridFSBucket();
        const files = await bucket.find({
            filename: iconFilename,
            'metadata.productId': productId
        }).toArray();

        if (files.length > 0) {
            await Promise.all(files.map(file => bucket.delete(file._id)));
        }

        res.status(200).json({
            message: 'Icon deleted successfully',
            remainingIcons: updatedManager.icon,
            deletedIcon: iconFilename
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}