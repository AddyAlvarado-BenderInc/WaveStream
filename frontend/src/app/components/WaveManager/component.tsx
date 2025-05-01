import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store/store';
import { setVariableClassArray, setVariablePackageArray } from "../../store/productManagerSlice";
import { convertToTableFormat } from '../../utility/packageDataTransformer';
import { ProductManager, IconData, tableSheetData, tableCellData, variableClassArray, variablePackageArray, IGlobalVariablePackage } from '../../../../types/productManager';
import VariableManager from '../VariableManager/component';
import PropertyInterfaceTable from '../PropertyInterfaces/component';
import { BASE_URL } from '../../config';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isEqual, set } from 'lodash';
import axios from 'axios';
import dotenv from 'dotenv';
import path from "path";

dotenv.config({
    path: path.resolve(process.cwd(), '../../../../', '.env')
});

interface FormDataState {
    itemName: string;
    productId: string;
    description: string;
    initialJS: string;
    initialCSS: string;
    initialHTML: string;
    label: string;
}

interface IconDataState {
    icon: IconData[];
    iconPreview: IconData[];
    newFiles: File[];
}

interface VariableClassArray {
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: string;
    } | null>;
}

interface VariablePackageArray {
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>;
}

type VariableClassArrayState = Array<variableClassArray | null | undefined>;

type VariablePackageArrayState = Array<variablePackageArray | null | undefined>;

interface VariableDataState {
    tableSheet: tableSheetData[];
}

type VariableRowDataState = Record<string, tableCellData>;

interface WaveManagerProps {
    productManager: ProductManager & { globalVariableClass?: VariableClassArray, globalVariablePackage?: VariablePackageArray };
}

interface OriginalData {
    formData: FormDataState;
    iconData: IconDataState;
    variableData: VariableDataState;
    variableRowData: VariableRowDataState;
    variableClassArray: VariableClassArrayState;
    variablePackageArray: VariablePackageArrayState;
}

const javascriptServer = process.env.JS_SERVER_URL || 'http://localhost:3002';
const csharpServer = process.env.CS_SERVER_URL || 'http://localhost:5001';

const now = new Date(Date.now());

const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const year = now.getFullYear().toString().slice(-2);

const formattedDate = `${month}-${day}-${year}`;

let saveClicked = 0;

