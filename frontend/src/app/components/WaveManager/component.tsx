import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store/store';
import { updateProductManager } from "../../store/productManagerSlice";
import { ProductManager, IconData, tableSheetData, tableCellData } from '../../../../types/productManager';
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

interface VariableDataState {
    tableSheet: tableSheetData[];
}

type VariableRowDataState = Record<string, tableCellData>;

interface WaveManagerProps {
    productManager: ProductManager;
}

interface VariableRowDataSheetState {
    variableDataRecord: Record<string, { dataId: number; value: string; } | null>,
    selectedKey: string,
    id: number | null | undefined
}

const WaveManager: React.FC<WaveManagerProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();

    const [originalData, setOriginalData] = useState({
        formData: {
            itemName: productManager.itemName || '',
            productId: productManager.productId || '',
            description: productManager.description || '',
            initialJS: productManager.initialJS || '',
            initialCSS: productManager.initialCSS || '',
            initialHTML: productManager.initialHTML || '',
            label: productManager.label || '',
        } as FormDataState,
        iconData: {
            icon: (productManager.icon || []).map((icon: IconData) => ({
                filename: icon?.filename || '',
                url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
            })),
            iconPreview: (productManager.iconPreview || []).map((icon: IconData) => ({
                filename: icon?.filename || '',
                url: icon?.url || `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename || '')}`
            })),
            newFiles: [] as File[]
        } as IconDataState,
        variableData: {
            tableSheet: Array.isArray(productManager.tableSheet)
                ? productManager.tableSheet.map((value, index) => ({
                    index,
                    value: value.value || '',
                    isOrigin: Boolean(value.isOrigin),
                }))
                : []
        } as VariableDataState,
        variableRowData: productManager.tableCellData
            ? productManager.tableCellData.reduce((acc: VariableRowDataState, item: any) => {
                if (item && typeof item === 'object') {
                    const key = `${item.classKey}_row_${item.index}`;
                    acc[key] = {
                        classKey: item.classKey,
                        index: item.index,
                        value: item.value
                    };
                }
                return acc;
            }, {})
            : {}
    });

    const [formData, setFormData] = useState<FormDataState>({ ...originalData.formData });
    const [iconData, setIconData] = useState<IconDataState>({ ...originalData.iconData });
    const [variableData, setVariableData] = useState<VariableDataState>({ ...originalData.variableData });
    const [variableRowData, setVariableRowData] = useState<VariableRowDataState>({ ...originalData.variableRowData });
    const [hasChanges, setHasChanges] = useState(false);
    const [showPropertyInterfaces, setShowPropertyInterfaces] = useState(false);

    const checkForChanges = useCallback(() => {
        const normalizeTableSheet = (tableSheet: tableSheetData[]) => {
            return tableSheet.map(item => ({
                value: item.value,
                isOrigin: item.isOrigin
            }));
        };
        const normalizeVariableRowData = (variableRowData: VariableRowDataState): { value: string }[] => {
            return Object.keys(variableRowData).map(item => ({
                value: item,
            }));
        };

        const formDataChanged = !isEqual(formData, originalData.formData);
        const iconDataChanged = iconData.newFiles.length > 0 ||
            !isEqual(iconData.icon.map(i => i.filename), originalData.iconData.icon.map(i => i.filename));
        const tableSheetChanged = !isEqual(
            normalizeTableSheet(variableData.tableSheet),
            normalizeTableSheet(originalData.variableData.tableSheet)
        );
        const variableRowDataChanged = !isEqual(
            normalizeVariableRowData(variableRowData),
            normalizeVariableRowData(originalData.variableRowData)
        );

        const dataChanged = formDataChanged || iconDataChanged || tableSheetChanged || variableRowDataChanged;

        setHasChanges(dataChanged);

        if (dataChanged) {
            console.log('Changes detected:', {
                formDataChanged,
                iconDataChanged,
                tableSheetChanged,
                variableRowDataChanged,
            });
        }
    }, [formData, iconData, variableData, originalData, variableRowData]);

    useEffect(() => {
        checkForChanges();
    }, [formData, iconData, variableData, variableRowData, checkForChanges]);

    const handleSave = async () => {
        if (!hasChanges) {
            toast.info('No changes to save', {
                position: 'bottom-right',
                autoClose: 3000,
            });
            return;
        }

        try {
            const { productType, _id } = productManager;
            const formDataPayload = new FormData();

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
                if (previousTableSheetSize > 0) {
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

            if (Object.keys(variableRowData).length > 0) {
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

                    dispatch(updateProductManager(updatedProduct));

                    setOriginalData({
                        formData: { ...formData },
                        iconData: {
                            icon: JSON.parse(JSON.stringify(iconData.icon)),
                            iconPreview: JSON.parse(JSON.stringify(iconData.iconPreview)),
                            newFiles: []
                        },
                        variableData: {
                            tableSheet: Array.isArray(updatedProduct.tableSheet) && updatedProduct.tableSheet.length > 0
                                ? JSON.parse(JSON.stringify(updatedProduct.tableSheet.map((item: any, index: number) => ({
                                    index: item.index || index,
                                    value: item.value || '',
                                    isOrigin: item.isOrigin === true,
                                }))))
                                : JSON.parse(JSON.stringify(variableData.tableSheet))
                        },
                        variableRowData: updatedProduct.tableCellData
                            ? updatedProduct.tableCellData.reduce((acc: VariableRowDataState, item: any) => {
                                if (item && typeof item === 'object') {
                                    const key = `${item.classKey}_row_${item.index}`;
                                    acc[key] = {
                                        classKey: item.classKey,
                                        index: item.index,
                                        value: item.value
                                    };
                                }
                                return acc;
                            }, {})
                            : {}
                    });

                    setHasChanges(false);
                }

                toast.success('Product saved successfully!', {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            } else {
                const error = await response.json();
                toast.error(`Error saving product: ${error.message}`, {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save the product. Please try again.');
        }
    };

    const handleExport = async () => {
        alert('Export functionality is not implemented yet.\nThis feature will export all table data to a chose file. Exportable files will either be in CSV or JSON format, based on your chosen format.');
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
                            className={`${styles.saveButton} ${!hasChanges ? styles.saveButtonDisabled : ''}`}
                            onClick={handleSave}
                            disabled={!hasChanges}
                            title={!hasChanges ? 'No changes to save' : 'Save changes'}
                        >
                            Save
                        </button>
                        <button
                            className={styles.exportButton}
                            onClick={handleExport}
                            disabled={!variableData && !variableRowData || variableData.tableSheet.length === 0}
                            title="Export"
                        >
                            Export
                        </button>
                    </div>
                </div>
            </div>
            <VariableManager
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