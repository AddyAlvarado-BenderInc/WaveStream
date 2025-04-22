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

                const processTableCellData = (data: any) => {
                    if (!data) return [];

                    if (Array.isArray(data)) {
                        return data.map((item: any) => {
                            if (item &&
                                typeof item === 'object' &&
                                'index' in item &&
                                'value' in item &&
                                'classKey' in item) {
                                return {
                                    index: typeof item.index === 'number' ? item.index : 0,
                                    classKey: item.classKey?.toString() || "null",
                                    value: item.value?.toString() || "null"
                                };
                            }

                            if (typeof item === 'string' || typeof item === 'number') {
                                console.warn(`Converting legacy data format for item: ${item}`);
                                return {
                                    index: 0,
                                    classKey: "legacy",
                                    value: item.toString()
                                };
                            }

                            if (item?.value && typeof item.value === 'object') {
                                return {
                                    index: typeof item.index === 'number' ? item.index : 0,
                                    classKey: item.classKey?.toString() || "null",
                                    value: JSON.stringify(item.value)
                                };
                            }

                            console.warn('Invalid tableCellData item:', item);
                            return {
                                index: 0,
                                classKey: "invalid",
                                value: "null"
                            };
                        }).filter((item: any) =>
                            item &&
                            typeof item.index === 'number' &&
                            typeof item.classKey === 'string' &&
                            typeof item.value === 'string'
                        );
                    }

                    console.warn('tableCellData is not an array:', data);
                    return [];
                };

                const tableCellData = processTableCellData(productManager.tableCellData);

                console.log('Processed tableCellData:', {
                    original: productManager.tableCellData,
                    processed: tableCellData,
                    count: tableCellData.length
                });

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

                console.log('Processed globalVariableClassData:', {
                    original: productManager.globalVariableClassData,
                    processed: globalVariableClassData,
                    count: globalVariableClassData.length
                });

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
                    const query = productType ? { _id: id, productType } : { _id: id };
                    const productManager = await ProductManager.findOne(query);

                    if (!productManager) {
                        return res.status(404).json({ error: 'Product manager not found' });
                    }

                    const uploadedFiles = (req as any).files || [];
                    const existingIcons = Array.isArray(req.body.icons) ? req.body.icons : [];

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

                    const allIcons = [...existingIcons, ...newIcons];

                    const formFields = req.body ? JSON.parse(JSON.stringify(req.body)) : {};

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
                            acc[key] = Array.isArray(value) ? value[0] : value;
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

                    if (allIcons.length > 0 || uploadedFiles.length > 0) {
                        updateData.icon = allIcons;
                        updateData.iconPreview = allIcons.map(filename =>
                            `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        );
                    }

                    let tableCellDataFromBody = req.body.tableCellData;
                    const approvedTableCellClearFlag = req.body.approvedTableCellClear === 'true';

                    if (tableCellDataFromBody === undefined) {
                        if (approvedTableCellClearFlag) {
                            console.log("tableCellData absent and approvedClear=true. Clearing.");
                            updateData.tableCellData = [];
                        } else {
                            console.log("tableCellData absent but approvedClear=false/absent. Skipping update.");
                        }
                    }

                    if (tableCellDataFromBody) {
                        if (tableCellDataFromBody.length === 0) {
                            if (approvedTableCellClearFlag) {
                                console.log("Empty tableCellData array and approvedClear=true. Clearing.");
                                updateData.tableCellData = [];
                            } else {
                                console.log("Empty tableCellData array but approvedClear=false/absent. Skipping update.");
                            }
                        } else {
                            const tableCellDataItems: { index: number; value: string; classKey: string }[] = [];
                            if (tableCellDataFromBody.length === 1 && tableCellDataFromBody[0] === '[]') {
                                console.warn("Received legacy '[]' string marker, treating as empty.");
                                updateData.tableCellData = [];
                            } else if (tableCellDataFromBody.length % 3 !== 0) {
                                console.error("Received tableCellData with incorrect number of items, expected triplets. Skipping update.", tableCellDataFromBody);
                                res.status(400).json({ error: 'Malformed tableCellData' });
                            } else {
                                for (let i = 0; i < req.body.tableCellData.length; i += 3) {
                                    const classKey = req.body.tableCellData[i + 1];
                                    const index = parseInt(req.body.tableCellData[i], 10);
                                    const value = req.body.tableCellData[i + 2];

                                    if (!isNaN(index)) {
                                        tableCellDataItems.push({ index, value, classKey });
                                    }
                                }
                            }

                            let existingTableCellData = productManager.tableCellData || [];

                            existingTableCellData = existingTableCellData.map((item: any, idx: number) => {
                                if (typeof item === 'string') {
                                    return { classKey: item, index: idx + 1, value: item };
                                } else if (typeof item === 'object') {
                                    return item;
                                } else {
                                    return { classKey: String(item), index: idx + 1, value: String(item) };
                                }
                            });

                            const normalizeData = (data: any): { classKey: string, index: number, value: string } => {
                                if (!data) return { classKey: "", index: -1, value: "" };

                                if (typeof data === 'string') {
                                    return { classKey: data, index: -1, value: data };
                                }

                                if (typeof data === 'object') {
                                    const classKey = data.classKey || data.name || '';
                                    const value = data.value || data.name || '';
                                    const index = typeof data.index === 'number' ? data.index : -1;

                                    return { classKey, index, value };
                                }

                                return { classKey: String(data), index: -1, value: String(data) };
                            };

                            const getComparisonSignature = (data: any): string => {
                                const normalized = normalizeData(data);
                                return `${normalized.classKey}|${normalized.index}|${normalized.value}`;
                            };

                            const normalizedExistingData = existingTableCellData.map(normalizeData);
                            const normalizedNewData = tableCellDataItems.map(normalizeData);

                            const existingDataSet = new Set(normalizedExistingData.map(getComparisonSignature));
                            const newDataSetSignatures = new Set(normalizedNewData.map(getComparisonSignature));

                            const dataToDelete = normalizedExistingData.filter((dbData: any) =>
                                !newDataSetSignatures.has(getComparisonSignature(dbData))
                            );

                            const dataToAdd = normalizedNewData.filter(newData =>
                                !existingDataSet.has(getComparisonSignature(newData))
                            );

                            const dataToUpdate: any = [];
                            const updatedSignatures = new Set<string>();
                            for (const newData of normalizedNewData) {
                                const newDataSignature = getComparisonSignature(newData);
                                if (!existingDataSet.has(newData.value)) continue;

                                const dbData = normalizedExistingData.find((d: any) => getComparisonSignature(d) === newDataSignature);

                                if (dbData) {
                                    if (!isEqual(normalizeData(dbData), normalizeData(newData))) {
                                        if (!updatedSignatures.has(newDataSignature)) {
                                            dataToUpdate.push({ ...newData });
                                            updatedSignatures.add(newDataSignature);
                                        }
                                    }
                                }

                                const valueDiffers = newData.value !== dbData.value;

                                if (valueDiffers) {
                                    dataToUpdate.push({
                                        ...newData,
                                        previousIndex: dbData.index
                                    });
                                }
                            }

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

                            const arraysEquivalent = areArraysEquivalent(existingTableCellData, tableCellDataItems);

                            if (arraysEquivalent) {
                                console.log("TableCellData arrays are equivalent, no changes needed");
                            } else {
                                console.log("TableCellData arrays not equivalent - detailed comparison:");
                                console.log("Database data:", existingTableCellData.map((data: any) => ({
                                    ...normalizeData(data),
                                    signature: getComparisonSignature(data)
                                })));
                                console.log("Frontend data:", tableCellDataItems.map(data => ({
                                    ...normalizeData(data),
                                    signature: getComparisonSignature(data)
                                })));

                                const hasDataChanges = dataToDelete.length > 0 || dataToAdd.length > 0 || dataToUpdate.length > 0;

                                if (hasDataChanges) {
                                    const dataToDeleteSignatures = new Set(dataToDelete.map(getComparisonSignature));
                                    const dataToUpdateSignatures = new Set(dataToUpdate.map(getComparisonSignature));
                                    const existingDataToKeep = existingTableCellData.filter((dbItem: any) => {
                                        const signature = getComparisonSignature(dbItem);
                                        return !dataToDeleteSignatures.has(signature) && !dataToUpdateSignatures.has(signature);
                                    });

                                    const updatedItemsForFinalArray = dataToUpdate.map((newDataItem: any) => ({
                                        classKey: newDataItem.classKey,
                                        index: newDataItem.index,
                                        value: newDataItem.value
                                    }));

                                    const finalTableCellData = [...existingDataToKeep, ...dataToAdd, ...updatedItemsForFinalArray];

                                    const uniqueSignatures = new Set();
                                    const uniqueTableCellData = finalTableCellData.filter((data: any) => {
                                        const signature = getComparisonSignature(data);
                                        if (uniqueSignatures.has(signature)) return false;
                                        uniqueSignatures.add(signature);
                                        return true;
                                    });

                                    updateData.tableCellData = uniqueTableCellData;

                                    console.log('Cell data to delete:', dataToDelete);
                                    console.log('Cell data to add:', dataToAdd);
                                    console.log('Cell data to update:', dataToUpdate);
                                    console.log('Has cell data changes:', hasDataChanges);
                                }
                            }
                        }
                    } else {
                        console.log('No changes detected in tableCellData');
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
                                console.log("Database keys:", existingTableSheet.map((key: any) => ({
                                    ...normalizeKey(key),
                                    signature: getComparisonSignature(key)
                                })));
                                console.log("Frontend keys:", tableSheetKeys.map(key => ({
                                    ...normalizeKey(key),
                                    signature: getComparisonSignature(key)
                                })));

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

                    console.log('Backend PATCH: Received raw globalVariableClassData:', rawGlobalVariableClassData);
                    console.log('Backend PATCH: Type of raw globalVariableClassData:', typeof rawGlobalVariableClassData);
                    if (Array.isArray(rawGlobalVariableClassData)) {
                        console.log('Backend PATCH: Received as array of length:', rawGlobalVariableClassData.length);
                        console.log('Backend PATCH: First element:', rawGlobalVariableClassData[0]);
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
                        console.log(">>> DEBUG: Backend parsed incomingVariableClassData:", JSON.stringify(incomingVariableClassData, null, 2));
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
                            console.log(">>> DEBUG: Backend updateData.globalVariableClassData BEFORE save:", JSON.stringify(updateData.globalVariableClassData, null, 2));
                        }
                    } else {
                        console.warn("Skipping globalVariableClassData update due to previous parsing or validation errors.");
                    }

                    if (Object.keys(updateData).length === 0) {
                        return res.status(400).json({ error: 'No valid fields provided for update' });
                    }

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
                        iconPreview: allIcons.map(filename => ({
                            filename,
                            url: `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(filename)}`
                        })),
                        globalVariableClassData: Array.isArray(productManager.globalVariableClassData) ? productManager.globalVariableClassData : [],
                        message: 'Product manager updated successfully'
                    });
                } catch (error) {
                    console.error('Error processing PATCH request:', error);
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