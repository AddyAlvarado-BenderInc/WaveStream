import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../../lib/mongodb';
import ProductManager from '../../../../../models/ProductManager';
import { getGridFSBucket } from '../../../../../lib/gridFSBucket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { productType, id } = req.query;
    const { filename } = req.query;

    try {
        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                error: 'Valid product ID (string) is required'
            });
        }

        if (!filename || typeof filename !== 'string') {
            return res.status(400).json({
                error: 'Filename query parameter is required'
            });
        }

        const productIdString = id;
        const pdfFilename = decodeURIComponent(filename);

        await connectToDatabase();

        const updatedManager = await ProductManager.findOneAndUpdate(
            { _id: productIdString /*, productType */ },
            {
                $pull: { pdf: pdfFilename }
            },
            { new: true }
        ).select('pdf');

        if (!updatedManager) {
            console.warn(`Product manager ${productIdString} not found during PDF delete operation.`);
            return res.status(404).json({ error: 'Product manager not found' });
        }

        const bucket = await getGridFSBucket();
        const files = await bucket.find({
            filename: pdfFilename,
            'metadata.productId': productIdString
        }).toArray();

        if (files.length > 0) {
            await Promise.all(files.map(file => bucket.delete(file._id)));
            console.log(`Deleted ${files.length} GridFS file(s) named ${pdfFilename} for product ${productIdString}.`);
        } else {
            console.warn(`No GridFS file named ${pdfFilename} found for product ${productIdString} to delete.`);
        }

        res.status(200).json({
            message: 'PDF deleted successfully',
            remainingPDFs: updatedManager.pdf || [],
        });

    } catch (error) {
        console.error(`Error deleting PDF ${filename} for product ${id}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}