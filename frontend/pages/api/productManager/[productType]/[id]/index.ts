import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../../lib/mongodb';
import ProductManager from '../../../../../models/ProductManager';
import { IProductManager } from '../../../../../models/ProductManager';
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

                const tableSheet = Array.isArray(productManager.tableSheet)
                    ? productManager.tableSheet.map((value: any, index: number) => ({
                        index,
                        value: value?.value || "null",
                        isOrigin: value?.isOrigin || false,
                    }))
                    : [];

                const enhancedResponse = {
                    ...productManager,
                    tableSheet,
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
                console.log('GET request successful:', enhancedResponse);
                break;
            }
            case 'PATCH': {
                await new Promise((resolve, reject) => {
                    upload(req as any, res as any, (err: any) => {
                        if (err) return reject(err);
                        resolve(null);
                    });
                });

                try {
                    const uploadedFiles = (req as any).files || [];
                    const existingIcons = Array.isArray(req.body.icons) ? req.body.icons : [];

                    const tableSheetKeys: { index: number; value: string; isOrigin: boolean }[] = [];
                    if (Array.isArray(req.body.tableSheet)) {
                        for (let i = 0; i < req.body.tableSheet.length; i += 3) {
                            const index = parseInt(req.body.tableSheet[i], 10);
                            const value = req.body.tableSheet[i + 1];
                            const isOrigin = req.body.tableSheet[i + 2] === 'true';

                            if (!isNaN(index)) {
                                tableSheetKeys.push({ index, value, isOrigin });
                            }
                        }
                    } else {
                        console.error('Invalid tableSheet format:', req.body.tableSheet);
                        return res.status(400).json({ error: 'Invalid tableSheet format' });
                    }

                    const newIcons = await Promise.all(
                        uploadedFiles.map(async (file: Express.Multer.File) => {
                            const bucket = await getGridFSBucket();
                            const filename = file.originalname;

                            const existingFiles = await bucket.find({
                                filename,
                                'metadata.productId': id,
                            }).toArray();

                            if (existingFiles.length > 0) {
                                await Promise.all(existingFiles.map((f) => bucket.delete(f._id)));
                            }

                            const uploadStream = bucket.openUploadStream(filename, {
                                contentType: file.mimetype,
                                metadata: { productId: id },
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
                    console.log("Form fields:", formFields);

                    const allowedFields = [
                        'itemName',
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
                        'variableClass',
                    ];

                    for (let i = 0; i < req.body.tableSheet.length; i += 3) {
                        tableSheetKeys.push({
                            index: parseInt(req.body.tableSheet[i], 10),
                            value: req.body.tableSheet[i + 1],
                            isOrigin: req.body.tableSheet[i + 2] === 'true'
                        });
                    };

                    const updatedTableSheet = tableSheetKeys.map((entry, index) => ({
                        index: entry.index ?? index,
                        value: entry.value || 'null',
                        isOrigin: Boolean(entry.isOrigin),
                    }));

                    const sanitizedData = Object.keys(formFields).reduce((acc, key) => {
                        const value = formFields[key];
                        if (allowedFields.includes(key)) {
                            acc[key] = Array.isArray(value) ? value[0] : value;
                        }
                        return acc;
                    }, {} as Record<string, any>);

                    const updateData = {
                        ...sanitizedData,
                        tableSheet: updatedTableSheet,
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
                } catch (error) {
                    console.error('Error processing uploaded files:', error);
                    res.status(500).json({ error: 'Error processing uploaded files' });
                }
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

                let updatedTableSheet;

                if (field && typeof field === 'string' && field.trim() !== '') {
                    updatedTableSheet = productManager.tableSheet.filter(
                        (classKey: { value: string }) => classKey.value !== field
                    );
                } else {
                    updatedTableSheet = [];
                }

                const result = await ProductManager.updateOne(query, { $set: { tableSheet: updatedTableSheet } });
                
                if (result.modifiedCount > 0) {
                    res.status(200).json({
                        message: field
                            ? `Class key "${field}" deleted successfully`
                            : 'All class keys deleted successfully',
                    });
                } else {
                    res.status(400).json({
                        error: 'Failed to update the tableSheet. Please try again.',
                    });
                }
                
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