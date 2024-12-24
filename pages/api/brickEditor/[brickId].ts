import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../lib/mongodb';
import BrickEditor from '../../../models/BrickEditor';
import ProductManager from '../../../models/ProductManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    type Brick = {
        targetValue: string | number | null;
        intentValue: string | number | null;
        specifiedIntentRange: number;
        intentSelectionValue: string;
        actionSelectionValue: string;
    };

    const { brickId } = req.query;

    console.log('Incoming brickId:', brickId);

    if (!brickId || typeof brickId !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing brickId' });
    }

    try {
        await connectToDatabase();
        console.log('Database connection successful');

        switch (req.method) {
            case 'GET': {
                console.log('Incoming brickId:', brickId);

                const normalizedBrickId = brickId.trim().replace(/\s+/g, '_');
                console.log('Normalized brickId:', normalizedBrickId);

                type MongooseBrick = Brick & {
                    _id: string | null;
                    __v: number;
                };

                const defaultValues: MongooseBrick = {
                    _id: null,
                    __v: 0,
                    targetValue: null || '',
                    intentValue: null,
                    specifiedIntentRange: 0,
                    intentSelectionValue: '',
                    actionSelectionValue: '',
                };

                let brick = await BrickEditor.findOne({ brickId: normalizedBrickId }).lean() as MongooseBrick | null;

                if (!brick) {
                    console.warn(`Brick with ID ${normalizedBrickId} not found.`);
                    brick = { ...defaultValues };
                }

                if (brick.targetValue === null || '') {
                    const [id, field] = normalizedBrickId.split('_');
                    if (id && field) {
                        const productManager = await ProductManager.findOne({ _id: id }).lean();

                        if (
                            productManager &&
                            typeof productManager === 'object' &&
                            field in productManager
                        ) {
                            brick.targetValue = (productManager as Record<string, any>)[field];
                        }
                    }
                }

                console.log('Brick retrieved with defaults:', brick);
                res.status(200).json(brick);
                break;
            }

            case 'POST': {
                console.log('POST request body:', req.body);

                const { targetValue, intentValue, specifiedIntentRange, intentSelectionValue, actionSelectionValue } = req.body;

                const normalizedBrickId = brickId.trim().replace(/\s+/g, '_');

                const updatedBrick = await BrickEditor.findOneAndUpdate(
                    { brickId: normalizedBrickId },
                    { $set: { targetValue, intentValue, specifiedIntentRange, intentSelectionValue, actionSelectionValue } },
                    { new: true, upsert: true }
                );

                if (!updatedBrick) {
                    console.error('Failed to update brick data:', brickId);
                } else {
                    console.log('Updated brick data:', updatedBrick);
                }

                res.status(200).json(updatedBrick);
                break;
            }

            case 'DELETE': {
                console.log('Attempting to delete brick with brickId:', brickId);

                const normalizedBrickId = brickId.trim().replace(/\s+/g, '_');
                const deletedBrick = await BrickEditor.findOneAndDelete({ brickId: normalizedBrickId });

                if (!deletedBrick) {
                    console.error('Brick data not found for deletion:', brickId);
                    return res.status(404).json({ error: 'Brick data not found' });
                }

                console.log('Deleted brick:', deletedBrick);
                res.status(200).json({ message: 'Brick data deleted successfully' });
                break;
            }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Error handling BrickEditor request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}