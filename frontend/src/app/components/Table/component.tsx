import React, { useState, useEffect, useRef } from "react";
import { tableCellData, ProductManager } from "../../../../types/productManager";
import styles from './component.module.css';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

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
    setVariableClassData: (data: Record<string, any>) => void;
}

const Table: React.FC<TableProps> = ({ productManager, variableRowData, selectedClassKey, variableData, originAssignment, submitTableData, areRowsPopulated, setVariableClassData, setApprovedTableCellClear, setApprovedTableSheetClear }) => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<tableSheetData[]>([]);
    const [headerOrigin, setHeaderOrigin] = useState<string>("");
    const [permanentOrigin, setPermanentOrigin] = useState<string>("");
    const [hideTable, setHideTable] = useState<boolean>(false);

    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const tableContainerRef = useRef<HTMLDivElement>(null);

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

    const handleEditCell = (key: string, rowIndex: number, currentValue: string) => {
        const newValue = prompt("Edit cell value:", currentValue);

        if (newValue !== null) {
            setVariableClassData((prevData: any) => {
                const updatedData = { ...prevData };

                const dataKey = `${key}_row_${rowIndex}`;

                if (updatedData[dataKey]) {
                    updatedData[dataKey] = {
                        ...updatedData[dataKey],
                        value: newValue,
                        __rowIndex: rowIndex
                    };
                }
                else if (rowIndex === 0 && updatedData[key]) {
                    updatedData[dataKey] = {
                        ...updatedData[key],
                        value: newValue,
                        __rowIndex: rowIndex
                    };
                }
                else {
                    updatedData[dataKey] = {
                        value: newValue,
                        __rowIndex: rowIndex
                    };
                }

                return updatedData;
            });
        }
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
                } else {
                    const result = await response.json();
                    console.log("Server successfully cleared table data:", result);
                    toast.success('Table data cleared successfully.');
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
            {!hideTable && (
                <div className={styles.tableDisplay + `${hideTable ? styles.closeTableDisplay : styles.openTableDisplay}`}>
                    <form>
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
                                    >
                                        Set As Origin
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
                                        {classKeyInputObjects.map((keyObj) => (
                                            <ClassKey
                                                key={keyObj.index}
                                                input={keyObj.value}
                                                onDelete={handleDeleteKey}
                                                onEdit={handleEditKey}
                                                originAssignment={handleHeaderOriginKey}
                                                permanentOrigin={permanentOrigin}
                                                headerOrigin={headerOrigin}
                                            />
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(variableRowData).length > 0 ? (
                                        (() => {
                                            let maxArrayLength = 1;
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

                                            const getCellValue = (
                                                keyObj: { index: number; value: string; },
                                                rowIndex: number,
                                                rowDataMap: Map<number, Map<string, any>>,
                                                variableRowData: VariableRowDataState
                                            ): string => {
                                                const rowSpecificData = rowDataMap.has(rowIndex) ?
                                                    rowDataMap.get(rowIndex)?.get(keyObj.value) : undefined;

                                                let columnData: any = undefined;
                                                const baseColumnData = variableRowData[keyObj.value];

                                                if (baseColumnData !== undefined) {
                                                    if (Array.isArray(baseColumnData)) {
                                                        columnData = rowIndex < baseColumnData.length ? baseColumnData[rowIndex] : undefined;
                                                    } else if (rowIndex === 0) {
                                                        columnData = baseColumnData;
                                                    }
                                                }

                                                const cellData = rowSpecificData !== undefined ? rowSpecificData : columnData;

                                                if (cellData && typeof cellData === 'object' && 'index' in cellData && 'value' in cellData) {
                                                    return cellData.value;
                                                }

                                                let cellValue = '';

                                                if (cellData !== undefined && cellData !== null) {
                                                    if (typeof cellData === 'object' && cellData !== null && '__rowIndex' in cellData) {
                                                        const { __rowIndex, ...actualData } = cellData;

                                                        if (Object.keys(actualData).length === 0) {
                                                        } else if (Object.keys(actualData).length === 1) {
                                                            const singleValue = Object.values(actualData)[0];
                                                            cellValue = typeof singleValue === 'object' && singleValue !== null
                                                                ? JSON.stringify(singleValue)
                                                                : String(singleValue ?? '');
                                                        } else {
                                                            cellValue = JSON.stringify(actualData);
                                                        }
                                                    } else if (typeof cellData === 'string') {
                                                        cellValue = cellData;
                                                    } else if (Array.isArray(cellData)) {
                                                        cellValue = rowIndex < cellData.length ?
                                                            (typeof cellData[rowIndex] === 'object' && cellData[rowIndex] !== null ?
                                                                JSON.stringify(cellData[rowIndex]) :
                                                                String(cellData[rowIndex] ?? '')) : '';
                                                    } else if (typeof cellData === 'object' && cellData !== null) {
                                                        cellValue = (cellData.name as string | undefined) || JSON.stringify(cellData);
                                                    } else {
                                                        cellValue = String(cellData);
                                                    }
                                                }

                                                return cellValue;
                                            };

                                            return Array.from({ length: maxArrayLength }).map((_, rowIndex) => (
                                                <tr key={`row-${rowIndex}`}>
                                                    {classKeyInputObjects.map((keyObj) => {
                                                        const cellValue = getCellValue(keyObj, rowIndex, rowDataMap, variableRowData);

                                                        return (
                                                            <td
                                                                key={`${keyObj.index}-${rowIndex}`}
                                                                className={`${styles.tableCell} ${keyObj.value === selectedClassKey ? styles.tableCell : ''}`}
                                                            >
                                                                <div className={styles.tableContainer}>
                                                                    {cellValue}
                                                                    <div className={styles.cellButtons}>
                                                                        {cellValue && (
                                                                            <>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteCell(keyObj.value, rowIndex);
                                                                                    }}
                                                                                    className={styles.cellDelete}
                                                                                    title="Delete cell data"
                                                                                >
                                                                                    &times;
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleEditCell(keyObj.value, rowIndex, cellValue);
                                                                                    }}
                                                                                    className={styles.cellEdit}
                                                                                    title="Edit cell data"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ));
                                        })()
                                    ) : (
                                        <tr>
                                            <td colSpan={classKeyInputObjects.length} className={styles.emptyRow}>
                                                No data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
}> = ({ input, onDelete, onEdit, originAssignment, permanentOrigin, headerOrigin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(input);

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
            {
                headerOrigin === input ?
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
                    <>
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
                    </>
                )}
            </div>
        </th>
    );
};

export default Table;