const WaveManager: React.FC<WaveManagerProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [approvedTableCellClear, setApprovedTableCellClear] = useState(false);
    const [approvedTableSheetClear, setApprovedTableSheetClear] = useState(false);
    const [renderRunModal, setRenderRunModal] = useState(false);
    const [selectedRunOption, setSelectedRunOption] = useState("");
    const [selectedServer, setSelectedServer] = useState("");
    const [server, setServer] = useState("");
    const [automationRunning, setAutomationRunning] = useState(false);

    useEffect(() => {
        console.log("WaveManager: Initializing/Syncing Redux state for globalVariableClassData");
        const parseAndClone = (data: any): VariableClassArrayState => {
            if (Array.isArray(data)) {
                try {
                    console.log("Cloning existing array:", data);
                    return JSON.parse(JSON.stringify(data));
                } catch (e) {
                    console.error("Failed to clone existing array:", e);
                    return [];
                }
            }
            if (typeof data === 'string') {
                try {
                    const parsed = JSON.parse(data);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    console.error("Failed to parse variableClassArray string for Redux init:", e);
                    return [];
                }
            }
            console.warn("Unexpected format for globalVariableClassData:", data);
            return [];
        };

        const initialVariableClassData = parseAndClone(productManager.globalVariableClassData);
        const initialVariablePackageData = parseAndClone(productManager.globalVariablePackageData);

        dispatch(setVariableClassArray(initialVariableClassData));
        dispatch(setVariablePackageArray(initialVariablePackageData));

        setOriginalData(prevOriginal => ({
            ...prevOriginal,
            variableClassArray: initialVariableClassData
        }));

    }, [productManager.globalVariableClassData, dispatch]);

    const [originalData, setOriginalData] = useState<OriginalData>(() => {

        const initialRawPackages = productManager.globalVariablePackageData;
        const initialPackageDataMap = new Map<number, IGlobalVariablePackage>();

        if (Array.isArray(initialRawPackages)) {
            console.log("Initial Load: Processing raw packages for map:", initialRawPackages);
            initialRawPackages.forEach(rawPkg => {
                const tableFormattedPkg = convertToTableFormat(rawPkg as variablePackageArray);
                if (tableFormattedPkg && typeof tableFormattedPkg.dataId === 'number') {
                    initialPackageDataMap.set(tableFormattedPkg.dataId, tableFormattedPkg);
                } else {
                    console.warn("Initial Load: Failed to convert package or invalid ID", rawPkg);
                }
            });
            console.log("Initial Load: Created packageDataMap:", initialPackageDataMap);
        } else {
            console.warn("Initial Load: productManager.globalVariablePackageData is not an array.");
        }

        const parseVariableClassArray = (data: any): VariableClassArrayState => {
            if (Array.isArray(data)) {
                return data;
            }
            if (typeof data === 'string') {
                try {
                    const parsed = JSON.parse(data);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    console.error("Failed to parse variableClassArray string:", e);
                    return [];
                }
            }
            return [];
        };

        const parseVariablePackageArray = (data: any): VariablePackageArrayState => {
            if (Array.isArray(data)) {
                return data;
            }
            if (typeof data === 'object' && data !== null) {
                Object.values(data).filter((item: any) => item != null && item !== undefined);
                return Object.values(data).map((item: any) => ({
                    dataId: item.dataId,
                    name: item.name,
                    dataLength: item.dataLength,
                    variableData: item.variableData || {}
                }));
            }
            return [];
        }

        const normalizeTableCellData = (
            cellDataArray: any,
            packageMap: Map<number, IGlobalVariablePackage>
        ): VariableRowDataState => {
            if (!Array.isArray(cellDataArray)) return {};

            return cellDataArray.reduce((acc: VariableRowDataState, item: any) => {
                if (item && typeof item === 'object' && item.classKey != null && item.index != null) {
                    const key = `${item.classKey}_row_${item.index}`;
                    const isPackage = item.isPackage === true;
                    let finalValue = item.value || '';

                    if (isPackage && (typeof item.value === 'string' || typeof item.value === 'number') && String(item.value).trim() !== '') {
                        const packageId = parseInt(String(item.value), 10);
                        if (!isNaN(packageId) && packageMap.has(packageId)) {
                            finalValue = packageMap.get(packageId)!;
                            console.log(`Initial Load: Mapped package object (ID: ${packageId}) to cell ${key}`);
                        } else {
                            console.warn(`Initial Load: Package cell ${key} ID ${item.value} not found in package map. Storing ID string.`);
                        }
                    } else if (isPackage) {
                        console.warn(`Initial Load: Package cell ${key} has invalid ID:`, item.value);
                    }

                    acc[key] = {
                        classKey: item.classKey,
                        index: item.index,
                        value: finalValue,
                        isComposite: item.isComposite || false,
                        isPackage: isPackage,
                    };
                }
                return acc;
            }, {});
        };

        const normalizeTableSheet = (data: any): tableSheetData[] => {
            if (!Array.isArray(data)) return [];
            return data.map((item: any, index: number) => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        index: item.index ?? index,
                        value: item.value || '',
                        isOrigin: item.isOrigin === true,
                    };
                } else {
                    console.warn(`Unexpected tableSheet item format at index ${index}:`, item);
                    return { index, value: String(item), isOrigin: false };
                }
            });
        };

        return {
            formData: {
                itemName: productManager.itemName || '',
                productId: productManager.productId || '',
                description: productManager.description || '',
                initialJS: productManager.initialJS || '',
                initialCSS: productManager.initialCSS || '',
                initialHTML: productManager.initialHTML || '',
                label: productManager.label || '',
            },
            iconData: {
                icon: (productManager.icon || []).map((icon: IconData) => ({
                    filename: icon?.filename || '',
                    url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
                })),
                iconPreview: (productManager.iconPreview || productManager.icon || []).map((icon: IconData) => ({
                    filename: icon?.filename || '',
                    url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
                })),
                newFiles: []
            },
            variableData: {
                tableSheet: normalizeTableSheet(productManager.tableSheet)
            },
            variableRowData: normalizeTableCellData(productManager.tableCellData, initialPackageDataMap),
            variableClassArray: parseVariableClassArray(productManager.globalVariableClassData),
            variablePackageArray: parseVariablePackageArray(productManager.globalVariablePackageData)
        };
    });

    const [formData, setFormData] = useState<FormDataState>({ ...originalData.formData });
    const [iconData, setIconData] = useState<IconDataState>({ ...originalData.iconData });
    const [variableData, setVariableData] = useState<VariableDataState>({ ...originalData.variableData });
    const [variableRowData, setVariableRowData] = useState<VariableRowDataState>({ ...originalData.variableRowData });
    const [hasChanges, setHasChanges] = useState(false);
    const [showPropertyInterfaces, setShowPropertyInterfaces] = useState(false);

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);
    const globalVariablePackage = useSelector((state: RootState) => state.variables.variableIconPackage);

    console.log('data for globalVariableClass:', globalVariableClass);
    console.log('data for globalVariablePackage:', globalVariablePackage);

    const checkForChanges = useCallback(() => {
        const normalizeTableSheetForCompare = (tableSheet: tableSheetData[]) => {
            return tableSheet.map(item => ({
                value: item.value,
                isOrigin: item.isOrigin
            })).sort((a, b) => (a.value + a.isOrigin).localeCompare(b.value + b.isOrigin));
        };

        const normalizeVariableRowDataForCompare = (data: VariableRowDataState): Array<{ classKey: string, index: number, value: string | string[], isComposite: boolean }> => {
            return Object.values(data).sort((a, b) => `${a.classKey}_${a.index}`.localeCompare(`${b.classKey}_${b.index}`));
        };

        const normalizeVariableClassArrayForCompare = (arr: VariableClassArrayState): VariableClassArray[] => {
            return arr
                .filter((item): item is VariableClassArray => item != null && item !== undefined)
                .map(item => {
                    const safeVariableData = (item.variableData && typeof item.variableData === 'object')
                        ? item.variableData
                        : {};
                    return {
                        ...item,
                        variableData: Object.entries(safeVariableData)
                            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                            .reduce((acc, [key, value]) => {
                                acc[key] = value;
                                return acc;
                            }, {} as typeof item.variableData)
                    };
                })
                .sort((a, b) => a.dataId - b.dataId);
        };

        const normalizeVariablePackageArrayForCompare = (arr: VariablePackageArrayState): VariablePackageArray[] => {
            return arr
                // TODO: this is filtering over a nested object, need to break it down further before filtering each item
                .filter((item): item is VariablePackageArray => item != null && item !== undefined)
                .map(item => {
                    const safeVariableData = (item.variableData && typeof item.variableData === 'object')
                        ? item.variableData
                        : {};
                    return {
                        ...item,
                        variableData: Object.entries(safeVariableData)
                            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                            .reduce((acc, [key, value]) => {
                                acc[key] = value;
                                return acc;
                            }, {} as typeof item.variableData)
                    };
                })
                .sort((a, b) => a.dataId - b.dataId);
        }

        const formDataChanged = !isEqual(formData, originalData.formData);
        const iconDataChanged = iconData.newFiles.length > 0 ||
            !isEqual(iconData.icon.map(i => i.filename).sort(), originalData.iconData.icon.map(i => i.filename).sort());

        const tableSheetChanged = !isEqual(
            normalizeTableSheetForCompare(variableData.tableSheet),
            normalizeTableSheetForCompare(originalData.variableData.tableSheet)
        );

        const variableRowDataChanged = !isEqual(
            normalizeVariableRowDataForCompare(variableRowData),
            normalizeVariableRowDataForCompare(originalData.variableRowData)
        );

        const variableClassArrayChanged = !isEqual(
            normalizeVariableClassArrayForCompare(globalVariableClass),
            normalizeVariableClassArrayForCompare(originalData.variableClassArray)
        );

        const variablePackageArrayChanged = !isEqual(
            normalizeVariablePackageArrayForCompare(globalVariablePackage),
            normalizeVariablePackageArrayForCompare(originalData.variablePackageArray)
        );

        const dataChanged = formDataChanged || iconDataChanged || tableSheetChanged || variableRowDataChanged || variableClassArrayChanged || variablePackageArrayChanged;

        setHasChanges(dataChanged);

        if (dataChanged) {
            console.log('Changes detected:', {
                formDataChanged,
                iconDataChanged,
                tableSheetChanged,
                variableRowDataChanged,
                variableClassArrayChanged,
            });
            if (variableClassArrayChanged) {
                console.log('Original VariableClassArray:', normalizeVariableClassArrayForCompare(originalData.variableClassArray));
                console.log('Current VariableClassArray:', normalizeVariableClassArrayForCompare(globalVariableClass));
            }
            if (variablePackageArrayChanged) {
                console.log('Original VariablePackageArray:', normalizeVariablePackageArrayForCompare(originalData.variablePackageArray));
                console.log('Current VariablePackageArray:', normalizeVariablePackageArrayForCompare(globalVariablePackage));
            }
        }
    }, [formData, iconData, variableData, variableRowData, globalVariablePackage, globalVariableClass, originalData]);

    useEffect(() => {
        checkForChanges();
    }, [checkForChanges]);

    const parsePackageValues = (packageDataArray: any[] | undefined): VariablePackageArrayState => {
        if (!Array.isArray(packageDataArray)) {
            console.warn("parsePackageValues received non-array input, returning empty array.");
            return [];
        }

        return packageDataArray.map((item) => {
            if (typeof item !== 'object' || item === null || typeof item.dataId !== 'number' || typeof item.variableData !== 'object' || item.variableData === null) {
                console.warn("Skipping invalid package item structure during frontend parsing:", item);
                return null;
            }

            const processedVariableData: Record<string, any> = {};

            Object.entries(item.variableData).forEach(([key, entry]) => {
                if (entry && typeof entry === 'object' && 'value' in entry) {
                    const valueFromSource = entry.value;

                    if (typeof valueFromSource === 'string') {
                        try {
                            const parsedValue = JSON.parse(valueFromSource);

                            if (typeof parsedValue === 'object' && parsedValue !== null && Array.isArray(parsedValue.filename) && Array.isArray(parsedValue.url)) {
                                processedVariableData[key] = { ...entry, value: parsedValue };
                            } else {
                                console.warn(`Frontend parsed value for pkg ${item.dataId}, key ${key}, not expected object structure. Keeping string.`);
                                processedVariableData[key] = { ...entry, value: valueFromSource };
                            }
                        } catch (parseError) {
                            console.error(`Frontend failed to parse value for pkg ${item.dataId}, key ${key}. Keeping string. Error:`, parseError);
                            processedVariableData[key] = { ...entry, value: valueFromSource };
                        }
                    } else if (typeof valueFromSource === 'object' && valueFromSource !== null) {
                        processedVariableData[key] = { ...entry, value: valueFromSource };
                    } else {
                        processedVariableData[key] = { ...entry, value: valueFromSource };
                    }
                } else {
                    console.warn(`Invalid entry structure for pkg ${item.dataId}, key ${key}:`, entry);
                    processedVariableData[key] = entry;
                }
            });

            return {
                ...item,
                variableData: processedVariableData
            };
        }).filter(item => item !== null);
    };

    const handleSave = async () => {
        if (!hasChanges) {
            toast.info('No changes to save', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }

        if (saveClicked > 0) {
            return;
        };
        saveClicked++;

        try {
            const { productType, _id } = productManager;
            const formDataPayload = new FormData();

            const tableSheetClearApproved = variableData.tableSheet.length === 0 && approvedTableSheetClear;
            formDataPayload.append('approvedTableSheetClear', tableSheetClearApproved.toString());

            console.log("FormData Payload:", tableSheetClearApproved);

            if (variableData.tableSheet.length > 0) {
                console.log("Sending tableSheet data:", variableData.tableSheet.length, "items");
                variableData.tableSheet.forEach((item) => {
                    formDataPayload.append('tableSheet', item.index.toString());
                    formDataPayload.append('tableSheet', item.value);
                    formDataPayload.append('tableSheet', item.isOrigin.valueOf().toString());
                });
            } else {
                console.error("WARNING: tableSheet is empty! Checking if this is intentional...");

                const previousTableSheetSize = originalData.variableData.tableSheet.length;
                if (previousTableSheetSize > 0 && !approvedTableSheetClear) {
                    console.error("CRITICAL: Attempting to send empty tableSheet when we had data before. Using original data instead.");
                    originalData.variableData.tableSheet.forEach((item) => {
                        formDataPayload.append('tableSheet', item.index.toString());
                        formDataPayload.append('tableSheet', item.value);
                        formDataPayload.append('tableSheet', item.isOrigin.valueOf().toString());
                    });

                    toast.warn("Prevented potential data loss. Please check your changes carefully.", {
                        position: 'bottom-right',
                        autoClose: 5000,
                    });
                } else {
                    console.log("Empty tableSheet appears to be intentional.");
                }
            }

            if (Object.keys(variableRowData).length > 0 || approvedTableCellClear) {
                if (approvedTableCellClear) {
                    console.log("Sending approvedTableCellClear flag");
                    formDataPayload.append('approvedTableCellClear', approvedTableCellClear.toString());
                }
                console.log("Sending variableRowData data:", Object.keys(variableRowData).length, "items");
                Object.entries(variableRowData).forEach(([_, rowItem]) => {
                    if (rowItem && typeof rowItem.index === 'number' && typeof rowItem.classKey === 'string' && rowItem.value !== undefined && typeof rowItem.isComposite === 'boolean') {
                        formDataPayload.append('tableCellData', rowItem.index.toString());
                        formDataPayload.append('tableCellData', rowItem.classKey);

                        let valueToSend: string;
                        if (rowItem.isComposite && Array.isArray(rowItem.value)) {
                            valueToSend = JSON.stringify(rowItem.value);
                        } else if (rowItem.isPackage) {
                            let packageIdValue: string | number | undefined;
                            if (typeof rowItem.value === 'object' && rowItem.value !== null && 'dataId' in rowItem.value) {
                                packageIdValue = (rowItem.value as any).dataId;
                            } else if (typeof rowItem.value === 'string' || typeof rowItem.value === 'number') {
                                packageIdValue = rowItem.value;
                            }
                            valueToSend = String(packageIdValue ?? '');
                        } else {
                            valueToSend = String(rowItem.value ?? '');
                        }

                        if (rowItem.classKey === 'Icon') {
                            console.log(`>>> Sending Icon cell (${rowItem.classKey}_row_${rowItem.index}): isPackage=${rowItem.isPackage}, isComposite=${rowItem.isComposite}, valueToSend=${valueToSend}`);
                        }

                        formDataPayload.append('tableCellData', valueToSend);
                        formDataPayload.append('tableCellData', rowItem.isComposite.toString());
                        formDataPayload.append('tableCellData', rowItem.isPackage.toString());
                    } else {
                        console.warn("Skipping invalid rowItem during save:", rowItem);
                    }
                });
            } else if (approvedTableCellClear) {
                console.log("Sending approvedTableCellClear flag for empty data.");
                formDataPayload.append('approvedTableCellClear', 'false');
            }
            else {
                console.log("No cell data to send and clear flag not set.");
            }

            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'icon' || key === 'newFiles' || key === 'iconPreview') return;

                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        formDataPayload.append(key, JSON.stringify(value));
                    } else {
                        formDataPayload.append(key, value.toString());
                    }
                }
            });

            if (Array.isArray(variableData.tableSheet) && variableData.tableSheet.length > 0) {
                console.log("Sending tableSheet data:", variableData.tableSheet.length, "items");
                variableData.tableSheet.forEach((item) => {
                    formDataPayload.append('tableSheet', item.index.toString());
                    formDataPayload.append('tableSheet', item.value);
                    formDataPayload.append('tableSheet', item.isOrigin.valueOf().toString());
                });
            } else {
                console.error("WARNING: tableSheet is empty or not an array!");
            }

            iconData.icon.forEach(icon => {
                formDataPayload.append('icons', icon.filename);
            });

            iconData.newFiles.forEach(file => {
                formDataPayload.append('files', file);
            });

            if (Array.isArray(globalVariableClass) && globalVariableClass.length > 0) {
                console.log("Sending globalVariableClass data array:", globalVariableClass.length, "items");
                formDataPayload.append('globalVariableClassData', JSON.stringify(globalVariableClass));
            } else {
                console.log("No globalVariableClass data to send, sending empty array string.");
                formDataPayload.append('globalVariableClassData', '[]');
            };

            let packageDataToSendString: string;

            if (Array.isArray(globalVariablePackage) && globalVariablePackage.length > 0) {
                console.log("Transforming globalVariablePackage data array before sending:", globalVariablePackage.length, "items");

                try {
                    const transformedPackageData = globalVariablePackage
                        .filter((item): item is variablePackageArray => item != null && item !== undefined)
                        .map(pkgItem => {
                            const newItem = JSON.parse(JSON.stringify(pkgItem));

                            if (newItem.variableData && typeof newItem.variableData === 'object') {
                                Object.keys(newItem.variableData).forEach(key => {
                                    const entry = newItem.variableData[key];
                                    if (entry && typeof entry.value === 'object' && entry.value !== null) {
                                        entry.value = JSON.stringify(entry.value);
                                    }
                                });
                            }
                            return newItem;
                        });

                    packageDataToSendString = JSON.stringify(transformedPackageData);
                    console.log("Sending transformed globalVariablePackage data string:", packageDataToSendString);

                } catch (error) {
                    console.error("Error transforming globalVariablePackage data:", error);
                    toast.error("Failed to prepare package data for saving.");
                    saveClicked = 0;
                    return;
                }

            } else {
                console.log("No globalVariablePackage data to send, sending empty array string.");
                packageDataToSendString = '[]';
            }

            formDataPayload.append('globalVariablePackageData', packageDataToSendString);

            console.log("FormData Payload before sending:", Array.from(formDataPayload.entries()));

            console.log('Current variableRowData:', variableRowData);
            console.log('FormData tableCellData:', Array.from(formDataPayload.getAll('tableCellData')));

            const response = await fetch(`/api/productManager/${productType}/${_id}`, {
                method: 'PATCH',
                body: formDataPayload,
            });

            if (response.ok) {
                const updatedProduct = await response.json();
                console.log('Updated Product:', updatedProduct);
                console.log('Server returned tableCellData:', updatedProduct.tableCellData);
                console.log('Server returned tableSheet:', updatedProduct.tableSheet);

                const shouldPreventUpdate = !updatedProduct.tableSheet || updatedProduct.tableSheet.length === 0;
                if (shouldPreventUpdate) {
                    console.warn('Server returned empty tableSheet, preventing further state updates.');
                    toast.warn('Warning: Server returned incomplete data. Your changes were saved but please refresh the page.');
                    return;
                };

                setFormData((prev) => ({
                    ...prev,
                    ...updatedProduct,
                    iconPreview: updatedProduct.icon,
                }));

                setIconData((prev) => ({
                    ...prev,
                    icon: updatedProduct.icon,
                    iconPreview: updatedProduct.icon,
                    newFiles: []
                }));

                setVariableData((prev) => {
                    console.log('Updating tableSheet from:', prev.tableSheet.length, 'items');
                    console.log('To:', updatedProduct.tableSheet?.length || 0, 'items');
                    return {
                        ...prev,
                        tableSheet: Array.isArray(updatedProduct.tableSheet) && updatedProduct.tableSheet.length > 0
                            ? updatedProduct.tableSheet.map((item: any, index: number) => {
                                if (typeof item === 'object' && item !== null) {
                                    return {
                                        index: item.index || index,
                                        value: item.value || '',
                                        isOrigin: item.isOrigin === true,
                                    };
                                } else {
                                    return {
                                        index,
                                        value: String(item),
                                        isOrigin: false,
                                    };
                                }
                            })
                            : prev.tableSheet,
                    };
                });

                setVariableRowData((prev) => {
                    const serverRowData = updatedProduct.tableCellData;
                    const rawPackageDataArray: variablePackageArray[] | undefined = updatedProduct.globalVariablePackageData;

                    console.log('Server returned globalVariablePackageData as raw package data array:', rawPackageDataArray);

                    const packageDataMap = new Map<number, IGlobalVariablePackage>();

                    if (Array.isArray(rawPackageDataArray)) {
                        rawPackageDataArray.forEach(rawPkgItem => {
                            const tableFormattedPkg = convertToTableFormat(rawPkgItem);
                            if (tableFormattedPkg && typeof tableFormattedPkg.dataId === 'number') {
                                packageDataMap.set(tableFormattedPkg.dataId, tableFormattedPkg);
                            }
                            console.log("Hydration: Converted package data to Table format:", tableFormattedPkg);
                        });
                        console.log("Hydration: Created packageDataMap with Table-formatted objects:", packageDataMap);
                    }

                    console.log('Server returned tableCellData:', serverRowData);

                    if (!Array.isArray(serverRowData)) {
                        console.warn('Server did not return valid tableCellData array, keeping existing state.');
                        return prev;
                    }

                    const updatedData: VariableRowDataState = {};

                    serverRowData.forEach((item: any) => {
                        if (item && typeof item === 'object' && typeof item.classKey === 'string' && typeof item.index === 'number') {
                            const key = `${item.classKey}_row_${item.index}`;
                            const isPackage = item.isPackage === true;
                            const isComposite = item.isComposite === true;
                            let finalValue = item.value;

                            if (item.classKey === 'Icon') {
                                console.log(`Hydration Processing Icon cell (${key}): isPackage=${isPackage}, isComposite=${isComposite}, serverValue=${item.value}`);
                            }

                            if (isPackage && (typeof item.value === 'string' || typeof item.value === 'number') && String(item.value).trim() !== '') {
                                const packageId = parseInt(String(item.value), 10);

                                if (!isNaN(packageId) && packageDataMap.has(packageId)) {
                                    finalValue = packageDataMap.get(packageId);
                                    console.log(`Hydration: Mapped package object (Table format, ID: ${packageId}) to cell ${key}`);
                                } else {
                                    console.warn(`Hydration Error: Package cell ${key} has isPackage=true, but couldn't find converted package data in map for ID: ${item.value}. Storing original value.`);
                                    finalValue = item.value;
                                }
                            } else if (isPackage) {
                                console.warn(`Hydration Warning: Package cell ${key} has isPackage=true, but value is not a valid string/number ID:`, item.value);
                                finalValue = item.value;
                            }

                            console.log(`Hydration: Final value for cell ${key}:`, finalValue);

                            updatedData[key] = {
                                classKey: item.classKey,
                                index: item.index,
                                value: finalValue,
                                isComposite: isComposite,
                                isPackage: isPackage,
                            };
                        } else {
                            console.warn("Skipping invalid item from serverRowData during hydration:", item);
                        }
                    });

                    console.log('Hydration: Final updated variableRowData state:', updatedData);
                    return updatedData;
                });

                console.log('Dispatching updates to Redux store');
                if (updatedProduct.globalVariableClassData || updatedProduct.globalVariablePackageData) {
                    dispatch(setVariableClassArray(updatedProduct.globalVariableClassData || []));

                    const processedPackageData = parsePackageValues(updatedProduct.globalVariablePackageData);
                    dispatch(setVariablePackageArray(processedPackageData));
                    console.log('Processed globalVariablePackageData:', processedPackageData);
                } else {
                    dispatch(setVariableClassArray([]));
                    dispatch(setVariablePackageArray([]));
                }

                console.log('Updating original data references');

                if (hasChanges) {
                    console.log('Updating original data references');

                    const newOriginalData = {
                        formData: {
                            itemName: updatedProduct.itemName || '',
                            productId: updatedProduct.productId || '',
                            description: updatedProduct.description || '',
                            initialJS: updatedProduct.initialJS || '',
                            initialCSS: updatedProduct.initialCSS || '',
                            initialHTML: updatedProduct.initialHTML || '',
                            label: updatedProduct.label || '',
                        },
                        iconData: {
                            icon: (updatedProduct.icon || []).map((icon: IconData) => ({
                                filename: icon?.filename || '',
                                url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
                            })),
                            iconPreview: (updatedProduct.iconPreview || updatedProduct.icon || []).map((icon: IconData) => ({
                                filename: icon?.filename || '',
                                url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
                            })),
                            newFiles: []
                        },
                        variableData: {
                            tableSheet: Array.isArray(updatedProduct.tableSheet)
                                ? updatedProduct.tableSheet.map((value: any, index: number) => ({
                                    index: value.index ?? index,
                                    value: value.value || '',
                                    isOrigin: Boolean(value.isOrigin),
                                }))
                                : []
                        },
                        variableRowData: updatedProduct.tableCellData
                            ? updatedProduct.tableCellData.reduce((acc: VariableRowDataState, item: any) => {
                                if (item && typeof item === 'object' && item.classKey != null && item.index != null) {
                                    const key = `${item.classKey}_row_${item.index}`;
                                    acc[key] = {
                                        classKey: item.classKey,
                                        index: item.index,
                                        value: item.value || '',
                                        isComposite: item.isComposite || false,
                                        isPackage: item.isPackage || false,
                                    };
                                }
                                return acc;
                            }, {})
                            : {},
                        variablePackageArray: Array.isArray(updatedProduct.globalVariablePackageData)
                            ? updatedProduct.globalVariablePackageData
                            : [],
                        variableClassArray: Array.isArray(updatedProduct.globalVariableClassData)
                            ? updatedProduct.globalVariableClassData
                            : []
                    };
                    setOriginalData(newOriginalData);
                    setHasChanges(false);
                }

                const confirmReload = window.confirm('Product data updated. Do you want to refresh the page now? (Recommended if UI seems inconsistent)');
                if (confirmReload) {
                    window.location.reload();
                } else {
                    toast.info('Manual refresh recommended if UI appears inconsistent.');
                }
                toast.success('Product saved successfully!', {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            } else {
                saveClicked = 0;
                const error = await response.json();
                toast.error(`Error saving product: ${error.message}`, {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            }
        } catch (error) {
            saveClicked = 0;
            console.error('Save error:', error);
            toast.error('Failed to save the product. Please try again.');
        }
    };

    const escapeCsvField = (field: string | number | undefined | null): string => {
        if (field === undefined || field === null) {
            return '';
        }
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
            const escapedField = stringField.replace(/"/g, '""');
            return `"${escapedField}"`;
        }
        return stringField;
    };

    const triggerDownload = (content: string | undefined, filename: string, contentType: string) => {
        if (content === undefined || content === "") {
            console.warn("Download skipped: content is undefined or empty.");
            return;
        }
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleJSONUtility = async (hasHeaders: boolean, hasCellData: boolean, headers: string[] | undefined) => {
        if (!hasHeaders && !hasCellData) {
            toast.info('No data to export'); return;
        }

        let maxRowIndex = -1;
        const rowDataMap = new Map<number, Record<string, tableCellData>>();

        Object.entries(variableRowData).forEach(([key, cell]) => {
            if (typeof cell.index !== 'number' || typeof cell.classKey !== 'string') {
                console.warn("Skipping cell with missing index or classKey:", key, cell);
                return;
            }
            maxRowIndex = Math.max(maxRowIndex, cell.index);
            if (!rowDataMap.has(cell.index)) {
                rowDataMap.set(cell.index, {});
            }
            rowDataMap.get(cell.index)![cell.classKey] = cell;
        });
        const numRows = maxRowIndex + 1;

        type JsonRowObject = Record<string, string | { Composite: string[] } | { Package: { id: number; name: string; content?: { filename: string[]; url: string[] } | string } }>;

        const jsonData: JsonRowObject[] = [];

        for (let i = 0; i < numRows; i++) {
            const rowObject: JsonRowObject = {};
            const rowMap = rowDataMap.get(i) || {};

            headers?.forEach(header => {
                const cellData = rowMap[header];

                if (cellData) {
                    if (cellData.isPackage && typeof cellData.value === 'object' && cellData.value !== null && 'dataId' in cellData.value) {
                        const pkg = cellData.value as IGlobalVariablePackage;
                        let packageContent: { filename: string[]; url: string[] } | string = "[Error retrieving content]";

                        if (pkg.variableData instanceof Map && pkg.variableData.size > 0) {
                            const firstEntry = pkg.variableData.values().next().value;
                            if (firstEntry && typeof firstEntry.value === 'string') {
                                try {
                                    packageContent = JSON.parse(firstEntry.value);
                                } catch (e) {
                                    console.error(`Error parsing package content for export (cell ${header}[${i}]):`, e);
                                    packageContent = `[Error parsing content: ${firstEntry.value}]`;
                                }
                            } else {
                                packageContent = "[Invalid content structure]";
                            }
                        } else {
                            packageContent = "[No content found]";
                        }

                        rowObject[header] = {
                            Package: {
                                id: pkg.dataId,
                                name: pkg.name || `ID ${pkg.dataId}`,
                                content: packageContent
                            }
                        };
                    } else if (cellData.isComposite && Array.isArray(cellData.value)) {
                        rowObject[header] = { Composite: cellData.value };
                    } else if (typeof cellData.value === 'string') {
                        rowObject[header] = cellData.value;
                    } else {
                        console.warn(`Unexpected value type for cell ${header}[${i}] during JSON export:`, cellData.value);
                        rowObject[header] = JSON.stringify(cellData.value);
                    }
                } else {
                    rowObject[header] = "";
                }
            });
            jsonData.push(rowObject);
        }
        const jsonContent = JSON.stringify(jsonData, null, 2);
        return jsonContent;
    }

    const handleCSVUtility = async (hasHeaders: boolean, hasCellData: boolean, headers: string[]) => {
        if (!hasHeaders && !hasCellData) {
            toast.info('No data to export'); return;
        }

        if (headers?.length === 0) {
            toast.error('Cannot export CSV without headers.'); return;
        }

        let maxRowIndex = -1;
        const rowDataMap = new Map<number, Record<string, tableCellData>>();

        Object.entries(variableRowData).forEach(([key, cell]) => {
            if (typeof cell.index !== 'number' || typeof cell.classKey !== 'string') {
                console.warn("Skipping cell with missing index or classKey:", key, cell);
                return;
            }
            maxRowIndex = Math.max(maxRowIndex, cell.index);
            if (!rowDataMap.has(cell.index)) {
                rowDataMap.set(cell.index, {});
            }
            rowDataMap.get(cell.index)![cell.classKey] = cell;
        });
        const numRows = maxRowIndex + 1;

        const formatValueForExport = (cellData: tableCellData | undefined): string => {
            if (!cellData) { return ''; }

            if (cellData.isPackage && typeof cellData.value === 'object' && cellData.value !== null && 'dataId' in cellData.value) {
                const pkg = cellData.value as IGlobalVariablePackage;
                let contentString = "[No content]";

                if (pkg.variableData instanceof Map && pkg.variableData.size > 0) {
                    const firstEntry = pkg.variableData.values().next().value;
                    if (firstEntry && typeof firstEntry.value === 'string') {
                        contentString = firstEntry.value;
                    } else {
                        contentString = "[Invalid content structure]";
                    }
                }
                return `PACK: ${contentString}`;

            } else if (cellData.isComposite && Array.isArray(cellData.value)) {
                return `COMP: ${cellData.value.join(' [/&/] ')}`;
            } else if (typeof cellData.value === 'string') {
                return cellData.value;
            } else {
                console.warn("Unexpected cell value type during CSV export:", cellData.value);
                return `[Unknown Type: ${typeof cellData.value}]`;
            }
        };

        const csvRows: string[] = [];
        csvRows.push(headers?.map(escapeCsvField).join(','));

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const rowMap = rowDataMap.get(rowIndex) || {};
            const rowValues = headers?.map(header => {
                const cellData = rowMap[header];
                const formattedValue = formatValueForExport(cellData);
                return escapeCsvField(formattedValue);
            });
            csvRows.push(rowValues?.join(','));
        }
        const csvContent = csvRows.join('\n');
        return csvContent;
    }

    const handleExport = async () => {
        const hasHeaders = variableData.tableSheet.length > 0;
        const hasCellData = Object.keys(variableRowData).length > 0;

        if (!hasHeaders && !hasCellData) {
            toast.info('No data to export'); return;
        }

        const format = window.prompt('Enter export format (CSV or JSON):', 'csv')?.toUpperCase();
        if (format !== 'CSV' && format !== 'JSON') {
            toast.error('Invalid format. Use CSV or JSON.'); return;
        }

        const headers = variableData.tableSheet.map(item => item.value);
        if (format === 'CSV') {
            await handleCSVUtility(hasHeaders, hasCellData, headers).then((csvContent: string | undefined) => {
                triggerDownload(csvContent, `export_${productManager._id || 'data'}_${productManager.name}_${formattedDate}.csv`, 'text/csv;charset=utf-8;');
                toast.success('CSV export started.');
            })
        } else if (format === 'JSON') {
            await handleJSONUtility(hasHeaders, hasCellData, headers).then((jsonContent: string | undefined) => {
                triggerDownload(jsonContent, `export_${productManager._id || 'data'}_${productManager.name}_${formattedDate}.json`, 'application/json;charset=utf-8;');
                toast.success('JSON export started.');
            })
        }
    };

    const handleSubmitRunOption = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRunOption) {
            alert("Please choose a run option.");
            return;
        }
        handleRun(selectedRunOption, selectedServer);
    }

    const handleRun = async (option: string, selectedServer: string) => {
        const hasHeaders = variableData.tableSheet.length > 0;
        const hasCellData = Object.keys(variableRowData).length > 0;
        const cellOrigin = variableData.tableSheet.find(item => item.isOrigin);
        const iconName = (productManager.icon).map(item => ({ item }).item.filename).toString().split(',').filter(Boolean);
        const iconFile = iconName.map(item => `${BASE_URL}/api/files/${item}`);

        console.log('Found icon files:', iconFile);

        if (iconFile.length === 0) {
        } else if (iconFile.some(item => item.includes(' '))) {
            console.warn('Icon name contains spaces or special characters. Please replace them with underscores ("_") for the file name. For example, "my new icon.png" should be "my_new_icon.png');
            toast.error('Icon name contains spaces or special characters. Please replace them with underscores ("_") for the file name. For example, "my new icon.png" should be "my_new_icon.png"');
            return;
        };
        console.log('iconFile:', iconFile);

        if (!selectedServer) {
            toast.error('No server is selected', {
                position: 'bottom-right',
                autoClose: 5000,
            });
            return;
        }

        if (!hasHeaders && !hasCellData) {
            toast.info('No data to run', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }
        if (!cellOrigin) {
            toast.warn('No origin is set to run. This warning is to prevent risking an unspecified initialization at an unspecified automation point.', {
                position: 'bottom-right',
                autoClose: 5000,
            });
            return;
        }
        if (option === '') {
            toast.error('Please select a run option', {
                position: 'bottom-right',
                autoClose: 5000,
            });
            return;
        }

        const confirmation = window.confirm(
            `You are going to run a ${option} automation for ${productManager._id}_${productManager.name} on ${selectedServer} server. Are you sure?`
        );

        if (!confirmation) {
            return;
        }

        const jsonData = await handleJSONUtility(hasHeaders, hasCellData, variableData.tableSheet.map(item => item.value));
        if (!jsonData) {
            toast.error('Error generating JSON data for the run', {
                position: 'bottom-right',
                autoClose: 5000,
            });
            return;
        }

        const handleRunPost = async (server: string) => {
            setAutomationRunning(true);
            try {
                const response = await axios.post(server, {
                    type: 'json-type',
                    runOption: option,
                    cellOrigin: cellOrigin,
                    files: iconFile,
                    jsonData: jsonData,
                }, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                console.log("Payload being sent:", {
                    type: 'json-type',
                    runOption: option,
                    cellOrigin: cellOrigin,
                    files: iconFile,
                    jsonData: jsonData,
                });
                if (response) {
                    const result = await response;
                    console.log('Run result:', result);
                    toast.success('Automation run successfully!', {
                        position: 'bottom-right',
                        autoClose: 5000,
                    });
                } else {
                    const error = await response;
                    console.error('Error running automation:', error);
                    toast.error(`Error running automation: ${error}`, {
                        position: 'bottom-right',
                        autoClose: 5000,
                    });
                }
            } catch (error) {
                console.error('Error running automation:', error);
            }
        };
        if (selectedServer === 'javascript-server') {
            setServer(javascriptServer);
            handleRunPost(`${javascriptServer}/js-server`);
        } else if (selectedServer === 'csharp-server') {
            setServer(csharpServer);
            handleRunPost(`${csharpServer}/cs-server`);
        } else {
            toast.error(`Server ${selectedServer} is not supported`, {
                position: 'bottom-right',
                autoClose: 5000,
            });
            return;
        }
    };

    const handleCloseBrowser = async (server: string) => {
        try {
            const response = await fetch(`${server}/close-browser`, {
                method: 'POST',
            })

            if (response.ok) {
                console.log('Browser closed successfully');
            } else {
                console.error('Failed to close the browser:', response.statusText);
            }

            const result = await response.json();
            console.log('Result:', result);
            alert(result.message);
        } catch (error) {
            console.error('Error closing the browser:', error);
            alert('Error closing the browser');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.buttonContainer}>
                    <button
                        className={styles.propertyInterfacesButton}
                        onClick={() => setShowPropertyInterfaces(!showPropertyInterfaces)}
                    >
                        {showPropertyInterfaces ? 'Close Property Interface' : 'Open Property Interface'}
                    </button>
                    <div className={styles.operationButtons}>
                        <button
                            className={`${styles.saveButton} ${!hasChanges || saveClicked > 0 ? styles.saveButtonDisabled : ''}`}
                            onClick={handleSave}
                            disabled={!hasChanges}
                            title={!hasChanges ? 'No changes to save' : 'Save changes'}
                        >
                            {hasChanges ? 'Save*' : 'Saved'}
                        </button>
                        <button
                            className={`${styles.exportButton} ${(variableData.tableSheet.length === 0 && Object.keys(variableRowData).length === 0) ? styles.exportButtonDisabled : ''}`}
                            onClick={handleExport}
                            disabled={variableData.tableSheet.length === 0 && Object.keys(variableRowData).length === 0}
                            title="Export table data as CSV or JSON"
                        >
                            Export
                        </button>
                        <button
                            className={`${styles.runButton} ${(variableData.tableSheet.length === 0 && Object.keys(variableRowData).length === 0) ? styles.runButtonDisabled : ''}`}
                            onClick={() => {
                                renderRunModal ? setRenderRunModal(false) : setRenderRunModal(true);
                            }}
                            disabled={variableData.tableSheet.length === 0 && Object.keys(variableRowData).length === 0}
                            title="Run Automation"
                        >
                            Run
                        </button>
                    </div>
                </div>
            </div>
            <VariableManager
                productManager={productManager}
                setApprovedTableSheetClear={setApprovedTableSheetClear}
                setApprovedTableCellClear={setApprovedTableCellClear}
                variableData={variableData}
                setVariableData={setVariableData}
                setVariableRowData={setVariableRowData}
                variableRowData={variableRowData}
            />
            {showPropertyInterfaces && (
                <div className={styles.propertyInterfacesContainer}>
                    <PropertyInterfaceTable
                        productManager={productManager}
                        formData={formData}
                        setFormData={setFormData}
                        iconData={iconData}
                        setIconData={setIconData}
                    />
                </div>
            )}
            {renderRunModal && (
                <div className={styles.runModal}>
                    <div className={styles.runModalContent}>
                        <h2>Run Automation</h2>
                        <form
                            className={styles.runForm}
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmitRunOption(e);
                            }}
                        >
                            <select
                                className={styles.runSelect}
                                value={selectedRunOption}
                                onChange={(e) => setSelectedRunOption(e.target.value)}
                            >
                                <option value="" disabled>Choose Run Option</option>
                                <option value="dsf-edit-product">DSF - Edit Product</option>
                            </select>
                            <select
                                className={styles.runSelect}
                                value={selectedServer}
                                onChange={(e) => setSelectedServer(e.target.value)}
                            >
                                <option value="" disabled>Choose Server</option>
                                <option value="javascript-server">Javascript Server</option>
                                <option value="csharp-server" disabled>C# Server {`[coming soon]`}</option>
                            </select>
                            <div className={styles.runButtonsContainer}>
                                <button type='submit'>
                                    Run
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRenderRunModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                        <div className={styles.automationViewer}>
                            {automationRunning ? (
                                <div className={styles.automationContainer}>
                                    <div className={styles.automationViewerText}>
                                        <p>Automation is running...</p>
                                    </div>
                                    <div className={styles.viewBackend}>
                                        <a
                                            href={selectedServer}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View Backend
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => handleCloseBrowser(server)}
                                    >
                                        Close Browser
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.automationViewerText}>
                                    <p>Automation is not running</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.divider} />
            <ToastContainer />
        </div>
    );
};

export default WaveManager;