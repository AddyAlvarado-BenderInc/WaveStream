import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import connectToDatabase from '../../../../lib/mongodb';
import ProductManager from '../../../../models/ProductManager';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Upload directory created at: ${uploadDir}`);
} else {
    console.log(`Upload directory exists at: ${uploadDir}`);
}

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}${ext}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|gif/;
        const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedFileTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed.'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
}).any();

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { productType, id: productId } = req.query;

    if (!productId || !productType) {
        return res.status(400).json({ error: 'Product manager ID and product type are required.' });
    }

    switch (req.method) {
        case 'GET': {
            try {
                await connectToDatabase();
                const productManager = await ProductManager.findOne({ _id: productId, productType }).lean<{
                    _id: string;
                    icon?: string[];
                }>();
        
                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }
        
                const icons = (productManager.icon || [])
                    .map((icon: string) => icon.trim().replace(/^http(s)?:\/\/[^/]+/, '').replace(/^\/+/, ''))
                    .filter((icon: string) => icon.startsWith('uploads/') || icon.endsWith('.png') || icon.endsWith('.jpg'))
                    .map((icon: string) => `${req.headers.origin || ''}/${icon}`);
        
                return res.status(200).json({ icons });
            } catch (error) {
                console.error('Error fetching icons:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        }
             
        case 'DELETE': {
            let body: { filePath?: string };
        
            try {
                body = JSON.parse(req.body || '{}');
                console.log('Received body for DELETE request:', body);
            } catch (error) {
                console.error('Error parsing request body:', error);
                return res.status(400).json({ error: 'Invalid request body.' });
            }
        
            const { filePath } = body;
        
            if (!filePath) {
                return res.status(400).json({ error: 'File path is required to delete an icon.' });
            }
        
            try {
                await connectToDatabase();
                const productManager = await ProductManager.findOne({ _id: productId, productType });
        
                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }
        
                const sanitizedFilePath = filePath.replace(/^http(s)?:\/\/[^/]+/, '').replace(/^\/+/, '');
                const absoluteFilePath = path.join(process.cwd(), 'public', sanitizedFilePath);
        
                if (fs.existsSync(absoluteFilePath)) {
                    fs.unlinkSync(absoluteFilePath);
                    console.log(`File deleted: ${absoluteFilePath}`);
                } else {
                    console.warn(`File not found: ${absoluteFilePath}`);
                }
        
                const updatedIcons = (productManager.icon || []).filter(
                    (icon: string) => icon.trim().replace(/^http(s)?:\/\/[^/]+/, '') !== sanitizedFilePath
                );
        
                productManager.icon = updatedIcons;
                await productManager.save();
        
                return res.status(200).json({ message: 'Icon deleted successfully.', icons: updatedIcons });
            } catch (error) {
                console.error('Error deleting icon:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        }                      

        case 'PATCH': {
            try {
                await new Promise((resolve, reject) => {
                    upload(req as any, res as any, (err: any) => {
                        if (err) return reject(err);
                        resolve(null);
                    });
                });
        
                const files = (req as any).files || [];
                const formFields = req.body;
                console.log('Received formFields:', formFields);
        
                const deletedIcons = Array.isArray(formFields.deletedIcons)
                    ? formFields.deletedIcons
                    : JSON.parse(formFields.deletedIcons || '[]');
                console.log('Deleted icons:', deletedIcons);
        
                await connectToDatabase();
        
                const productManager = await ProductManager.findOne({ _id: productId, productType });
        
                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }
        
                const uploadedIcons = files.map((file: Express.Multer.File) => `/uploads/${file.filename}`);
                console.log('Uploaded files:', uploadedIcons);
        
                const existingIcons = (productManager.icon || []).filter(
                    (icon: string) => !deletedIcons.includes(icon)
                );
        
                const finalIcons = Array.from(new Set([...existingIcons, ...uploadedIcons]));
                productManager.icon = finalIcons;
        
                await productManager.save();
        
                return res.status(200).json({
                    message: 'Icons updated successfully.',
                    icons: finalIcons,
                });
            } catch (error) {
                console.error('Error updating icons:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
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
                const uploadedIcons = files.map((file: Express.Multer.File) => `/uploads/${file.filename}`);
                console.log('Uploaded files:', uploadedIcons);
        
                await connectToDatabase();
        
                const productManager = await ProductManager.findOne({ _id: productId, productType });
                if (!productManager) {
                    return res.status(404).json({ error: 'Product manager not found.' });
                }
        
                productManager.icon = Array.from(new Set([...(productManager.icon || []), ...uploadedIcons]));
        
                await productManager.save();
        
                return res.status(200).json({
                    message: 'Icons uploaded successfully.',
                    icons: productManager.icon,
                });
            } catch (error) {
                console.error('Error uploading icons:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        }
        
        default: {
            res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
            return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    }
}