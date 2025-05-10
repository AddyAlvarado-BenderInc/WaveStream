import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '../../../../../lib/mongodb';
import ProductManager from '../../../../../models/ProductManager';
import { IProductManager } from '../../../../../models/ProductManager';
import { cleanOrphanedFiles } from '../../../../../lib/fileCleanup';
import { Readable } from 'stream';
import { getGridFSBucket } from '../../../../../lib/gridFSBucket';
import multer from 'multer';
import { has, isEqual } from 'lodash';

// This file defines the API route for handling product manager data. It's centralized for better organization and maintainability.
// It handles GET, PATCH, and DELETE requests for product managers and confines the "save" logic to this file as the single source of truth.
// Only exceptions are made for the upload logic, which is handled by multer, and the file cleanup logic, which is handled by a separate utility function.

export interface NextApiRequestWithFiles extends NextApiRequest {
    files?: Express.Multer.File[];
}

export const config = {
    api: {
        bodyParser: false,
    },
};

interface TableCellDataFrontend {
    classKey: string;
    index: number;
    value: string | string[];
    isComposite: boolean;
    isPackage: boolean;
    isDisabled?: boolean;
}

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

                const icons = (productManager.icon || []).map(filename => ({
                    filename,
                    url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                }));

                const fileNames = icons
                    .filter(icon => !('error' in icon))
                    .map(icon => icon.filename);

                const pdfs = (productManager.pdf || []).map(filename => ({
                    filename,
                    url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                }));

                const pdfFilenames = pdfs
                    .filter(pdf => !('error' in pdf))
                    .map(pdf => pdf.filename);

                const tableSheet = Array.isArray(productManager.tableSheet)
                    ? productManager.tableSheet.map((value: any, index: number) => ({
                        index,
                        value: value?.value || "null",
                        isOrigin: value?.isOrigin || false,
                    }))
                    : [];

                const processTableCellData = (data: any): TableCellDataFrontend[] => {
                    if (!Array.isArray(data)) {
                        console.warn('GET: tableCellData is not an array:', data);
                        return [];
                    }
                    return data.map((item: any): TableCellDataFrontend | null => {
                        if (item && typeof item === 'object' &&
                            typeof item.classKey === 'string' &&
                            typeof item.index === 'number' &&
                            item.value !== undefined &&
                            typeof item.isComposite === 'boolean' &&
                            typeof item.isPackage === 'boolean'
                        ) {
                            const isDisabled = typeof item.isDisabled === 'boolean' ? item.isDisabled : false;
                            // isDefault will be a future feature, so we set it to false if not present
                            const isDefault = typeof item.isDefault === 'boolean' ? item.isDefault : false;
                            return {
                                classKey: item.classKey,
                                index: item.index,
                                value: item.value,
                                isComposite: item.isComposite,
                                isPackage: item.isPackage,
                                isDisabled: isDisabled,
                            };
                        } else {
                            console.warn('GET: Invalid tableCellData item structure from DB:', item);
                            return null;
                        }
                    }).filter((item): item is TableCellDataFrontend => item !== null);
                };
                const tableCellData = processTableCellData(productManager.tableCellData);

                /*
                console.log('Processed tableCellData:', {
                    original: productManager.tableCellData,
                    processed: tableCellData,
                    count: tableCellData.length
                });
                */

                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⣀⠤⠄⠒⠋⠉⠉⠉⠉⠉⠉⠉⠑⠒⠢⢄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⢀⡠⠖⠉⠀⠀⠀⠀⠀⠀⠀⠀⢸⠋⣑⡦⣄⠀⠀⠀⠈⠙⠢⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠴⠿⠷⠶⣶⣦⣤⣤⣀⡀⠀⠀⠀⢸⣿⡀⠉⠛⢽⢦⣀⠀⠀⠀⠀⠑⢄⣀⣀⣠⡤⢴⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠈⠙⣻⡿⠟⠒⠀⠀⢾⣙⣇⡠⠖⠋⠉⡉⠀⠀⠀⠀⠀⠈⠻⡏⠀⠀⡸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⢀⡤⠊⠁⠀⠀⠀⠀⠀⠈⠿⠏⠀⡠⠊⢉⣉⡉⠲⢄⠀⠀⠀⠀⢹⣄⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⡰⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠁⡼⠋⠉⠙⢷⣌⣣⡀⠀⠀⠚⣡⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⢀⡞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠇⣸⠀⠀⣠⡀⠀⢻⣟⠓⠀⠀⢸⢿⠷⡞⠉⠒⢄⠀⠀⣀⡀⠀⠀⠀⠀
                // ⠀⢀⡞⠀⠀⠀⠀⠀⠀⠀⣀⣤⠀⠀⠀⠀⠀⠀⢿⠀⢀⣯⡽⠀⠀⢿⡄⠀⢸⣿⣸⠀⠈⢆⠀⠈⡷⠉⢁⣈⣑⣄⠀⠀
                // ⠀⡸⠀⠀⠀⠀⣀⣤⣶⣿⡿⠋⠀⠀⠀⠀⢳⣼⡋⢶⢾⡉⠓⠤⡠⠤⠒⠊⠙⣿⣿⠿⠃⠀⣸⡇⠀⢉⣇⡼⢀⡠⠤⣼⡇
                // ⢀⠇⠀⠀⣠⣾⠿⠛⠉⡟⠀⠀⠀⠀⠀⣴⣾⣿⣷⣌⡑⠛⠢⠄⠀⠀⢀⣀⡤⠚⠁⠀⠀⣰⡇⠹⣶⡏⠀⢹⡏⢀⣠⣼⠀
                // ⠘⠀⣠⡾⠋⠁⠀⠀⡼⠀⠀⠀⠀⠀⣴⡿⠋⡴⠊⢁⡠⠴⠚⡏⠀⢀⡏⠀⠀⠀⠈⢏⠒⠢⠒⠉⢦⡀⠀⣰⡾⠋⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⢠⡇⠀⣼⠋⠀⠀⢧⠀⠘⣿⢳⢤⣸⣦⡀⡇⠀⠀⠀⠀⢸⠓⠦⠤⠔⠊⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⢇⣸⠁⠀⠀⠀⣼⣷⣤⠎⠘⢒⡇⠈⠉⢻⡄⠀⠀⢀⡞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠘⡇⠀⠀⠀⠀⠘⢺⣶⠆⣠⠞⠁⠀⠀⢸⠱⣤⣴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⣄⣀⠀⢀⢠⣿⡾⢿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⣷⡿⠿⡿⠛⡿⣹⠁⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡰⠁⣰⢁⠇⢰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⠤⢴⠁⢠⣿⣞⣀⣼⠷⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⠁⠸⣤⡯⠤⠟⠛⡦⠀⣀⠤⢶⡃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠞⢷⡦⠀⠀⢠⡔⢯⠁⣀⣉⣉⡠⢿⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡤⠜⠓⠶⣤⣄⣀⣀⣼⡞⠛⡟⠉⠀⠀⢀⠔⠛⠓⠢⢄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣁⣀⡀⠀⠀⠀⠑⢄⠀⠀⢧⣼⠀⠀⠀⡴⠁⠀⠀⠀⠀⠀⠈⠳⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠉⠢⡀⠀⠀⠈⡆⢀⣾⣿⣀⣀⢸⡁⠀⠀⠀⠀⠀⠀⠀⢀⣹⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⡴⠁⠀⠀⠀⠀⠀⠀⠀⠘⡀⠀⣠⡿⠟⠁⠉⠉⠛⠛⠛⠿⠶⠶⠶⠶⠿⠛⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⣥⡀⠀⠀⠀⠀⠀⢀⣀⣤⡷⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                // ⠀⠀⠀⠀⠀⠀⠉⠛⠻⠶⠶⠾⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

                // TODO: Will refactor later to condense globalVariableClassData and globalVariablePackageData, speedrunning now for convenience (Gotta go fast!)
                const processGlobalVariableClassData = (data: any[] | undefined): any[] => {
                    if (!Array.isArray(data)) {
                        console.log('Original globalVariableClassData is not an array or undefined, returning [].');
                        return [];
                    }
                    return data.map((item, index) => {
                        if (typeof item !== 'object' || item === null) {
                            console.warn(`Invalid item found in globalVariableClassData at index ${index}:`, item);
                            return { dataId: -1, name: 'invalid', dataLength: 0, variableData: {} };
                        }
                        const variableDataFromDB = item.variableData;

                        return {
                            dataId: item.dataId ?? -1,
                            name: item.name ?? "null",
                            dataLength: item.dataLength ?? 0,
                            variableData: (typeof variableDataFromDB === 'object' && variableDataFromDB !== null)
                                ? variableDataFromDB
                                : {}
                        };
                    }).filter(item => item.dataId !== -1);
                };

                const globalVariableClassData = processGlobalVariableClassData(productManager.globalVariableClassData);

                /*
                console.log('Processed globalVariableClassData:', {
                    original: productManager.globalVariableClassData,
                    processed: globalVariableClassData,
                    count: globalVariableClassData.length
                });
                */

                const processGlobalVariablePackageData = (data: any[] | undefined): any[] => {
                    if (!Array.isArray(data)) {
                        console.log('Original globalVariablePackageData is not an array or undefined, returning [].');
                        return [];
                    }
                    return data.map((item, index) => {
                        if (typeof item !== 'object' || item === null) {
                            return { dataId: -1, name: 'invalid', dataLength: 0, variableData: {} };
                        }

                        const variableDataFromDB = item.variableData;
                        let processedVariableData: Record<string, any> = {};

                        if (typeof variableDataFromDB === 'object' && variableDataFromDB !== null) {
                            processedVariableData = Object.entries(variableDataFromDB).reduce((acc, [key, entry]) => {
                                if (entry && typeof entry === 'object' && 'value' in entry) {
                                    const valueFromDB = entry.value;

                                    if (typeof valueFromDB === 'string') {
                                        try {
                                            const parsedValue = JSON.parse(valueFromDB);
                                            if (typeof parsedValue === 'object' && parsedValue !== null && Array.isArray(parsedValue.filename) && Array.isArray(parsedValue.url)) {
                                                acc[key] = { ...entry, value: parsedValue };
                                            } else {
                                                console.warn(`Parsed value for package item ${item.dataId}, key ${key}, is not the expected object structure. Keeping original string. Parsed:`, parsedValue);
                                                acc[key] = { ...entry, value: valueFromDB };
                                            }
                                        } catch (parseError) {
                                            console.error(`Failed to parse value for package item ${item.dataId}, key ${key}. Keeping original string. Error:`, parseError, `Value:`, valueFromDB);
                                            acc[key] = { ...entry, value: valueFromDB };
                                        }
                                    } else if (typeof valueFromDB === 'object' && valueFromDB !== null) {
                                        console.log(`Value for package item ${item.dataId}, key ${key} is already an object.`);
                                        acc[key] = { ...entry, value: valueFromDB };
                                    } else {
                                        console.warn(`Unexpected value type for package item ${item.dataId}, key ${key}:`, valueFromDB);
                                        acc[key] = { ...entry, value: valueFromDB };
                                    }
                                } else {
                                    console.warn(`Invalid entry structure (missing 'value'?) for package item ${item.dataId}, key ${key}:`, entry);
                                    acc[key] = entry;
                                }
                                return acc;
                            }, {} as Record<string, any>);
                        } else {
                            console.warn(`variableData for package item ${item.dataId} is not a valid object:`, variableDataFromDB);
                        }

                        return {
                            dataId: item.dataId ?? -1,
                            name: item.name ?? "null",
                            dataLength: item.dataLength ?? 0,
                            variableData: processedVariableData
                        };
                    }).filter(item => item.dataId !== -1);
                };

                const globalVariablePackageData = processGlobalVariablePackageData(productManager.globalVariablePackageData);

                /*
                console.log('Processed globalVariablePackageData:', {
                    original: productManager.globalVariablePackageData,
                    processed: globalVariablePackageData,
                    count: globalVariablePackageData.length
                });
                */

                const mainKeyString = Array.isArray(productManager.mainKeyString)
                    ? productManager.mainKeyString.map((value: any, index: number) => ({
                        index,
                        type: value?.type || "null",
                        value: value?.value || "null",
                    }))
                    : [];

                const enhancedResponse = {
                    ...productManager,
                    mainKeyString,
                    tableSheet,
                    tableCellData,
                    globalVariableClassData,
                    globalVariablePackageData,
                    icon: productManager.icon.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                    iconPreview: productManager.iconPreview.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                    pdf: productManager.pdf.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                    pdfPreview: productManager.pdfPreview.map(filename => ({
                        filename,
                        url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                    })),
                };

                res.status(200).json(enhancedResponse);
                // console.log('GET request successful:', enhancedResponse);
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
                    const query = productType ? { _id: id, productType } : { _id: id };
                    const productManager = await ProductManager.findOne(query);

                    if (!productManager) {
                        return res.status(404).json({ error: 'Product manager not found' });
                    }

                    const formFields = req.body;

                    let existingIcons: string[] = [];
                    try {
                        if (formFields.existingIconsJson && typeof formFields.existingIconsJson === 'string') {
                            existingIcons = JSON.parse(formFields.existingIconsJson);
                            if (!Array.isArray(existingIcons)) {
                                console.warn('Parsed existingIconsJson was not an array, defaulting to empty.');
                                existingIcons = [];
                            }
                        } else {
                            console.log('existingIconsJson field not found or not a string.');
                        }
                    } catch (e) {
                        console.error("Failed to parse existingIconsJson:", e);
                        existingIcons = [];
                    }
                    console.log("Parsed existingIcons:", existingIcons);


                    let existingPDFs: string[] = [];
                    try {
                        if (formFields.existingPdfsJson && typeof formFields.existingPdfsJson === 'string') {
                            existingPDFs = JSON.parse(formFields.existingPdfsJson);
                            if (!Array.isArray(existingPDFs)) {
                                console.warn('Parsed existingPdfsJson was not an array, defaulting to empty.');
                                existingPDFs = [];
                            }
                        } else {
                            console.log('existingPdfsJson field not found or not a string.');
                        }
                    } catch (e) {
                        console.error("Failed to parse existingPdfsJson:", e);
                        existingPDFs = [];
                    }
                    console.log("Parsed existingPDFs:", existingPDFs);

                    const allUploadedFiles = (req as any).files || [];
                    const uploadedIconFiles = allUploadedFiles.filter((file: Express.Multer.File) =>
                        file.mimetype.startsWith('image/')
                    );
                    const uploadedPdfFiles = allUploadedFiles.filter((file: Express.Multer.File) =>
                        file.mimetype === 'application/pdf'
                    );

                    const newIcons = await Promise.all(
                        uploadedIconFiles.map(async (file: Express.Multer.File) => {
                            const bucket = await getGridFSBucket();
                            const filename = file.originalname;

                            const existingGridFSFiles = await bucket.find({
                                filename,
                                'metadata.productId': id,
                            }).toArray();
                            if (existingGridFSFiles.length > 0) {
                                console.log(`Deleting ${existingGridFSFiles.length} existing GridFS file(s) named ${filename} before icon upload.`);
                                await Promise.all(existingGridFSFiles.map((f) => bucket.delete(f._id)));
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
                            console.log(`Uploaded new icon: ${filename}`);
                            return filename;
                        })
                    );

                    const allIcons = [...existingIcons, ...newIcons];

                    const newPDFs = await Promise.all(
                        uploadedPdfFiles.map(async (file: Express.Multer.File) => {
                            const bucket = await getGridFSBucket();
                            const filename = file.originalname;

                            const existingGridFSFiles = await bucket.find({
                                filename,
                                'metadata.productId': id,
                            }).toArray();
                            if (existingGridFSFiles.length > 0) {
                                console.log(`Deleting ${existingGridFSFiles.length} existing GridFS file(s) named ${filename} before PDF upload.`);
                                await Promise.all(existingGridFSFiles.map((f) => bucket.delete(f._id)));
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
                            console.log(`Uploaded new PDF: ${filename}`);
                            return filename;
                        })
                    );

                    const allPDFs = [...existingPDFs, ...newPDFs];

                    let updateData: Record<string, any> = {};

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
                    ];

                    const sanitizedData = Object.keys(formFields).reduce((acc, key) => {
                        const value = formFields[key];
                        if (allowedFields.includes(key)) {
                            // acc[key] = Array.isArray(value) ? value[0] : value;
                            acc[key] = formFields[key];
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

                    if (Object.keys(sanitizedData).length > 0) {
                        updateData = { ...updateData, ...sanitizedData };
                    }

                    const uniqueIcons = Array.from(new Set(allIcons));
                    const uniquePdfs = Array.from(new Set(allPDFs));

                    if (uniqueIcons.length > 0) {
                        updateData.icon = uniqueIcons;
                        updateData.iconPreview = uniqueIcons.map(filename =>
                            `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        );
                    } else {
                        updateData.icon = [];
                        updateData.iconPreview = [];
                    }

                    if (uniquePdfs.length > 0) {
                        updateData.pdf = uniquePdfs;
                        updateData.pdfPreview = uniquePdfs.map(filename =>
                            `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        );
                    } else {
                        updateData.pdf = [];
                        updateData.pdfPreview = [];
                    }

                    let tableCellDataFromBody = req.body.tableCellData;
                    const approvedTableCellClearFlag = req.body.approvedTableCellClear === 'true';

                    interface ProcessedCellData {
                        index: number;
                        classKey: string;
                        value: string | string[];
                        isComposite: boolean;
                        isPackage: boolean;
                        isDisabled: boolean; // Make isDisabled non-optional for internal processing
                    }

                    let incomingTableCellDataItems: ProcessedCellData[] | undefined = undefined;
                    let processingError = false;

                    if (tableCellDataFromBody === undefined) {
                        if (approvedTableCellClearFlag) {
                            console.log("tableCellData absent and approvedClear=true. Clearing.");
                            updateData.tableCellData = [];
                        } else {
                            console.log("tableCellData absent but approvedClear=false/absent. Skipping update.");
                        }
                    } else if (!Array.isArray(tableCellDataFromBody)) {
                        console.error("Received tableCellData is not an array. Skipping update.", tableCellDataFromBody);
                        processingError = true;
                    } else if (tableCellDataFromBody.length === 0) {
                        if (approvedTableCellClearFlag) {
                            console.log("Empty tableCellData array and approvedClear=true. Clearing.");
                            updateData.tableCellData = [];
                        } else {
                            console.log("Empty tableCellData array but approvedClear=false/absent. Skipping update.");
                        }
                    } else if (tableCellDataFromBody.length === 1 && tableCellDataFromBody[0] === '[]') {
                        console.warn("Received legacy '[]' string marker, treating as empty.");
                        updateData.tableCellData = [];
                    } else if (tableCellDataFromBody.length % 6 !== 0) { 
                        console.error(`Received tableCellData with incorrect number of items (${tableCellDataFromBody.length}), expected sextuplets (index, key, value, isComposite, isPackage, isDisabled). Skipping update.`, tableCellDataFromBody);
                        processingError = true;
                    } else {
                        const processedItems: ProcessedCellData[] = [];
                        for (let i = 0; i < tableCellDataFromBody.length; i += 6) {
                            const indexStr = tableCellDataFromBody[i];
                            const classKey = tableCellDataFromBody[i + 1];
                            const valueStr = tableCellDataFromBody[i + 2];
                            const isCompositeStr = tableCellDataFromBody[i + 3];
                            const isPackageStr = tableCellDataFromBody[i + 4];
                            const isDisabledStr = tableCellDataFromBody[i + 5];

                            const index = parseInt(indexStr, 10);
                            const isComposite = isCompositeStr === 'true';
                            const isPackage = isPackageStr === 'true';
                            const isDisabled = isDisabledStr === 'true';

                            if (isNaN(index) || typeof classKey !== 'string' || typeof valueStr !== 'string' || typeof isCompositeStr !== 'string' || typeof isPackageStr !== 'string' || typeof isDisabledStr !== 'string') {
                                console.warn(`Malformed item at index ${i / 6}. Skipping.`, { indexStr, classKey, valueStr, isCompositeStr, isPackageStr, isDisabledStr });
                                processingError = true;
                                continue;
                            }

                            let finalValue: string | string[] = valueStr;
                            if (isComposite) {
                                try {
                                    const parsedArray = JSON.parse(valueStr);
                                    if (Array.isArray(parsedArray)) {
                                        finalValue = parsedArray.map(String);
                                    } else {
                                        console.warn(`Composite value for ${classKey}[${index}] is not a valid JSON array, storing as string:`, valueStr);
                                    }
                                } catch (e) {
                                    console.warn(`Failed to parse composite value for ${classKey}[${index}] as JSON array, storing as string:`, valueStr, e);
                                }
                            }

                            processedItems.push({ index, classKey, value: finalValue, isComposite, isPackage, isDisabled });
                        }
                        incomingTableCellDataItems = processedItems;
                        console.log(`Processed ${incomingTableCellDataItems.length} tableCellData items from flat array.`);
                    }

                    if (incomingTableCellDataItems && !processingError) {
                        let existingTableCellData: ProcessedCellData[] = (productManager.tableCellData || []).map((item: any): ProcessedCellData => ({
                            index: item?.index ?? -1,
                            classKey: item?.classKey ?? '',
                            value: item?.value,
                            isComposite: item?.isComposite ?? false,
                            isPackage: item?.isPackage ?? false,
                            isDisabled: item?.isDisabled ?? false,
                        })).filter((item: any) => item.index !== -1 && item.classKey !== '');

                        const normalizeData = (data: ProcessedCellData | undefined): ProcessedCellData => {
                            if (!data) return { classKey: "", index: -1, value: "", isComposite: false, isPackage: false, isDisabled: false };
                            return {
                                classKey: data.classKey,
                                index: data.index,
                                value: data.value,
                                isComposite: data.isComposite,
                                isPackage: data.isPackage,
                                isDisabled: data.isDisabled === true,
                            };
                        };

                        const getComparisonSignature = (data: ProcessedCellData | undefined): string => {
                            const normalized = normalizeData(data);
                            const valueString = Array.isArray(normalized.value)
                                ? `[${normalized.value.join('||')}]`
                                : String(normalized.value);
                            return `${normalized.classKey}|${normalized.index}|${normalized.isComposite}|${valueString}|${normalized.isPackage}|${normalized.isDisabled}`;
                        };

                        // This function might not be strictly necessary if signature comparison is robust enough
                        const areItemsEqual = (item1: ProcessedCellData, item2: ProcessedCellData): boolean => {
                            if (item1.classKey !== item2.classKey ||
                                item1.index !== item2.index ||
                                item1.isComposite !== item2.isComposite ||
                                item1.isPackage !== item2.isPackage ||
                                (item1.isDisabled === true) !== (item2.isDisabled === true)
                            ) {
                                return false;
                            }
                            if (Array.isArray(item1.value) && Array.isArray(item2.value)) {
                                if (item1.value.length !== item2.value.length) return false;
                                for (let i = 0; i < item1.value.length; i++) {
                                    if (item1.value[i] !== item2.value[i]) return false;
                                }
                                return true;
                            }
                            return item1.value === item2.value;
                        };

                        const existingDataMap = new Map<string, ProcessedCellData>();
                        existingTableCellData.forEach(item => {
                            const sig = getComparisonSignature(item);
                            existingDataMap.set(sig, item);
                        });

                        const incomingDataMap = new Map<string, ProcessedCellData>();
                        incomingTableCellDataItems.forEach(item => {
                            const sig = getComparisonSignature(item);
                            incomingDataMap.set(sig, item);
                        });

                        const dataToDelete: ProcessedCellData[] = [];
                        existingDataMap.forEach((value, key) => {
                            if (!incomingDataMap.has(key)) {
                                dataToDelete.push(value);
                            }
                        });

                        const dataToAdd: ProcessedCellData[] = [];
                        incomingDataMap.forEach((value, key) => {
                            if (!existingDataMap.has(key)) {
                                dataToAdd.push(value);
                            }
                        });

                        const hasDataChanges = dataToDelete.length > 0 || dataToAdd.length > 0;

                        if (hasDataChanges) {
                            console.log(`TableCellData changes detected: ${dataToAdd.length} added, ${dataToDelete.length} deleted.`);
                            updateData.tableCellData = incomingTableCellDataItems;
                        } else {
                            console.log("No effective changes detected in tableCellData after normalization.");
                        }
                    } else if (!processingError) {
                        console.log('No incoming tableCellData and clear flag not set. No update.');
                    } else {
                        console.error('Skipping tableCellData update due to processing errors.');
                    }

                    let tableSheetDataFromBody = req.body.tableSheet;
                    const approvedTableSheetClearFlag = req.body.approvedTableSheetClear === 'true';

                    if (tableSheetDataFromBody === undefined) {
                        if (approvedTableSheetClearFlag) {
                            console.log("tableSheet absent and approvedClear=true. Clearing.");
                            updateData.tableSheet = [];
                        } else {
                            console.log("tableSheet absent but approvedClear=false/absent. Skipping update.");
                        }
                    }

                    if (Array.isArray(tableSheetDataFromBody)) {
                        if (tableSheetDataFromBody.length === 0) {
                            if (approvedTableSheetClearFlag) {
                                console.log("Empty tableSheet AND approvedClear=true. Clearing tableSheet.");
                                updateData.tableSheet = [];
                            } else {
                                console.log("Empty tableSheet but approvedClear is false or absent. Skipping tableSheet update to prevent potential data loss.");
                            }
                        } else {
                            console.log("tableSheet received with data. Processing diff.");
                            const tableSheetKeys: { index: number; value: string; isOrigin: boolean }[] = [];

                            if (tableSheetDataFromBody.length % 3 !== 0) {
                                console.error("Received tableSheet with incorrect number of items, expected triplets. Skipping update.", tableSheetDataFromBody);
                            } else {
                                for (let i = 0; i < req.body.tableSheet.length; i += 3) {
                                    const index = parseInt(req.body.tableSheet[i], 10);
                                    const value = req.body.tableSheet[i + 1];
                                    const isOrigin = req.body.tableSheet[i + 2] === 'true';

                                    if (!isNaN(index)) {
                                        tableSheetKeys.push({ index, value, isOrigin });
                                    }
                                }
                            }

                            let existingTableSheet = productManager.tableSheet || [];

                            existingTableSheet = existingTableSheet.map((item: any, idx: number) => {
                                if (typeof item === 'string') {
                                    return { index: idx + 1, value: item, isOrigin: false };
                                } else if (typeof item === 'object') {
                                    return item;
                                } else {
                                    return { index: idx + 1, value: String(item), isOrigin: false };
                                }
                            });

                            const newOriginKey = tableSheetKeys.find((key: any) => key.isOrigin === true);
                            const existingOriginKey = existingTableSheet.find((key: any) => key.isOrigin === true);

                            const normalizeKey = (key: any): { index: number, value: string, isOrigin: boolean } => {
                                if (!key) return { index: -1, value: "", isOrigin: false };

                                if (typeof key === 'string') {
                                    return { index: -1, value: key, isOrigin: false };
                                }

                                if (typeof key === 'object') {
                                    const value = key.value || key.name || key.key || '';
                                    const isOrigin = Boolean(key.isOrigin);
                                    const index = typeof key.index === 'number' ? key.index : -1;

                                    return { index, value, isOrigin };
                                }

                                return { index: -1, value: String(key), isOrigin: false };
                            };

                            const normalizeKeyForComparison = (key: any): { value: string, isOrigin: boolean } => {
                                if (!key) return { value: "", isOrigin: false };

                                if (typeof key === 'string') {
                                    return { value: key, isOrigin: false };
                                }

                                if (typeof key === 'object') {
                                    const value = key.value || key.name || key.key || '';
                                    const isOrigin = Boolean(key.isOrigin);
                                    return { value, isOrigin };
                                }

                                return { value: String(key), isOrigin: false };
                            };

                            const getComparisonSignature = (key: any): string => {
                                const normalized = normalizeKeyForComparison(key);
                                return `${normalized.value}|${normalized.isOrigin}`;
                            };

                            const normalizedExistingKeys = existingTableSheet.map(normalizeKey);
                            const normalizedFrontendKeys = tableSheetKeys.map(normalizeKey);

                            const existingKeySet = new Set(normalizedExistingKeys.map((k: any) => k.value));
                            const frontendKeySet = new Set(normalizedFrontendKeys.map(k => k.value));

                            const keysToDelete = normalizedExistingKeys.filter((dbKey: any) =>
                                !frontendKeySet.has(dbKey.value)
                            );

                            const keysToAdd = normalizedFrontendKeys.filter(frontendKey =>
                                !existingKeySet.has(frontendKey.value)
                            );

                            const keysToUpdate: any = [];
                            for (const frontendKey of normalizedFrontendKeys) {
                                if (!existingKeySet.has(frontendKey.value)) continue;

                                const dbKey = normalizedExistingKeys.find((k: any) => k.value === frontendKey.value);
                                if (!dbKey) continue;

                                const valueDiffers = frontendKey.value !== dbKey.value;
                                const originDiffers = frontendKey.isOrigin !== dbKey.isOrigin;

                                if (valueDiffers || originDiffers) {
                                    keysToUpdate.push({
                                        ...frontendKey,
                                        previousIndex: dbKey.index,
                                        previousIsOrigin: dbKey.isOrigin
                                    });
                                }
                            };

                            function areArraysEquivalent(arr1: any[], arr2: any[]): boolean {
                                if (!arr1 && !arr2) return true;
                                if (!arr1 || !arr2) return false;
                                if (arr1.length !== arr2.length) return false;

                                const set1 = new Set(arr1.map(getComparisonSignature));
                                const set2 = new Set(arr2.map(getComparisonSignature));

                                if (set1.size !== set2.size) return false;

                                for (const signature of set1) {
                                    if (!set2.has(signature)) return false;
                                }

                                return true;
                            }

                            function areArraysEquivalentIgnoringIndex(arr1: any[], arr2: any[]): boolean {
                                if (!arr1 && !arr2) return true;
                                if (!arr1 || !arr2) return false;
                                if (arr1.length !== arr2.length) return false;

                                const set1 = new Set(arr1.map(getComparisonSignature));
                                const set2 = new Set(arr2.map(getComparisonSignature));

                                if (set1.size !== set2.size) return false;

                                for (const signature of set1) {
                                    if (!set2.has(signature)) return false;
                                }

                                return true;
                            }

                            const arraysEquivalent = areArraysEquivalentIgnoringIndex(existingTableSheet, tableSheetKeys);
                            if (arraysEquivalent) {
                                console.log("Arrays are equivalent, no changes needed");
                                return res.status(200).json({
                                    ...productManager.toObject(),
                                    message: 'No changes needed'
                                });
                            }

                            if (!arraysEquivalent) {
                                const set1 = new Set(existingTableSheet.map(getComparisonSignature));
                                const set2 = new Set(tableSheetKeys.map(getComparisonSignature));

                                console.log("Arrays not equivalent - detailed comparison:");

                                console.log("Keys in database not in frontend:",
                                    [...set1].filter((sig: any) => !set2.has(sig)));
                                console.log("Keys in frontend not in database:",
                                    [...set2].filter(sig => !set1.has(sig)));
                            }

                            let originHasChanged = false;

                            if (newOriginKey) {
                                if (!existingOriginKey) {
                                    console.log(`New origin assigned: ${newOriginKey.value}`);
                                    originHasChanged = true;
                                } else if (existingOriginKey.value !== newOriginKey.value) {
                                    console.log(`Origin changed from ${existingOriginKey.value} to ${newOriginKey.value}`);
                                    originHasChanged = true;
                                }
                            } else if (existingOriginKey) {
                                console.log(`Origin removed: ${existingOriginKey.value}`);
                                originHasChanged = true;
                            }

                            const hasClassKeyChanges = keysToDelete.length > 0 || keysToAdd.length > 0 || keysToUpdate.length > 0;

                            if (hasClassKeyChanges || originHasChanged) {
                                let finalTableSheet = [];

                                if (originHasChanged) {
                                    const existingKeysToKeep = existingTableSheet
                                        .filter((dbKey: any) => !keysToDelete.some((key: any) => key.value === dbKey.value))
                                        .map((dbKey: any) => ({
                                            ...dbKey,
                                            isOrigin: false
                                        }));

                                    const newAndUpdatedKeys = [...keysToAdd, ...keysToUpdate];

                                    finalTableSheet = [...existingKeysToKeep, ...newAndUpdatedKeys];

                                    if (newOriginKey) {
                                        finalTableSheet = finalTableSheet.map((key: any) =>
                                            key.value === newOriginKey.value
                                                ? { ...key, isOrigin: true }
                                                : { ...key, isOrigin: false }
                                        );
                                    }
                                } else if (hasClassKeyChanges) {
                                    console.log('Only class key changes detected');
                                    if (keysToDelete.length > 0 && keysToAdd.length === 0 && keysToUpdate.length === 0) {
                                        console.error("CRITICAL WARNING: About to delete all keys with no replacements");
                                        console.error("This looks like a data loss scenario, aborting operation");

                                        return res.status(400).json({
                                            error: "Prevented potential data loss. Attempted to delete all keys without replacement."
                                        })
                                    };

                                    const existingKeysToKeep = existingTableSheet.filter((dbKey: any) =>
                                        !keysToDelete.some((key: any) => key.value === dbKey.value) &&
                                        !keysToUpdate.some((key: any) => key.value === dbKey.value)
                                    );

                                    const updatedKeys = keysToUpdate.map((frontendKey: any) => {
                                        const dbKey = existingTableSheet.find((key: any) => key.value === frontendKey.value);
                                        return {
                                            index: frontendKey.index,
                                            value: frontendKey.value,
                                            isOrigin: dbKey ? dbKey.isOrigin : frontendKey.isOrigin
                                        };
                                    });

                                    finalTableSheet = [...existingKeysToKeep, ...keysToAdd, ...updatedKeys];
                                }

                                const uniqueValues = new Set();
                                const uniqueTableSheet = finalTableSheet.filter((key: any) => {
                                    if (uniqueValues.has(key.value)) {
                                        return false;
                                    }
                                    uniqueValues.add(key.value);
                                    return true;
                                });

                                updateData.tableSheet = uniqueTableSheet;

                                console.log('Keys to delete:', keysToDelete);
                                console.log('Keys to add:', keysToAdd);
                                console.log('Keys to update:', keysToUpdate);
                                console.log('Origin has changed:', originHasChanged);
                                console.log('Has class key changes:', hasClassKeyChanges);
                            }
                        }
                    } else {
                        console.log('No changes detected in tableSheet');
                    }

                    const approvedVariableClassClearFlag = formFields.approvedGlobalVariableClassClear === 'true';
                    let incomingVariableClassData: any[] | undefined = undefined;
                    let variableClassParseError = false;

                    const rawGlobalVariableClassData = formFields.globalVariableClassData;

                    console.log('Backend PATCH: Type of raw globalVariableClassData:', typeof rawGlobalVariableClassData);
                    if (Array.isArray(rawGlobalVariableClassData)) {
                        console.log('Backend PATCH: Received as array of length:', rawGlobalVariableClassData.length);
                    }

                    if (rawGlobalVariableClassData !== undefined && typeof rawGlobalVariableClassData === 'string') {
                        try {
                            const parsedData = JSON.parse(rawGlobalVariableClassData);
                            if (Array.isArray(parsedData)) {
                                incomingVariableClassData = parsedData.map((item: any, index: number) => {
                                    if (typeof item === 'object' && item !== null &&
                                        typeof item.dataId === 'number' &&
                                        typeof item.name === 'string' &&
                                        typeof item.dataLength === 'number' &&
                                        typeof item.variableData === 'object' && item.variableData !== null) {
                                        return item;
                                    } else {
                                        console.warn(`Invalid item structure in globalVariableClassData at index ${index}. Skipping item. Item:`, item);
                                        variableClassParseError = true;
                                        return null;
                                    }
                                }).filter(item => item !== null);

                                if (variableClassParseError) {
                                    console.warn("Found invalid items during globalVariableClassData parsing. Update for this field will be skipped.");
                                    incomingVariableClassData = undefined;
                                } else if (incomingVariableClassData.length > 0) {
                                    console.log(`Successfully parsed ${incomingVariableClassData.length} globalVariableClassData items.`);
                                } else {
                                    console.log("Successfully parsed globalVariableClassData as an empty array.");
                                }
                            } else {
                                console.error("Parsed globalVariableClassData is not an array. Skipping update for this field.");
                                variableClassParseError = true;
                            }
                        } catch (jsonParseError) {
                            console.error("Failed to parse globalVariableClassData JSON string:", jsonParseError);
                            variableClassParseError = true;
                        }
                    } else if (rawGlobalVariableClassData !== undefined) {
                        console.error(`Unexpected type for globalVariableClassData: ${typeof rawGlobalVariableClassData}. Expected a JSON string. Skipping update for this field.`);
                        variableClassParseError = true;
                    } else {
                        console.log("globalVariableClassData field is absent from the request.");
                    }

                    if (incomingVariableClassData) {
                    }

                    if (!variableClassParseError) {

                        const ensureArray = (data: any): any[] => {
                            if (Array.isArray(data)) {

                                return data.filter(item => item && typeof item === 'object');
                            }
                            return [];
                        };

                        const existingVariableClassData = ensureArray(productManager.globalVariableClassData);

                        let variableClassChanged = false;
                        let finalVariableClassData: any[] = existingVariableClassData;

                        if (incomingVariableClassData === undefined) {
                            if (approvedVariableClassClearFlag && existingVariableClassData.length > 0) {
                                finalVariableClassData = [];
                                variableClassChanged = true;
                                console.log("globalVariableClassData absent and approvedClear=true. Clearing.");
                            } else {
                                console.log("globalVariableClassData absent and approvedClear=false/absent. No change.");
                            }
                        } else {
                            const currentIncomingVariableClassData = ensureArray(incomingVariableClassData);
                            const sortById = (a: any, b: any) => (a?.dataId ?? 0) - (b?.dataId ?? 0);

                            const sortedExisting = [...existingVariableClassData].sort(sortById);
                            const sortedIncoming = [...currentIncomingVariableClassData].sort(sortById);


                            if (!isEqual(sortedExisting, sortedIncoming)) {

                                finalVariableClassData = currentIncomingVariableClassData;
                                variableClassChanged = true;
                                console.log(`Changes detected in globalVariableClassData. Updating.`);
                            } else {
                                console.log("No changes detected in globalVariableClassData.");
                            }
                        }

                        if (variableClassChanged) {
                            updateData.globalVariableClassData = finalVariableClassData;
                        }

                        if (variableClassChanged) {
                            updateData.globalVariableClassData = finalVariableClassData;
                        }
                    } else {
                        console.warn("Skipping globalVariableClassData update due to previous parsing or validation errors.");
                    }

                    const approvedVariablePackageClearFlag = formFields.approvedGlobalVariablePackageClear === 'true';
                    let incomingVariablePackageData: any[] | undefined = undefined;
                    let variablePackageParseError = false;

                    const rawGlobalVariablePackageData = formFields.globalVariablePackageData;

                    if (rawGlobalVariablePackageData !== undefined && typeof rawGlobalVariablePackageData === 'string') {
                        try {
                            const parsedData = JSON.parse(rawGlobalVariablePackageData);
                            if (Array.isArray(parsedData)) {
                                incomingVariablePackageData = parsedData.map((item: any, index: number) => {
                                    if (typeof item === 'object' && item !== null &&
                                        typeof item.dataId === 'number' &&
                                        typeof item.name === 'string' &&
                                        typeof item.dataLength === 'number' &&
                                        typeof item.variableData === 'object' && item.variableData !== null) {
                                        // NOTE: Deeper validation of variableData contents (value object) might be needed here later
                                        return item;
                                    } else {
                                        console.warn(`Invalid item structure in globalVariablePackageData at index ${index}. Skipping item. Item:`, item);
                                        variablePackageParseError = true;
                                        return null;
                                    }
                                }).filter(item => item !== null);

                                if (variablePackageParseError) {
                                    console.warn("Found invalid items during globalVariablePackageData parsing. Update for this field will be skipped.");
                                    incomingVariablePackageData = undefined;
                                } else if (incomingVariablePackageData.length > 0) {
                                    console.log(`Successfully parsed ${incomingVariablePackageData.length} globalVariablePackageData items.`);
                                } else {
                                    console.log("Successfully parsed globalVariablePackageData as an empty array.");
                                }
                            } else {
                                console.error("Parsed globalVariablePackageData is not an array. Skipping update for this field.");
                                variablePackageParseError = true;
                            }
                        } catch (jsonParseError) {
                            console.error("Failed to parse globalVariablePackageData JSON string:", jsonParseError);
                            variablePackageParseError = true;
                        }
                    } else if (rawGlobalVariablePackageData !== undefined) {
                        console.error(`Unexpected type for globalVariablePackageData: ${typeof rawGlobalVariablePackageData}. Expected a JSON string. Skipping update for this field.`);
                        variablePackageParseError = true;
                    } else {
                        console.log("globalVariablePackageData field is absent from the request.");
                    }

                    if (incomingVariablePackageData) {
                    }

                    if (!variablePackageParseError) {
                        const ensureArray = (data: any): any[] => {
                            if (Array.isArray(data)) {
                                return data.filter(item => item && typeof item === 'object');
                            }
                            return [];
                        };

                        const existingVariablePackageData = ensureArray(productManager.globalVariablePackageData);
                        let variablePackageChanged = false;
                        let finalVariablePackageData: any[] = existingVariablePackageData;

                        if (incomingVariablePackageData === undefined) {
                            if (approvedVariablePackageClearFlag && existingVariablePackageData.length > 0) {
                                finalVariablePackageData = [];
                                variablePackageChanged = true;
                                console.log("globalVariablePackageData absent/invalid and approvedClear=true. Clearing.");
                            } else {
                                console.log("globalVariablePackageData absent/invalid and approvedClear=false/absent. No change.");
                            }
                        } else {
                            const currentIncomingVariablePackageData = ensureArray(incomingVariablePackageData);
                            const sortById = (a: any, b: any) => (a?.dataId ?? 0) - (b?.dataId ?? 0);

                            const sortedExisting = [...existingVariablePackageData].sort(sortById);
                            const sortedIncoming = [...currentIncomingVariablePackageData].sort(sortById);

                            if (!isEqual(sortedExisting, sortedIncoming)) {
                                finalVariablePackageData = currentIncomingVariablePackageData;
                                variablePackageChanged = true;
                                console.log(`Changes detected in globalVariablePackageData. Updating.`);
                            } else {
                                console.log("No changes detected in globalVariablePackageData.");
                            }
                        }

                        if (variablePackageChanged) {
                            updateData.globalVariablePackageData = finalVariablePackageData;
                        }
                    } else {
                        console.warn("Skipping globalVariablePackageData update due to previous parsing or validation errors.");
                    }

                    if (Object.keys(updateData).length === 0 && allUploadedFiles.length === 0) {
                        return res.status(200).json({
                            ...productManager.toObject(),
                            message: 'No changes detected.'
                        });
                    }

                    const updatedManager = await ProductManager.findOneAndUpdate(
                        query,
                        { $set: updateData },
                        { new: true, runValidators: true }
                    ).lean() as IProductManager | null;

                    if (!updatedManager) {
                        return res.status(404).json({ error: 'Product manager not found after update attempt' });
                    }


                    const responsePayload = {
                        ...updatedManager,

                        icon: (updatedManager.icon || []).map((filename: string) => ({
                            filename,
                            url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        })),
                        iconPreview: (updatedManager.iconPreview || updatedManager.icon || []).map((filename: string) => ({
                            filename,
                            url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        })),
                        pdf: (updatedManager.pdf || []).map((filename: string) => ({
                            filename,
                            url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        })),
                        pdfPreview: (updatedManager.pdfPreview || updatedManager.pdf || []).map((filename: string) => ({
                            filename,
                            url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        })),

                        globalVariableClassData: updatedManager.globalVariableClassData || [],
                        globalVariablePackageData: updatedManager.globalVariablePackageData || [],
                        tableCellData: updatedManager.tableCellData || [],
                        tableSheet: updatedManager.tableSheet || [],

                        message: 'Product manager updated successfully'
                    };

                    res.status(200).json(responsePayload);

                } catch (error) {
                    console.error('Error processing PATCH request:', error);
                    if (error instanceof Error && error.name === 'ValidationError') {
                        return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
                    }
                    res.status(500).json({ error: 'Error processing PATCH request' });
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

                const pdfFilenames = productManager.pdf;
                for (const filename of pdfFilenames) {
                    const files = await bucket.find({ filename }).toArray();
                    await Promise.all(files.map(file => bucket.delete(file._id)));
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
