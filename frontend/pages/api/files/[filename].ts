import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { filename } = req.query;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (!filename || typeof filename !== 'string' || filename === 'undefined') {
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

        console.log('Searching for filename:', filename);
        const files = await bucket.find({ filename }).toArray();
        console.log('Found files:', files.length);

        if (files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        const sortedFiles = files.sort((a, b) =>
            b.uploadDate.getTime() - a.uploadDate.getTime()
        );
        const latestFile = sortedFiles[0];
        console.log('Selected latest file:', latestFile.filename);


        res.setHeader('Content-Type', latestFile.contentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        const downloadStream = bucket.openDownloadStream(latestFile._id);
        downloadStream.on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).end();
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}