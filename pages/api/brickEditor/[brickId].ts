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
        currentValue: string;
        sheetData: {
            targets: string[];
            intents: string[];
        };
    };

    const { brickId, productType } = req.query;

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
                    targetValue: '',
                    intentValue: '',
                    specifiedIntentRange: 0,
                    intentSelectionValue: '',
                    actionSelectionValue: '',
                    currentValue: '',
                    sheetData: {
                        targets: [],
                        intents: [],
                    },
                };
            
                let brick = await BrickEditor.findOne({ brickId: normalizedBrickId }).lean() as MongooseBrick | null;
            
                if (!brick) {
                    console.warn(`Brick with ID ${normalizedBrickId} not found.`);
                    brick = { ...defaultValues };
                }
            
                if (!brick.targetValue) {
                    const [id, field] = normalizedBrickId.split('_');
                    console.log(`Parsed Brick ID: ${id}, Field: ${field}`);
            
                    if (id && field) {
                        const query = productType ? { _id: id, productType } : { _id: id };
                        console.log(`Database Query:`, query);
            
                        const productManager = await ProductManager.findOne(query).lean();
                        if (!productManager) {
                            console.warn(`No ProductManager found for query:`, query);
                        } else {
                            console.log(`ProductManager found:`, productManager);
            
                            const validFields = [
                                'displayAs',
                                'productId',
                                'itemTemplate',
                                'descriptionFooter',
                                'buyNowButtonText',
                                'description',
                                'icon',
                                'sheetData'
                            ] as const;
            
                            if (validFields.includes(field as typeof validFields[number])) {
                                const productFieldValue = (productManager as Record<string, any>)[field] || '';
                                console.log(`Resolved Field Value [${field}]:`, productFieldValue);
            
                                brick.currentValue = brick.targetValue || productFieldValue;
                                if (!brick.targetValue) {
                                    console.log(`Setting brick.targetValue to:`, productFieldValue);
                                    brick.targetValue = productFieldValue;
                                }
                            } else {
                                console.warn(`Field [${field}] is not valid. Valid fields are:`, validFields);
                            }
                        }
                    } else {
                        console.warn(`Brick ID parsing failed. ID: ${id}, Field: ${field}`);
                    }
                }
            
                console.log('Brick retrieved with defaults:', brick);
                res.status(200).json(brick);
                break;
            }                   

            case 'POST': {
                console.log('POST request body:', req.body);

                const { targetValue, intentValue, specifiedIntentRange, intentSelectionValue, actionSelectionValue, sheetData } = req.body;
                const normalizedBrickId = brickId.trim().replace(/\s+/g, '_');

                const newBrick = {
                    targetValue: targetValue || '',
                    intentValue: intentValue || '',
                    specifiedIntentRange: specifiedIntentRange || 0,
                    intentSelectionValue: intentSelectionValue || 'default',
                    actionSelectionValue: actionSelectionValue || 'default',
                    sheetData: sheetData || { targets: [], intents: [] },
                };
                
                const updatedBrick = await BrickEditor.findOneAndUpdate(
                    { brickId: normalizedBrickId },
                    { $set: { ...newBrick } },
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