import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongodb';
import Description from '../../../models/Description';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await connectToDatabase();

        const { descriptionId, name } = req.query;

        switch (req.method) {
            case 'GET': {
                const { descriptionId, name } = req.query;
            
                const query: any = {};
                if (descriptionId) query._id = descriptionId;
                if (name) query.name = name;
            
                const descriptions = await Description.find(query);
            
                if (!descriptions || descriptions.length === 0) {
                    return res.status(404).json({ error: 'Description not found.' });
                }
            
                const formattedDescriptions = descriptions.map((desc) => ({
                    id: desc._id,
                    name: desc.name,
                    html: desc.html,
                    css: desc.css,
                    js: desc.js,
                }));
            
                return res.status(200).json(formattedDescriptions);
            }            

            case 'POST': {
                const { name, html, css, js, combinedHTML } = req.body;

                if (!name || !html || !combinedHTML) {
                    return res.status(400).json({ error: 'Name, HTML, and combinedHTML are required.' });
                }

                const existingDescription = await Description.findOne({ name });
                if (existingDescription) {
                    return res.status(400).json({ error: 'A description with this name already exists.' });
                }

                const newDescription = new Description({ name, html, css, js, combinedHTML });
                await newDescription.save();

                return res.status(201).json({
                    message: 'Description created successfully.',
                    id: newDescription._id,
                });
            }

            case 'PUT': {
                const { descriptionId } = req.query;
                const { name, html, css, js, combinedHTML } = req.body;
            
                if (!descriptionId || typeof descriptionId !== 'string') {
                    return res.status(400).json({ error: 'Valid descriptionId is required.' });
                }
            
                const updatedDescription = await Description.findByIdAndUpdate(
                    descriptionId,
                    { name, html, css, js, combinedHTML },
                    { new: true }
                );
            
                if (!updatedDescription) {
                    return res.status(404).json({ error: 'Description not found.' });
                }
            
                return res.status(200).json({
                    message: 'Description updated successfully.',
                    description: updatedDescription,
                });
            }            

            default: {
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                return res.status(405).json({ error: `Method ${req.method} is not allowed.` });
            }
        }
    } catch (error) {
        console.error('Error handling description request:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}