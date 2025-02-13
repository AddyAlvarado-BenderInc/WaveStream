import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../lib/mongodb';
import ProductManager from '../../../../models/ProductManager';
import BrickEditor from '../../../../models/BrickEditor';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export interface NextApiRequestWithFiles extends NextApiRequest {
    files?: Express.Multer.File[];
}

export const config = {
    api: {
        bodyParser: false,
    },
};

const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
}).any();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { productType, id, field } = req.query;

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
                    return res.status(404).json({ error: 'Product manager not found.' });
                }

                console.log('Fetched Product Manager:', productManager);
                res.status(200).json(productManager);
                break;
            }
            case 'PATCH': {
                await new Promise((resolve, reject) => {
                    upload(req as any, res as any, (err: any) => {
                        if (err) return reject(err);
                        resolve(null);
                    });
                });
            
                const file = (req as any).files?.icon?.[0] || null;
            
                const formFields = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
            
                if (file) {
                    const iconPath = `/uploads/${file.filename}`;
                    formFields.icon = iconPath;
                    formFields.iconPreview = `http://localhost:3000${iconPath}`; //TODO: change to actual domain name when available
                }
            
                const allowedFields = [
                    'displayAs',
                    'productId',
                    'intentRange',
                    'selectorMode',
                    'itemTemplate',
                    'descriptionFooter',
                    'buyNowButtonText',
                    'description',
                    'initialHTML',
                    'initialCSS',
                    'initialJS',
                    'icon',
                    'iconPreview',
                    'label',
                    'runManager',
                ];
            
                const sanitizedData = Object.keys(formFields).reduce((acc, key) => {
                    const value = formFields[key];
                    if (allowedFields.includes(key)) {
                        acc[key] = Array.isArray(value) ? value[0] : value;
                    }
                    return acc;
                }, {} as Record<string, any>);
            
                const { initialHTML = '', initialCSS = '', initialJS = '' } = sanitizedData;
                if (initialHTML || initialCSS || initialJS) {
                    sanitizedData.description = `
                        <html>
                            <head>
                                <style>${initialCSS}</style>
                            </head>
                            <body>
                                ${initialHTML}
                                <script>${initialJS}</script>
                            </body>
                        </html>
                    `.trim();
                }
            
                if (!Object.keys(sanitizedData).length) {
                    return res.status(400).json({ error: 'No valid fields provided for update' });
                }
            
                const query = productType ? { _id: id, productType } : { _id: id };
            
                const updatedManager = await ProductManager.findOneAndUpdate(
                    query,
                    { $set: sanitizedData },
                    { new: true }
                );
            
                if (!updatedManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }
            
                if (field) {
                    await BrickEditor.findOneAndUpdate(
                        { brickId: `${id}_${field}` },
                        sanitizedData,
                        { upsert: true }
                    );
                }
            
                res.status(200).json(updatedManager);
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
            default:
                res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
                res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Error handling product manager request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}