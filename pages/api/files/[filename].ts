import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
        const mongooseInstance = await connectToDatabase();

        if (!mongooseInstance.connection.db) {
            throw new Error('Database connection not established');
        }

        const bucket = new mongooseInstance.mongo.GridFSBucket(
            mongooseInstance.connection.db, 
            { bucketName: 'uploads' }
        );

        const files = await bucket.find({ filename }).toArray();
        if (files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get most recent version
        const latestFile = files.sort((a, b) => 
            b.uploadDate.getTime() - a.uploadDate.getTime()
        )[0];

        res.setHeader('Content-Type', latestFile.contentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        
        const downloadStream = bucket.openDownloadStream(latestFile._id);
        downloadStream.pipe(res);
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}