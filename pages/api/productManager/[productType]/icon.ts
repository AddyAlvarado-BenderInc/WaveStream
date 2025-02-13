import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../lib/mongodb';
import ProductManager from '../../../../models/ProductManager';
import { ProductManager as ProductManagerType } from '../../../../types/productManager';
import mongoose from 'mongoose';
import multer from 'multer';
import { Readable } from 'stream';

export const config = {
    api: {
        bodyParser: false,
    },
};

const upload = multer({ storage: multer.memoryStorage() }).any();

export const getGridFSBucket = (): mongoose.mongo.GridFSBucket => {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection is not established. Ensure you connect to MongoDB first.');
    }

    return new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { productType, id: productId } = req.query;

    if (!productId || !productType) {
        return res.status(400).json({ error: 'Product manager ID and product type are required.' });
    }

    try {
        await connectToDatabase();

        switch (req.method) {
            case 'GET': {
                try {
                    const productManager = await ProductManager.findOne({ _id: productId, productType }).lean<ProductManagerType | null>();
            
                    if (!productManager) {
                        return res.status(404).json({ error: 'Product manager not found.' });
                    }
            
                    const icons = (productManager.icon || [])
                        .filter((icon): icon is string => typeof icon === 'string')
                        .map((iconPath) => ({
                            id: iconPath,
                            url: iconPath.startsWith('/uploads/') 
                                ? `http://localhost:3000${iconPath}`
                                : iconPath,
                        }));
            
                    res.status(200).json({ icons });
                } catch (error) {
                    console.error('Error fetching icons:', error);
                    res.status(500).json({ error: 'Internal server error.' });
                }
                break;
            }            

            case 'PATCH': {
                const uploadedIds: string[] = [];

                const productManager = await ProductManager.findOneAndUpdate(
                    { _id: productId, productType },
                    { $push: { icon: { $each: uploadedIds } } },
                    { new: true }
                ).lean<ProductManagerType | null>();

                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }

                res.status(200).json({ message: 'Icons uploaded successfully.', icons: productManager.icon });
                break;
            }

            case 'POST': {
                try {
                    await new Promise((resolve, reject) => {
                        upload(req as any, res as any, (err: any) => {
                            if (err) return reject(err);
                            resolve(null);
                        });
                    });

                    const files = (req as any).files || [];
                    if (!files.length) {
                        return res.status(400).json({ error: 'No files provided for upload.' });
                    }

                    const bucket = getGridFSBucket();
                    const uploadedIds: string[] = [];
                    for (const file of files) {
                        const readableStream = Readable.from(file.buffer);
                        const uploadStream = bucket.openUploadStream(file.originalname, {
                            contentType: file.mimetype,
                        });
                    
                        await new Promise<void>((resolve, reject) => {
                            readableStream.pipe(uploadStream);
                            uploadStream.on('finish', () => {
                                uploadedIds.push(`/uploads/${uploadStream.id}`);
                                resolve();
                            });
                            uploadStream.on('error', reject);
                        });
                    }                    

                    const existingProductManager = await ProductManager.findOne({ _id: productId, productType }).lean<ProductManagerType | null>();
                    const existingIcons = existingProductManager?.icon || [];
                    const cleanedIcons = existingIcons.filter((icon): icon is string => typeof icon === 'string');

                    const updatedProductManager = await ProductManager.findOneAndUpdate(
                        { _id: productId, productType },
                        { $set: { icon: [...cleanedIcons, ...uploadedIds] } },
                        { new: true }
                    );

                    if (!updatedProductManager) {
                        return res.status(404).json({ error: 'Product manager not found.' });
                    }

                    res.status(200).json({ message: 'Icons uploaded successfully.', icons: updatedProductManager.icon });
                } catch (error) {
                    console.error('Error uploading icons:', error);
                    res.status(500).json({ error: 'Internal server error.' });
                }
                break;
            }

            case 'DELETE': {
                try {
                    const { fileId } = JSON.parse(req.body || '{}');
                    if (!fileId) {
                        return res.status(400).json({ error: 'File ID is required to delete an icon.' });
                    }

                    const bucket = getGridFSBucket();
                    await bucket.delete(new mongoose.Types.ObjectId(fileId));

                    const updatedProductManager = await ProductManager.findOneAndUpdate(
                        { _id: productId, productType },
                        { $pull: { icon: fileId } },
                        { new: true }
                    );

                    if (!updatedProductManager) {
                        return res.status(404).json({ error: 'Product manager not found.' });
                    }

                    res.status(200).json({ message: 'Icon deleted successfully.', icons: updatedProductManager.icon });
                } catch (error) {
                    console.error('Error deleting icon:', error);
                    res.status(500).json({ error: 'Internal server error.' });
                }
                break;
            }

            default:
                res.setHeader('Allow', ['GET', 'PATCH', 'POST', 'DELETE']);
                res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}
