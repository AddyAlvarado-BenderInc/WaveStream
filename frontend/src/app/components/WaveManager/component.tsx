import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store/store';
import { clearAllVariableClassArray, setVariableClassArray, addVariableClassArray } from "../../store/productManagerSlice";
import { ProductManager, IconData, tableSheetData, tableCellData, variableClassArray } from '../../../../types/productManager';
import VariableManager from '../VariableManager/component';
import PropertyInterfaceTable from '../PropertyInterfaces/component';
import { BASE_URL } from '../../config';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isEqual } from 'lodash';

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

type VariableClassArrayState = Array<variableClassArray | null | undefined>;

interface VariableDataState {
    tableSheet: tableSheetData[];
}

type VariableRowDataState = Record<string, tableCellData>;

interface WaveManagerProps {
    productManager: ProductManager & { globalVariableClass?: VariableClassArray };
}

interface OriginalData {
    formData: FormDataState;
    iconData: IconDataState;
    variableData: VariableDataState;
    variableRowData: VariableRowDataState;
    variableClassArray: VariableClassArrayState;
}

let saveClicked = 0;

const WaveManager: React.FC<WaveManagerProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [approvedTableCellClear, setApprovedTableCellClear] = useState(false);
    const [approvedTableSheetClear, setApprovedTableSheetClear] = useState(false);

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

        dispatch(setVariableClassArray(initialVariableClassData));

        setOriginalData(prevOriginal => ({
            ...prevOriginal,
            variableClassArray: initialVariableClassData
        }));

    }, [productManager.globalVariableClassData, dispatch]);

    const [originalData, setOriginalData] = useState<OriginalData>(() => {
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

        const normalizeTableCellData = (data: any): VariableRowDataState => {
            if (!Array.isArray(data)) return {};
            return data.reduce((acc: VariableRowDataState, item: any) => {
                if (item && typeof item === 'object' && item.classKey != null && item.index != null) {
                    const key = `${item.classKey}_row_${item.index}`;
                    acc[key] = {
                        classKey: item.classKey,
                        index: item.index,
                        value: item.value || ''
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
            variableRowData: normalizeTableCellData(productManager.tableCellData),
            variableClassArray: parseVariableClassArray(productManager.globalVariableClassData)
        };
    });

    const [formData, setFormData] = useState<FormDataState>({ ...originalData.formData });
    const [iconData, setIconData] = useState<IconDataState>({ ...originalData.iconData });
    const [variableData, setVariableData] = useState<VariableDataState>({ ...originalData.variableData });
    const [variableRowData, setVariableRowData] = useState<VariableRowDataState>({ ...originalData.variableRowData });
    const [hasChanges, setHasChanges] = useState(false);
    const [showPropertyInterfaces, setShowPropertyInterfaces] = useState(false);

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);

    const checkForChanges = useCallback(() => {
        const normalizeTableSheetForCompare = (tableSheet: tableSheetData[]) => {
            return tableSheet.map(item => ({
                value: item.value,
                isOrigin: item.isOrigin
            })).sort((a, b) => (a.value + a.isOrigin).localeCompare(b.value + b.isOrigin));
        };

        const normalizeVariableRowDataForCompare = (data: VariableRowDataState): Array<{ classKey: string, index: number, value: string }> => {
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

        const dataChanged = formDataChanged || iconDataChanged || tableSheetChanged || variableRowDataChanged || variableClassArrayChanged; // Add variableClassArrayChanged

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
        }
    }, [formData, iconData, variableData, variableRowData, globalVariableClass, originalData]);

    useEffect(() => {
        checkForChanges();
    }, [checkForChanges]);

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
                    formDataPayload.append('tableCellData', rowItem.index.toString());
                    formDataPayload.append('tableCellData', rowItem.classKey);
                    formDataPayload.append('tableCellData', rowItem.value);
                });
            } else {
                console.log("No cell data to send.");
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

            console.log("FormData Payload before sending:", Array.from(formDataPayload.entries()));

            console.log('Current variableRowData:', variableRowData);
            console.log('FormData tableCellData:', Array.from(formDataPayload.getAll('tableCellData')));

            const response = await fetch(`/api/productManager/${productType}/${_id}`, {
                method: 'PATCH',
                body: formDataPayload,
            });

            if (response.ok) {
                const confirmReload = window.confirm('Product saved successfully! Do you want to refresh the page?');
                if (confirmReload) {
                    window.location.reload();
                    toast.success('Product saved successfully! You can continue working.');
                } else {
                    toast.info('Page needs reloading to reflect changes.');
                    return;
                }
                const updatedProduct = await response.json();
                console.log('Updated Product:', updatedProduct);

                console.log('Server returned tableCellData:', updatedProduct.tableCellData);

                console.log('Server returned tableSheet:', updatedProduct.tableSheet);

                const shouldPreventReload = !updatedProduct.tableSheet || updatedProduct.tableSheet.length === 0;
                if (shouldPreventReload) {
                    console.warn('Server returned empty tableSheet, keeping current state to prevent data loss');
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
                    if (!Array.isArray(serverRowData)) {
                        console.warn('Server did not return valid tableCellData array, keeping existing state.');
                        return prev;
                    }

                    const updatedData: VariableRowDataState = {};

                    serverRowData.forEach((item: any) => {
                        if (item && typeof item === 'object') {
                            const key = `${item.classKey}_row_${item.index}`;
                            updatedData[key] = {
                                classKey: item.classKey,
                                index: item.index,
                                value: item.value
                            };
                        }
                    });

                    console.log('Updated variableRowData:', updatedData);
                    return updatedData;
                });

                if (hasChanges) {
                    console.log('Updating original data references');
                    dispatch(setVariableClassArray(updatedProduct));

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
                                        value: item.value || ''
                                    };
                                }
                                return acc;
                            }, {})
                            : {},
                        variableClassArray: Array.isArray(updatedProduct.globalVariableClassData)
                            ? updatedProduct.globalVariableClassData
                            : []
                    };
                    setOriginalData(newOriginalData);
                    if (updatedProduct.globalVariableClassData) {
                        dispatch(setVariableClassArray(updatedProduct.globalVariableClassData));
                    } else {
                        dispatch(setVariableClassArray([]));
                    }
                    setHasChanges(false);
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

    const triggerDownload = (content: string, filename: string, contentType: string) => {
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

    const handleExport = async () => {
        const hasHeaders = variableData.tableSheet.length > 0;
        const hasCellData = Object.keys(variableRowData).length > 0;

        if (!hasHeaders && !hasCellData) {
            toast.info('No data to export', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }

        const format = window.prompt('Enter the format to export (CSV or JSON):', 'csv')?.toUpperCase();
        if (format !== 'CSV' && format !== 'JSON') {
            toast.error('Invalid format. Please enter CSV or JSON.', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }

        const headers = variableData.tableSheet.map(item => item.value);
        if (headers.length === 0 && format === "CSV") {
            toast.error('Cannot export CSV without headers.', { position: 'bottom-right' });
            return;
        }

        let maxRowIndex = -1;
        const rowDataMap = new Map<number, Record<string, string>>();

        Object.entries(variableRowData).forEach(([key, cell]) => {
            const match = key.match(/^(.+)_row_(\d+)$/);
            if (match) {
                const [_, classKey, rowIndexStr] = match;
                const rowIndex = parseInt(rowIndexStr, 10);

                if (!isNaN(rowIndex)) {
                    maxRowIndex = Math.max(maxRowIndex, rowIndex);
                    if (!rowDataMap.has(rowIndex)) {
                        rowDataMap.set(rowIndex, {});
                    }
                    rowDataMap.get(rowIndex)![classKey] = cell.value;
                }
            }
        });
        const numRows = maxRowIndex + 1;

        if (format === 'CSV') {
            const csvRows: string[] = [];

            csvRows.push(headers.map(escapeCsvField).join(','));

            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                const rowMap = rowDataMap.get(rowIndex) || {};
                const rowValues = headers.map(header => {
                    const cellValue = rowMap[header] || '';
                    return escapeCsvField(cellValue);
                });
                csvRows.push(rowValues.join(','));
            }

            const csvContent = csvRows.join('\n');

            triggerDownload(csvContent, `export_${productManager._id || 'data'}_${productManager.name}.csv`, 'text/csv;charset=utf-8;');
            toast.success('CSV export started.', { position: 'bottom-right' });
        } else if (format === 'JSON') {
            const jsonData: Record<string, string>[] = [];

            for (let i = 0; i < numRows; i++) {
                const rowObject: Record<string, string> = {};
                const rowMap = rowDataMap.get(i) || {};
                headers.forEach(header => {
                    rowObject[header] = rowMap[header] || "";
                });
                jsonData.push(rowObject);
            }

            const jsonContent = JSON.stringify(jsonData, null, 2);

            triggerDownload(jsonContent, `export_${productManager._id || 'data'}_${productManager.name}.json`, 'application/json;charset=utf-8;');
            toast.success('JSON export started.', { position: 'bottom-right' });
        }
    };

    // Can take code from ento app for this
    const handleRun = async () => {
        const hasHeaders = variableData.tableSheet.length > 0;
        const hasCellData = Object.keys(variableRowData).length > 0;
        const { productType, _id } = productManager;

        if (!hasHeaders && !hasCellData) {
            toast.info('No data to run', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }

        const confirmation = window.confirm(
            `You are going to run the automation for ${productManager._id}_${productManager.name}. Are you sure?`
        );

        if (!confirmation) {
            return;
        }

        // Can decide to fetch code from C# code (/backend/services/Program.cs) (requires JSON data format)
        // or from javascript (/backend/services/Program.js) (requires CSV data format)
        // Below is just for demonstration purposes
        const response = await fetch(`/backend/automation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productManager._id,
                variableRowData,
                variableData,
            }),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Run result:', result);
            toast.success('Automation run successfully!', {
                position: 'bottom-right',
                autoClose: 5000,
            });
        } else {
            const error = await response.json();
            toast.error(`Error running automation: ${error.message}`, {
                position: 'bottom-right',
                autoClose: 5000,
            });
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
                            Save
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
                            onClick={handleRun}
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
            <div className={styles.divider} />
            <ToastContainer />
        </div>
    );
};

export default WaveManager;