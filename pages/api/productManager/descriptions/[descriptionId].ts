import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../lib/mongodb';
import Description from '../../../../models/Description';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await connectToDatabase();

        const { descriptionId } = req.query;

        if (!descriptionId || typeof descriptionId !== 'string') {
            return res.status(400).json({ error: 'Valid descriptionId is required for deletion.' });
        }

        switch (req.method) {
            case 'DELETE': {
                console.log("Received descriptionId for DELETE:", descriptionId);
            
                if (!descriptionId || typeof descriptionId !== 'string') {
                    return res.status(400).json({ error: 'Valid descriptionId is required for deletion.' });
                }
            
                try {
                    const deletedDescription = await Description.findByIdAndDelete(descriptionId);
                    if (!deletedDescription) {
                        return res.status(404).json({ error: 'Description not found.' });
                    }
            
                    return res.status(200).json({ message: 'Description deleted successfully.' });
                } catch (error) {
                    console.error('Error deleting description:', error);
                    return res.status(500).json({ error: 'Internal server error.' });
                }
            }            

            default: {
                res.setHeader('Allow', ['DELETE']);
                return res.status(405).json({ error: `Method ${req.method} is not allowed.` });
            }
        }
    } catch (error) {
        console.error('Error handling DELETE request:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}