import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { tableCellData, ProductManager } from "../../../../types/productManager";
import styles from './component.module.css';
import { ToastContainer, toast } from "react-toastify";
import { IGlobalVariablePackage } from "../../../../types/productManager";
import 'react-toastify/dist/ReactToastify.css';
import { RootState } from "@/app/store/store";

interface tableSheetData {
    index: number;
    value: string;
    isOrigin: boolean;
}

type VariableRowDataState = Record<string, tableCellData>;

interface TableProps {
    productManager: ProductManager;
    setApprovedTableSheetClear?: (value: boolean) => void;
    setApprovedTableCellClear?: (value: boolean) => void;
    variableRowData: VariableRowDataState;
    selectedClassKey: string;
    variableData: tableSheetData[];
    originAssignment: (key: string) => void;
    submitTableData: (values: tableSheetData[]) => void;
    areRowsPopulated: (value: boolean) => void;
    setVariableClassData: React.Dispatch<React.SetStateAction<VariableRowDataState>>;
}

const Table: React.FC<TableProps> = ({ productManager, variableRowData, variableData, originAssignment, submitTableData, areRowsPopulated, setVariableClassData, setApprovedTableCellClear, setApprovedTableSheetClear }) => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<tableSheetData[]>([]);
    const [headerOrigin, setHeaderOrigin] = useState<string>("");
    const [permanentOrigin, setPermanentOrigin] = useState<string>("");
    const [hideTable, setHideTable] = useState<boolean>(false);
    const [expandedCellKey, setExpandedCellKey] = useState<string | null>(null);
    const [isDisabled, setIsDisabled] = useState<boolean>(false);

    const toggleExpandComposite = (key: string) => {
        setExpandedCellKey(prevKey => (prevKey === key ? null : key));
    };

    const toggleExpandPackage = (key: string) => {
        setExpandedCellKey(prevKey => (prevKey === key ? null : key));
    };

    const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
    const [actionTargetCell, setActionTargetCell] = useState<{ key: string; rowIndex: number; value: string | string[] | IGlobalVariablePackage; isComposite: boolean; isPackage: boolean } | null>(null);
    const [currentAction, setCurrentAction] = useState<'extendLength' | 'fillEmpty' | null>(null);
    const [actionInputValue, setActionInputValue] = useState<string>('');

    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const [targetImportColumn, setTargetImportColumn] = useState<string | null>(null);

    const triggerRowImport = (columnKey: string) => {
        console.log(`Setting target import column: ${columnKey}`);
        setTargetImportColumn(columnKey);
        const fileInput = document.getElementById('row-sheet-upload');
        if (fileInput) {
            (fileInput as HTMLInputElement).value = '';
            fileInput.click();
        } else {
            console.error("Could not find file input element #row-sheet-upload");
        }
    }

    const { productType, _id } = productManager;

    useEffect(() => {
        const originKey = variableData.find(key => key.isOrigin);
        const duplicate = classKeyInputObjects.some(keyObj => keyObj.value === localClassKeyInput.trim());
        const hasData = Object.keys(variableRowData).length > 0;
        areRowsPopulated(hasData);

        if (originKey) {
            setPermanentOrigin(originKey.value);
            originAssignment(originKey.value);
        };

        if (duplicate) {
            toast.error('Class key already exists');
            return;
        };
    }, [variableData, areRowsPopulated]);

    useEffect(() => {
        console.log('variableRowData updated: ', variableRowData);

        if (tableContainerRef.current) {
            tableContainerRef.current.style.transform = `scale(${zoomLevel / 100})`;
            tableContainerRef.current.style.transformOrigin = 'top left';
        }
        if (Object.keys(variableRowData).length < 0) {
            areRowsPopulated(false);
        }
    }, [zoomLevel]);

    const processTableSheet = (data: any[]): tableSheetData[] => {
        return data.map((item, index) => {
            if (typeof item === 'object' && item !== null) {
                return {
                    index: typeof item.index === 'number' ? item.index : index,
                    value: typeof item.value === 'string' ? item.value : String(item.value || ""),
                    isOrigin: Boolean(item.isOrigin)
                };
            }
            return {
                index,
                value: String(item || ""),
                isOrigin: false
            };
        });
    };

    const classKeyInputObjects = addedClassKeys.length > 0 ? addedClassKeys : processTableSheet(variableData);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalClassKeyInput(event.target.value);
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 10, 200));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 10, 50));
    };

    const handleZoomReset = () => {
        setZoomLevel(100);
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoomLevel(Number(e.target.value));
    };

    const handleImportHeaderSheet = async () => {
        try {
            const fileInput = document.getElementById('class-key-upload') as HTMLInputElement;
            if (fileInput && fileInput.files) {
                const file = fileInput.files[0];
                if (!file || !file.name.endsWith('.csv')) {
                    alert('Please upload a valid CSV file');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csvData = event.target?.result;
                    if (csvData) {
                        const rows = (csvData as string).split('\n').filter(row => row.trim());
                        if (rows.length > 0) {
                            const classKeyObjects = rows[0].split(',').map((key, idx) => ({
                                index: idx,
                                value: key.trim(),
                                isOrigin: false,
                            }));
                            setAddedClassKeys(classKeyObjects);
                            submitTableData(classKeyObjects);
                            setLocalClassKeyInput('');
                        } else {
                            toast.error('The uploaded CSV file is empty or invalid.');
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                alert('No file selected');
            }
        } catch (error) {
            console.error('Error importing header sheet:', error);
        }
    };

    const handleImportRowSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!targetImportColumn) {
            console.error("Import triggered without a target column set.");
            toast.error("Import error: No target column specified.");
            return;
        }

        console.log(`Importing row data for column: ${targetImportColumn}`);

        try {
            const file = event.target.files?.[0];
            const fileNameLower = file?.name?.toLowerCase();
            if (!file || (!fileNameLower?.endsWith('.txt') && !fileNameLower?.endsWith('.csv'))) {
                toast.warn('Please upload a valid TXT or CSV file.');
                setTargetImportColumn(null);
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const fileContent = loadEvent.target?.result;
                if (fileContent) {
                    const rows = (fileContent as string).split('\n').map(row => row.trim()).filter(row => row);

                    if (rows.length > 0) {
                        const updates: VariableRowDataState = {};
                        rows.forEach((rowValue, rowIndex) => {
                            const cleanedValue = rowValue;

                            const dataKey = `${targetImportColumn}_row_${rowIndex}`;

                            updates[dataKey] = {
                                classKey: targetImportColumn,
                                index: rowIndex,
                                value: cleanedValue,
                                isComposite: false,
                                isPackage: false,
                                isDisabled: false,
                            };
                        });

                        console.log(`Prepared updates for ${targetImportColumn}:`, updates);

                        setVariableClassData((prevData: VariableRowDataState) => ({
                            ...prevData,
                            ...updates
                        }));

                    } else {
                        toast.error('The uploaded file is empty or contains only empty rows.');
                    }
                } else {
                    toast.error('Could not read the file content.');
                }
                setTargetImportColumn(null);
                event.target.value = '';
            };
            reader.onerror = () => {
                toast.error('Error reading the file.');
                setTargetImportColumn(null);
                event.target.value = '';
            };
            reader.readAsText(file);
        } catch (error) {
            console.error(`Error importing row data for ${targetImportColumn}:`, error);
            toast.error(`An error occurred during import: ${error}`);
            setTargetImportColumn(null);
        }
    };

    const handleHeaderOriginKey = (key: string) => {
        if (permanentOrigin) {
            return null;
        }
        if (headerOrigin !== key) {
            setHeaderOrigin(key);
        }
    };

    const handlePermanentOriginKey = (key: string) => {
        if (headerOrigin === key && !permanentOrigin) {
            const confirmation = window.confirm(
                `Are you sure you want to set "${key}" as the permanent origin?\nMake sure that this class key has a wide range of variable classes`
            );
            if (confirmation) {
                setPermanentOrigin(key);
                const updatedKeys = classKeyInputObjects.map((entry) =>
                    entry.value === key ? { ...entry, isOrigin: true } : { ...entry, isOrigin: false }
                );
                submitTableData(updatedKeys);
                originAssignment(key);
                setAddedClassKeys(updatedKeys);
            }
        }
    };

    const handleDeleteKey = (key: string) => {
        const updatedKeys = classKeyInputObjects.filter((entry) => entry.value !== key);
        setAddedClassKeys(updatedKeys);
        submitTableData(updatedKeys);
    };

    const handleEditKey = (key: string, newValue: string) => {
        const updatedKeys = classKeyInputObjects.map((entry) =>
            entry.value === key ? { ...entry, value: newValue } : entry
        );
        setAddedClassKeys(updatedKeys);
        submitTableData(updatedKeys);
    };

    const handleDeleteCell = (key: string, rowIndex: number) => {
        setVariableClassData((prevData: any) => {
            const updatedData = { ...prevData };

            const dataKey = `${key}_row_${rowIndex}`;

            if (updatedData[dataKey]) {
                delete updatedData[dataKey];
                console.log(`Deleted row-specific data for ${key} at row ${rowIndex}`);
            }
            else if (rowIndex === 0 && updatedData[key]) {
                delete updatedData[key];
                console.log(`Deleted column data for ${key}`);
            }

            return updatedData;
        });
    };

    const handleDisableColumnCells = (columnKey: string) => {
        setVariableClassData((prevData: VariableRowDataState) => {
            const updatedData = { ...prevData };
            let allCurrentlyDisabled = true;
            let columnHasCells = false;

            Object.keys(updatedData).forEach(dataKey => {
                if (dataKey.startsWith(`${columnKey}_row_`)) {
                    columnHasCells = true;
                    if (!updatedData[dataKey].isDisabled) {
                        allCurrentlyDisabled = false;
                    }
                }
            });

            if (!columnHasCells && Object.keys(updatedData).every(dk => !dk.startsWith(`${columnKey}_row_`))) {
                if (updatedData[columnKey]) {
                    columnHasCells = true;
                    if(!updatedData[columnKey].isDisabled) {
                        allCurrentlyDisabled = false;
                    }
                } else {
                    console.log(`No cells found for column ${columnKey} to toggle disable state.`);
                    toast.info(`No cells found in column ${columnKey}.`);
                    return prevData;
                }
            }

            const newDisabledState = !allCurrentlyDisabled;

            Object.keys(updatedData).forEach(dataKey => {
                if (dataKey.startsWith(`${columnKey}_row_`)) {
                    updatedData[dataKey] = {
                        ...updatedData[dataKey],
                        isDisabled: newDisabledState,
                    };
                }
            });

            if (updatedData[columnKey] && !columnKey.includes("_row_")) {
                 updatedData[columnKey] = {
                    ...updatedData[columnKey],
                    isDisabled: newDisabledState,
                };
            }

            console.log(`${newDisabledState ? 'Disabled' : 'Enabled'} all cells in column ${columnKey}`);
            return updatedData;
        });
        setIsDisabled(!isDisabled);
    }

    const handleClearAllCells = () => {
        const confirmation = window.confirm(
            `Are you sure you want to delete all row data in the table?`
        );
        if (confirmation) {
            setVariableClassData({});
            setApprovedTableCellClear && setApprovedTableCellClear(true);
            console.log(`Cleared all cell data for ${productType}/${_id}`);
        }
    };

    const handleClearColumnData = (columnKey: string) => {
        const confirmation = window.confirm(
            `Are you sure you want to delete all data in the "${columnKey}" column?`
        );
        if (confirmation) {
            setVariableClassData((prevData: VariableRowDataState) => {
                const updatedData = { ...prevData };
                let clearedCount = 0;

                Object.keys(updatedData).forEach(dataKey => {
                    if (dataKey === columnKey || dataKey.startsWith(`${columnKey}_row_`)) {
                        delete updatedData[dataKey];
                        clearedCount++;
                    }
                });

                if (clearedCount > 0) {
                    console.log(`Cleared ${clearedCount} data points for column ${columnKey}`);
                } else {
                    toast.info(`No data found to clear in column "${columnKey}".`);
                }

                return updatedData;
            });
        }
    }

    const handleEditCellValue = (key: string, rowIndex: number, currentValue: string) => {
        const newValue = prompt("Edit cell value:", currentValue);

        if (newValue !== null) {
            setVariableClassData((prevData: any) => {
                const updatedData = { ...prevData };

                const dataKey = `${key}_row_${rowIndex}`;

                if (updatedData[dataKey]) {
                    updatedData[dataKey] = {
                        ...updatedData[dataKey],
                        value: newValue,
                        __rowIndex: rowIndex,
                        isComposite: false,
                    };
                }
                else if (rowIndex === 0 && updatedData[key]) {
                    updatedData[dataKey] = {
                        ...updatedData[key],
                        value: newValue,
                        __rowIndex: rowIndex,
                        isComposite: false,
                    };
                } else {
                    updatedData[dataKey] = {
                        value: newValue,
                        __rowIndex: rowIndex,
                        isComposite: false,
                    };
                }

                return updatedData;
            });
        }
    };

    const getMaxRowIndex = (data: VariableRowDataState): number => {
        let maxIndex = -1;
        Object.keys(data).forEach(key => {
            const rowMatch = key.match(/_row_(\d+)$/);
            if (rowMatch) {
                maxIndex = Math.max(maxIndex, parseInt(rowMatch[1], 10));
            } else if (data[key] !== undefined && data[key] !== null) {
                maxIndex = Math.max(maxIndex, 0);
            }
        });
        return maxIndex;
    };

    const handleSetDefaultColumnValue = (columnKey: string) => {
        const defaultValue = prompt(`Enter default value for column "${columnKey}":`);

        if (defaultValue === null) {
            toast.info("Default value assignment cancelled.");
            return;
        }

        if (defaultValue.trim() === "") {
            toast.warn("Default value cannot be empty. Use 'Clear' button to remove values.");
            return;
        }

        setVariableClassData((prevData) => {
            const maxRowIndex = getMaxRowIndex(prevData);
            const updates: VariableRowDataState = {};
            let defaultAppliedCount = 0;

            const highestRowToFill = Math.max(0, maxRowIndex);

            for (let i = 0; i <= highestRowToFill; i++) {
                const dataKey = `${columnKey}_row_${i}`;
                const existingCell = prevData[dataKey];

                const shouldApplyDefault = !existingCell ||
                    (existingCell.value === '' && !existingCell.isDefault);

                if (shouldApplyDefault) {
                    updates[dataKey] = {
                        classKey: columnKey,
                        index: i,
                        value: defaultValue,
                        isComposite: false,
                        isDefault: true,
                        isPackage: false,
                        isDisabled: false,
                    };
                    defaultAppliedCount++;
                } else if (existingCell && existingCell.isDefault && existingCell.value !== defaultValue) {
                    updates[dataKey] = {
                        ...existingCell,
                        value: defaultValue,
                    };
                    defaultAppliedCount++;
                }
            }

            if (defaultAppliedCount > 0) {
                return { ...prevData, ...updates };
            } else {
                toast.info(`No empty cells found to apply default value in column "${columnKey}". Existing values were preserved.`);
                return prevData;
            }
        });
    };

    const actionExtendLength = () => {
        if (!actionTargetCell || !actionInputValue) {
            toast.error("Invalid input for extending length.");
            return;
        }
        const lengthToExtend = parseInt(actionInputValue, 10);
        if (isNaN(lengthToExtend) || lengthToExtend <= 0) {
            toast.error("Please enter a valid positive number for the length.");
            return;
        }

        const { key, rowIndex, value: valueToExtend, isComposite: isTargetComposite, isPackage: isTargetIsPackage } = actionTargetCell;

        const logValue = isTargetIsPackage ? `Package (ID: ${(valueToExtend as unknown as IGlobalVariablePackage)?.dataId})` : valueToExtend;
        console.log(`Action Extend: Extending column "${key}" with value:`, logValue, `(isComposite=${isTargetComposite}, isPackage=${isTargetIsPackage})`);


        const updates: VariableRowDataState = {};
        let extendedCount = 0;

        for (let i = 1; i <= lengthToExtend; i++) {
            const targetRowIndex = rowIndex + i;
            const dataKey = `${key}_row_${targetRowIndex}`;

            updates[dataKey] = {
                classKey: key,
                index: targetRowIndex,
                value: valueToExtend,
                isComposite: isTargetComposite,
                isPackage: isTargetIsPackage,
                isDisabled: isDisabled,
            };
            extendedCount++;
        }

        if (extendedCount > 0) {
            console.log(`Action Extend: Applying updates:`, updates);
            setVariableClassData((prevData: VariableRowDataState) => ({
                ...prevData,
                ...updates
            }));
        } else {
            toast.info("Length specified was zero or invalid.");
        }

        setActionModalOpen(false);
        setActionTargetCell(null);
        setCurrentAction(null);
        setActionInputValue('');
    };

    const actionFillEmpty = () => {
        if (!actionTargetCell) {
            toast.error("Cannot perform action: Target cell not set.");
            return;
        }

        const { key, rowIndex, value: valueToFill, isComposite: isTargetComposite, isPackage: isTargetIsPackage } = actionTargetCell;
        const maxRowIndex = getMaxRowIndex(variableRowData);
        const updates: VariableRowDataState = {};
        let filledCount = 0;

        const logValue = isTargetIsPackage ? `Package (ID: ${(valueToFill as unknown as IGlobalVariablePackage)?.dataId})` : valueToFill;
        console.log(`Action Fill: Filling empty cells below row ${rowIndex} in column "${key}" with value:`, logValue, `(isComposite=${isTargetComposite}, isPackage=${isTargetIsPackage})`);

        if (maxRowIndex <= rowIndex) {
            toast.info("No rows below the selected cell to fill.");
            setActionModalOpen(false);
            return;
        }

        for (let i = rowIndex + 1; i <= maxRowIndex; i++) {
            const dataKey = `${key}_row_${i}`;
            const existingCell = variableRowData[dataKey];

            let isCellEmpty = !existingCell ||
                (existingCell.isComposite && Array.isArray(existingCell.value) && existingCell.value.length === 0) ||
                (!existingCell?.isComposite && !existingCell?.isPackage && typeof existingCell?.value === 'string' && existingCell.value.trim() === '') ||
                (!existingCell?.isComposite && !existingCell?.isPackage && existingCell?.value == null);

            if (isCellEmpty) {
                updates[dataKey] = {
                    classKey: key,
                    index: i,
                    value: valueToFill,
                    isComposite: isTargetComposite,
                    isPackage: isTargetIsPackage,
                    isDisabled: isDisabled,
                };
                filledCount++;
            }
        }

        if (filledCount > 0) {
            console.log(`Action Fill: Applying updates:`, updates);
            setVariableClassData((prevData: VariableRowDataState) => ({
                ...prevData,
                ...updates
            }));
        } else {
            toast.info(`No empty cells found below to fill in column "${key}".`);
        }

        setActionModalOpen(false);
        setActionTargetCell(null);
        setCurrentAction(null);
        setActionInputValue('');
    };

    const renderActionModal = () => {
        if (!actionTargetCell) return null;

        const { key, rowIndex, value, isComposite, isPackage } = actionTargetCell;

        const displayValueInModal = isComposite && Array.isArray(value)
            ? `[${value.join(', ')}] (Composite)`
            : isPackage && typeof value === 'object' && value !== null && 'dataId' in value
                ? `Package: ${value.name || `ID ${value.dataId}`}`
                : typeof value === 'string'
                    ? `"${value}"`
                    : '[Unknown Value Type]';

        if (currentAction === 'extendLength') {
            return (
                <div className={styles.actionModal}>
                    <h3>Extend Value for "{key}" (Row {rowIndex + 1})</h3>
                    <p>Value: <strong>{displayValueInModal}</strong></p>
                    <form onSubmit={(e) => { e.preventDefault(); actionExtendLength(); }} className={styles.actionForm}>
                        <label>Extend by how many rows?</label>
                        <input
                            type="number" placeholder="Number of rows" value={actionInputValue}
                            onChange={(e) => setActionInputValue(e.target.value)}
                            min="1" step="1" required autoFocus className={styles.inputField}
                        />
                        <div className={styles.actionModalButtons}>
                            <button type="submit" className={styles.submitButton}>Extend</button>
                            <button type="button" onClick={() => setCurrentAction(null)} className={styles.cancelButton}>Back</button>
                            <button type="button" onClick={() => { setActionModalOpen(false); setActionTargetCell(null); }} className={styles.cancelButton}>Cancel All</button>
                        </div>
                    </form>
                </div>
            );
        }

        if (currentAction === 'fillEmpty') {
            return (
                <div className={styles.actionModal}>
                    <h3>Fill Empty Below for "{key}" (Row {rowIndex + 1})</h3>
                    <p>This will fill all empty cells below Row {rowIndex + 1} in the "{key}" column with the value:</p>
                    <p><strong>{displayValueInModal}</strong></p>
                    <div className={styles.actionModalButtons}>
                        <button type="button" onClick={actionFillEmpty} className={styles.submitButton}>Confirm Fill</button>
                        <button type="button" onClick={() => setCurrentAction(null)} className={styles.cancelButton}>Back</button>
                        <button type="button" onClick={() => { setActionModalOpen(false); setActionTargetCell(null); }} className={styles.cancelButton}>Cancel All</button>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.actionModal}>
                <h3>Cell Actions for "{key}" (Row {rowIndex + 1})</h3>
                <p>Value: <strong>{displayValueInModal}</strong></p>
                <div className={styles.actionModalButtons}>
                    <button onClick={() => setCurrentAction('extendLength')}>Extend Value Down...</button>
                    <button onClick={() => setCurrentAction('fillEmpty')}>Fill Empty Cells Below</button>
                    <button onClick={() => { setActionModalOpen(false); setActionTargetCell(null); }}>Close</button>
                </div>
            </div>
        );
    };

    const handleDeleteTableData = async () => {
        const confirmation = window.confirm(
            `CAUTION: This will permanently delete all table data (headers and cells). Are you sure you want to proceed?`
        );
        if (confirmation) {
            setAddedClassKeys([]);
            submitTableData([]);
            setVariableClassData({});
            setApprovedTableCellClear && setApprovedTableCellClear(true);
            setApprovedTableSheetClear && setApprovedTableSheetClear(true);
            try {
                const formDataPayload = new FormData();

                formDataPayload.append('approvedTableSheetClear', 'true');
                formDataPayload.append('approvedTableCellClear', 'true');


                console.log(`Sending PATCH to clear table data for ${productType}/${_id}`);
                const response = await fetch(`/api/productManager/${productType}/${_id}`, {
                    method: 'PATCH',
                    body: formDataPayload,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => response.text());
                    console.error(`Failed to clear table data on server. Status: ${response.status}`, errorData);
                    toast.error(`Error clearing table data: ${errorData.error || errorData}`);
                }
            } catch (error) {
                console.error("Error sending clear table data request:", error);
                toast.error('An error occurred while trying to clear table data.');
            }
        }
    };

    const handleDisplayTable = (e: React.FormEvent) => {
        e.preventDefault();
        setHideTable(true);
        if (hideTable) {
            setHideTable(false);
        }
    }

    return (
        <div className={styles.wavekeyTable}>
            <div className={styles.header}>
                <h2
                    onClick={(e) => handleDisplayTable(e)}
                >
                    Table | <span style={{ fontWeight: "10", fontSize: "12pt" }}>{`${Object.keys(variableRowData).length} total queries`} | {hideTable ? "Show" : "Hide"}</span>
                </h2>
                {!hideTable && (
                    <div className={styles.zoomControls}>
                        <button
                            onClick={handleZoomOut}
                            className={styles.zoomButton}
                            title="Zoom Out"
                        >
                            <span>-</span>
                        </button>
                        <div className={styles.zoomDisplay}>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                value={zoomLevel}
                                onChange={handleZoomChange}
                                className={styles.zoomSlider}
                            />
                            <span>{zoomLevel}%</span>
                        </div>
                        <button
                            onClick={handleZoomIn}
                            className={styles.zoomButton}
                            title="Zoom In"
                        >
                            <span>+</span>
                        </button>

                        <button
                            onClick={handleZoomReset}
                            className={styles.zoomResetButton}
                            title="Reset Zoom"
                        >
                            <span>Reset</span>
                        </button>
                    </div>
                )}
            </div>
            {actionModalOpen && (
                <div className={styles.actionModalOverlay}>
                    {renderActionModal()}
                </div>
            )}
            {!hideTable && (
                <div className={styles.tableDisplay + `${hideTable ? styles.closeTableDisplay : styles.openTableDisplay}`}>
                    <form>
                        <input
                            id="row-sheet-upload"
                            type="file"
                            accept=".txt,text/plain,.csv,text/csv"
                            onChange={handleImportRowSheet}
                            className={styles.fileInput}
                            style={{ display: 'none' }}
                        />
                        {!permanentOrigin && (
                            <input
                                type="text"
                                value={localClassKeyInput}
                                onChange={handleInputChange}
                                placeholder="Enter Class Key"
                                className={styles.inputField}
                            />
                        )}
                        <div className={styles.rowContainer}>
                            {!permanentOrigin ? (
                                <div className={styles.classKeyButtons}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (localClassKeyInput.trim() === '') {
                                                toast.error('Please enter a valid class key');
                                                return;
                                            }
                                            const newKey: tableSheetData = {
                                                index: classKeyInputObjects.length,
                                                value: localClassKeyInput.trim(),
                                                isOrigin: false,
                                            };
                                            const updatedKeys = [...classKeyInputObjects, newKey];
                                            setAddedClassKeys(updatedKeys);
                                            submitTableData(updatedKeys);
                                            areRowsPopulated(true);
                                            setLocalClassKeyInput('');
                                        }}
                                        className={styles.addButton}
                                    >
                                        Add Class Key
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddedClassKeys([]);
                                            submitTableData([]);
                                            areRowsPopulated(false);
                                            setApprovedTableSheetClear && setApprovedTableSheetClear(true);
                                        }}
                                        className={styles.deleteButton}
                                    >
                                        Delete All Class Keys
                                    </button>
                                    <label>
                                        <div className={styles.uploadButton}>Upload Header Sheet</div>
                                        <input
                                            id="class-key-upload"
                                            type="file"
                                            accept=".csv"
                                            onChange={handleImportHeaderSheet}
                                            className={styles.fileInput}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className={styles.originClassKeyButtons}>
                                    <button
                                        type="button"
                                        onClick={handleDeleteTableData}
                                        className={styles.deleteButton}
                                    >
                                        Delete Table
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            areRowsPopulated(false);
                                            handleClearAllCells();
                                        }}
                                        className={styles.deleteButton}
                                    >
                                        Clear Table
                                    </button>
                                </div>
                            )}
                            {headerOrigin && !permanentOrigin ? (
                                <div className={styles.currentOriginContainer}>
                                    <h4>Current Origin {" "}
                                        <span style={{ color: "black", backgroundColor: "yellow", padding: "5px", borderRadius: "5px" }}>
                                            {headerOrigin}
                                        </span>
                                    </h4>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePermanentOriginKey(headerOrigin);
                                        }}
                                        title="Set this class key as the permanent origin, this will be the starting point for all automation processes"
                                    >
                                        Set As Origin*
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.currentOriginContainer}>
                                    {permanentOrigin ? (
                                        <h4 style={{ color: "black", backgroundColor: "yellow", padding: "5px", borderRadius: "5px" }}>
                                            {permanentOrigin}
                                        </h4>
                                    ) : (
                                        null
                                    )}
                                </div>
                            )}
                        </div>
                    </form>

                    <div className={styles.tableOverflowContainer}>
                        <div
                            ref={tableContainerRef}
                            className={styles.wavekeyTableForm}
                            style={{
                                transform: `scale(${zoomLevel / 100})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.rowNumberHeader}>#</th>
                                        {classKeyInputObjects.map((keyObj) => (
                                            <ClassKey
                                                key={keyObj.index}
                                                input={keyObj.value}
                                                onDelete={handleDeleteKey}
                                                onEdit={handleEditKey}
                                                originAssignment={handleHeaderOriginKey}
                                                permanentOrigin={permanentOrigin}
                                                headerOrigin={headerOrigin}
                                                onTriggerImport={triggerRowImport}
                                                clearCellRow={handleClearColumnData}
                                                disableCellRow={handleDisableColumnCells}
                                                onSetDefault={handleSetDefaultColumnValue}
                                            />
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(variableRowData).length > 0 ? (
                                        (() => {
                                            const currentMaxIndex = getMaxRowIndex(variableRowData);
                                            let maxArrayLength = Math.max(1, currentMaxIndex + 1);
                                            let rowDataMap = new Map();

                                            Object.keys(variableRowData).forEach(key => {
                                                const rowMatch = key.match(/^(.+)_row_(\d+)$/);

                                                if (rowMatch) {
                                                    const [_, baseKey, rowIndex] = rowMatch;
                                                    const rowNum = parseInt(rowIndex, 10);

                                                    if (!rowDataMap.has(rowNum)) {
                                                        rowDataMap.set(rowNum, new Map());
                                                    }

                                                    rowDataMap.get(rowNum).set(baseKey, variableRowData[key]);

                                                    maxArrayLength = Math.max(maxArrayLength, rowNum + 1);
                                                } else {
                                                    const data = variableRowData[key];
                                                    if (Array.isArray(data)) {
                                                        maxArrayLength = Math.max(maxArrayLength, data.length);
                                                    }
                                                }
                                            });
                                            return Array.from({ length: maxArrayLength }).map((_, rowIndex) => (
                                                <tr key={`row-${rowIndex}`}>
                                                    <td className={styles.rowNumberCell}>{rowIndex + 1}</td>
                                                    {classKeyInputObjects.map((keyObj) => {
                                                        const cellKey = `${keyObj.value}_row_${rowIndex}`;
                                                        const cellData = rowDataMap.get(rowIndex)?.get(keyObj.value);
                                                        const isCompositeCell = cellData?.isComposite ?? false;
                                                        const isPackage = cellData?.isPackage ?? false;
                                                        const cellValue = cellData?.value;
                                                        let isDefaultCell = cellData?.isDefault ?? false;
                                                        const isDisabledCell = cellData?.isDisabled ?? false; // Get the isDisabled state
                                                        const isExpanded = expandedCellKey === cellKey;

                                                        type PackageObject = IGlobalVariablePackage;

                                                        let displayContent: React.ReactNode = '';
                                                        let editActionValue: any = '';

                                                        if (cellData) {
                                                            if (keyObj.value === 'Icon' && rowIndex < 2) {
                                                                console.log(`TABLE RENDER (${cellKey}): isPackage=${isPackage}, typeof cellValue=${typeof cellValue}, cellValue=`, cellValue);
                                                                if (typeof cellValue === 'object' && cellValue !== null) console.log(`  'dataId' in cellValue: ${'dataId' in cellValue}`);
                                                            }

                                                            if (isCompositeCell && Array.isArray(cellValue)) {
                                                                displayContent = `COMP - ${cellData.classKey} (${cellValue.length})`;
                                                                editActionValue = JSON.stringify(cellValue);
                                                            } else if (isPackage && typeof cellValue === 'object' && cellValue !== null && 'dataId' in cellValue) {
                                                                const packageObj = cellValue as PackageObject;
                                                                let fileCount = 0;
                                                                let errorMsg = '';
                                                                if (packageObj.variableData) {
                                                                    if (packageObj.variableData instanceof Map) {
                                                                        packageObj.variableData.forEach(entry => {
                                                                            if (entry && typeof entry.value === 'string') {
                                                                                try {
                                                                                    const parsedValue = JSON.parse(entry.value);
                                                                                    fileCount += parsedValue?.filename?.length ?? 0;
                                                                                } catch (e: any) {
                                                                                    console.error(`Error parsing package entry value in Table (${cellKey}):`, e, entry.value);
                                                                                    errorMsg = ` Error: ${e.message}`;
                                                                                }
                                                                            }
                                                                        });
                                                                    } else {
                                                                        console.warn(`Expected packageObj.variableData to be a Map for cell ${cellKey}, but got:`, typeof packageObj.variableData, packageObj.variableData);
                                                                        errorMsg = ` Error: Invalid data format`;
                                                                        Object.values(packageObj.variableData).forEach((entry: any) => {
                                                                            if (entry && typeof entry.value === 'string') {
                                                                                try {
                                                                                    const parsedValue = JSON.parse(entry.value);
                                                                                    fileCount += parsedValue?.filename?.length ?? 0;
                                                                                } catch (e) {
                                                                                    console.error(`Error parsing package entry value in Table (object fallback for ${cellKey}):`, e, entry.value);
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                } else {
                                                                    console.warn(`Package object for cell ${cellKey} has no variableData.`);
                                                                    errorMsg = ` Error: No content`;
                                                                }
                                                                displayContent = `PKG: ${packageObj.name || `ID ${packageObj.dataId}`} (${fileCount} files)`;
                                                                editActionValue = packageObj;
                                                            } else if (typeof cellValue === 'string') {
                                                                displayContent = cellValue;
                                                                editActionValue = cellValue;
                                                            } else if (cellValue === undefined || cellValue === null || cellValue === '') {
                                                                displayContent = '';
                                                                editActionValue = '';
                                                            } else {
                                                                if (typeof cellValue === 'object') {
                                                                    displayContent = '[object Object]';
                                                                    console.warn(`Cell ${cellKey} has object value but isPackage flag is false or structure is wrong.`);
                                                                } else {
                                                                    displayContent = '[Invalid Data]';
                                                                    console.warn(`Unexpected cellValue type for key ${cellKey}:`, cellValue);
                                                                }
                                                                editActionValue = String(cellValue);
                                                            }
                                                        } else {
                                                            displayContent = '';
                                                            editActionValue = '';
                                                        }

                                                        return (
                                                            <td
                                                                key={`${keyObj.index}-${rowIndex}`}
                                                                className={`${isDefaultCell ? styles.tableCellDefault : styles.tableCell} ${isDisabledCell ? styles.disabledCell : ''}`}
                                                                id={`${keyObj.value}-${rowIndex}`}
                                                            >
                                                                <div className={styles.tableContainer}>
                                                                    <span
                                                                        onClick={() => (isCompositeCell || (isPackage && typeof cellValue === 'object')) && toggleExpandComposite(cellKey)}
                                                                        className={(isCompositeCell || (isPackage && typeof cellValue === 'object')) ? styles.compositeDisplay : ''}
                                                                        title={(isCompositeCell || (isPackage && typeof cellValue === 'object')) ? "Click to view/hide details" : ""}
                                                                    >
                                                                        {displayContent}
                                                                    </span>
                                                                    <div className={styles.cellButtons}>
                                                                        {cellValue !== undefined && cellValue !== null && cellValue !== '' && (
                                                                            <>
                                                                                {(isCompositeCell || isPackage) && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); toggleExpandComposite(cellKey); }}
                                                                                        className={styles.cellExpand}
                                                                                        title={isExpanded ? 'Minimize' : 'Expand details'}
                                                                                    >
                                                                                        {isExpanded ? 'Min' : 'Exp'}
                                                                                    </button>
                                                                                )}
                                                                                {!isPackage && !isCompositeCell && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleEditCellValue(keyObj.value, rowIndex, editActionValue); }}
                                                                                        className={styles.cellEdit} title="Edit cell data"
                                                                                    > Edit </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const actionValue = isCompositeCell && Array.isArray(cellValue) ? cellValue :
                                                                                            isPackage && typeof cellValue === 'object' ? cellValue :
                                                                                                String(cellValue ?? '');
                                                                                        setActionTargetCell({ key: keyObj.value, rowIndex, value: actionValue, isComposite: isCompositeCell, isPackage: isPackage });
                                                                                        setCurrentAction(null); setActionInputValue(''); setActionModalOpen(true);
                                                                                    }}
                                                                                    className={styles.cellAction} title="Perform action on cell data"
                                                                                > Action </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCell(keyObj.value, rowIndex); }}
                                                                                    className={styles.cellDelete} title="Delete cell data"
                                                                                    disabled={isDisabledCell} // Optionally disable buttons too
                                                                                > &times; </button>
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    {isCompositeCell && isExpanded && Array.isArray(cellValue) && (
                                                                        <div className={styles.compositeExpandedView}>
                                                                            <ul> {cellValue.map((val, idx) => <li key={`${cellKey}-val-${idx}`}>{val}</li>)} </ul>
                                                                        </div>
                                                                    )}

                                                                    {isPackage && isExpanded && typeof cellValue === 'object' && cellValue !== null && 'variableData' in cellValue && (
                                                                        <div className={styles.compositeExpandedView}>
                                                                            {(() => {
                                                                                const pkgObjForExpand = cellValue as PackageObject;
                                                                                if (!pkgObjForExpand.variableData) return <div className={styles.packageItemDetail}>No variable data found.</div>;

                                                                                const entriesToRender: React.ReactNode[] = [];
                                                                                if (pkgObjForExpand.variableData instanceof Map) {
                                                                                    pkgObjForExpand.variableData.forEach((entry, pkgContentKey) => {
                                                                                        if (entry && typeof entry.value === 'string') {
                                                                                            try {
                                                                                                const parsedValue = JSON.parse(entry.value);
                                                                                                if (parsedValue && parsedValue.filename) {
                                                                                                    entriesToRender.push(
                                                                                                        <div key={`${cellKey}-pkg-${pkgContentKey}`} className={styles.packageItemDetail}>
                                                                                                            <strong>{pkgContentKey}:</strong>
                                                                                                            {parsedValue.filename.map((fname: string, fileIdx: number) => (
                                                                                                                <div key={`${cellKey}-pkg-${pkgContentKey}-file-${fileIdx}`} className={styles.fileUrlPair}>
                                                                                                                    <span>File: {fname}</span>
                                                                                                                    {parsedValue.url?.[fileIdx] && (
                                                                                                                        <>
                                                                                                                            <span> | URL: {parsedValue.url[fileIdx]}</span>
                                                                                                                            <a href={parsedValue.url[fileIdx]} target="_blank" rel="noopener noreferrer" title={parsedValue.url[fileIdx]}> (Link) </a>
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    );
                                                                                                }
                                                                                            } catch (e) {
                                                                                                console.error(`Error parsing package entry for expand view (${cellKey}):`, e, entry.value);
                                                                                                entriesToRender.push(<div key={`${cellKey}-pkg-${pkgContentKey}-error`} className={styles.packageItemDetail}>Error parsing data for {pkgContentKey}</div>);
                                                                                            }
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    console.warn(`Expected variableData to be a Map for expanded view cell ${cellKey}`);
                                                                                    entriesToRender.push(<div className={styles.packageItemDetail}>Error: Invalid package data structure (not a Map).</div>);
                                                                                }
                                                                                return entriesToRender.length > 0 ? entriesToRender : <div className={styles.packageItemDetail}>No files found in package data.</div>;
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ));
                                        })()
                                    ) : (
                                        <tr className={Object.keys(variableData).length > 0 ? 'show-default-unavailable-data' : 'hide-default-unavailable-data'}>
                                            <td colSpan={classKeyInputObjects.length} className={styles.emptyRow}>
                                                No data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {!headerOrigin && !permanentOrigin && classKeyInputObjects.length > 0 && (
                        <div className={styles.preOriginTip}>
                            <p>Click on a <b>Class Key</b> above to select an <b>Origin</b> point for the automation process</p>
                        </div>
                    )}
                </div>
            )}
            <ToastContainer />
        </div>
    );
};

const ClassKey: React.FC<{
    input: string;
    onDelete: (key: string) => void;
    onEdit: (key: string, newValue: string) => void;
    originAssignment: (key: string) => void;
    permanentOrigin: string;
    headerOrigin: string;
    onTriggerImport: (columnKey: string) => void;
    clearCellRow: (key: string, rowIndex: number) => void;
    disableCellRow: (key: string, rowIndex: number) => void;
    onSetDefault: (key: string) => void;
}> = ({ input, onDelete, onEdit, originAssignment, permanentOrigin, headerOrigin, onTriggerImport, clearCellRow, onSetDefault, disableCellRow }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(input);
    const [isDisabled, setIsDisabled] = useState(false);

    const handleDisableToggle = () => {
        setIsDisabled((prev) => !prev);
    }

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEdit(input, editValue);
        setIsEditing(false);
    };

    return (
        <th
            className={styles.classKeyHeader}
            onClick={(e) => {
                e.preventDefault();
                originAssignment(input);
            }}
        >
            {headerOrigin === input ?
                <div className={styles.headerOriginDisplay}>
                    ORIGIN
                </div>
                : ''}
            <div className={styles.classKeyContainer}>
                {isEditing ? (
                    <form onSubmit={handleEditSubmit}>
                        <input
                            type="text"
                            value={editValue || ""}
                            onChange={(e) => setEditValue(e.target.value)}
                        />
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => {
                            setIsEditing(false);
                        }}>
                            Cancel
                        </button>
                    </form>
                ) : (
                    <div className={styles.inputHeader}>
                        {permanentOrigin && (
                            <div className={styles.headerButtonContainer}>
                                <div className={styles.buttonContents}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetDefault(input);
                                        }}
                                        className={styles.importKeyButton}
                                        title={`Set a default value for empty cells in the "${input}" column`}
                                    >
                                        Default
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTriggerImport(input);
                                        }}
                                        className={styles.importKeyButton}
                                        title={`Import row data for ${input}`}
                                    >
                                        Import
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearCellRow(input, 0);
                                        }}
                                        className={styles.importKeyButton}
                                        title={`Clear row data for ${input}`}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            disableCellRow(input, 0);
                                            handleDisableToggle();
                                        }}
                                        className={styles.importKeyButton}
                                        title={`Disable row data for ${input}`}
                                    >
                                        {isDisabled ? 'Enable' : 'Disable'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <span>{input}</span>
                        <div className={styles.keyButtons}>
                            {!permanentOrigin ? (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                        className={styles.editKeyButton}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(input);
                                        }}
                                        className={styles.deleteKeyButton}
                                    >
                                        ✕
                                    </button>
                                </>
                            ) : ("")}
                        </div>
                    </div>
                )}
            </div>
        </th>
    );
};

export default Table;