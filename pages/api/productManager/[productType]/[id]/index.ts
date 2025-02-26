import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../../lib/mongodb';
import ProductManager from '../../../../../models/ProductManager';
import { IProductManager } from '../../../../../models/ProductManager';
import BrickEditor from '../../../../../models/BrickEditor';
import { cleanOrphanedFiles } from '../../../../../lib/fileCleanup';
import { Readable } from 'stream';
import { getGridFSBucket } from '../../../../../lib/gridFSBucket';
import multer from 'multer';

export interface NextApiRequestWithFiles extends NextApiRequest {
    files?: Express.Multer.File[];
}

export const config = {
    api: {
        bodyParser: false,
    },
};

const upload = multer({ storage: multer.memoryStorage() }).any();

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
                const productManager = await ProductManager.findOne(query).lean<IProductManager>();

                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }

                const icons = productManager.icon.map(filename => ({
                    filename,
                    url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                }));

                const fileNames = icons
                    .filter(icon => !('error' in icon))
                    .map(icon => icon.filename);

                await cleanOrphanedFiles(fileNames, id.toString());

                const enhancedResponse = {
                    ...productManager,
                    icon: productManager.icon.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                    iconPreview: productManager.iconPreview.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    }))
                };

                res.status(200).json(enhancedResponse);
                break;
            }
            case 'PATCH': {
                await new Promise((resolve, reject) => {
                    upload(req as any, res as any, (err: any) => {
                        if (err) return reject(err);
                        resolve(null);
                    });
                });

                const uploadedFiles = (req as any).files || [];
                const existingIcons = Array.isArray(req.body.icons) ? req.body.icons : [];

                const newIcons = await Promise.all(
                    uploadedFiles.map(async (file: Express.Multer.File) => {
                        const bucket = await getGridFSBucket();
                        const filename = file.originalname;

                        const existingFiles = await bucket.find({
                            filename,
                            'metadata.productId': id
                        }).toArray();

                        if (existingFiles.length > 0) {
                            await Promise.all(existingFiles.map(f => bucket.delete(f._id)));
                        }

                        const uploadStream = bucket.openUploadStream(filename, {
                            contentType: file.mimetype,
                            metadata: { productId: id }
                        });

                        await new Promise<void>((resolve, reject) => {
                            Readable.from(file.buffer)
                                .pipe(uploadStream)
                                .on('finish', resolve)
                                .on('error', reject);
                        });
                        return filename;
                    })
                );

                console.log('Uploaded files count:', uploadedFiles.length);
                console.log('New icons:', newIcons);

                const allIcons = [...existingIcons, ...newIcons];
                console.log('All icons:', allIcons);
                const formFields = req.body ? JSON.parse(JSON.stringify(req.body)) : {};

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

                const updateData = {
                    ...sanitizedData,
                    icon: allIcons,
                    iconPreview: allIcons.map(filename =>
                        `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    )
                };

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
                    { $set: updateData },
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

                res.status(200).json({
                    ...updatedManager.toObject(),
                    icon: allIcons.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                    iconPreview: allIcons.map(id =>
                        `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(__filename)}`
                    )
                });
                break;
            }
            case 'DELETE': {
                const query = productType ? { _id: id, productType } : { _id: id };
                const productManager = await ProductManager.findOne(query);

                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found' });
                }

                const bucket = await getGridFSBucket();
                const filenames = productManager.icon;
                for (const filename of filenames) {
                    const files = await bucket.find({ filename }).toArray();
                    await Promise.all(files.map(file => bucket.delete(file._id)));
                }

                await BrickEditor.deleteMany({ brickId: new RegExp(`^${id}_`) });

                await ProductManager.deleteOne(query);

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