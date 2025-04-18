import { useState, useEffect, useRef } from "react";
import styles from './component.module.css';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

interface tableSheetData {
    index: number;
    value: string;
    isOrigin: boolean;
}

interface TableProps {
    variableRowData: Record<string, any>;
    selectedClassKey: string;
    variableData: tableSheetData[];
    originAssignment: (key: string) => void;
    submitVariableData: (values: tableSheetData[]) => void;
    areRowsPopulated: (value: boolean) => void;
    setVariableClassData: (data: Record<string, any>) => void;
}

const Table: React.FC<TableProps> = ({ variableRowData, selectedClassKey, variableData, originAssignment, submitVariableData, areRowsPopulated, setVariableClassData }) => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<tableSheetData[]>([]);
    const [headerOrigin, setHeaderOrigin] = useState<string>("");
    const [permanentOrigin, setPermanentOrigin] = useState<string>("");

    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const originKey = variableData.find(key => key.isOrigin);
        const duplicate = classKeyInputObjects.some(keyObj => keyObj.value === localClassKeyInput.trim());

        if (originKey) {
            setPermanentOrigin(originKey.value);
            originAssignment(originKey.value);
        };

        if (duplicate) {
            toast.error('Class key already exists');
            return;
        };
    }, [variableData]);

    useEffect(() => {
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
                            submitVariableData(classKeyObjects);
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

    const handleHeaderOrigin = (key: string) => {
        if (permanentOrigin) {
            return null;
        }
        if (headerOrigin !== key) {
            setHeaderOrigin(key);
        }
    };

    const handlePermanentOrigin = (key: string) => {
        if (headerOrigin === key && !permanentOrigin) {
            const confirmation = window.confirm(
                `Are you sure you want to set "${key}" as the permanent origin?\nMake sure that this class key has a wide range of variable classes`
            );
            if (confirmation) {
                setPermanentOrigin(key);
                const updatedKeys = classKeyInputObjects.map((entry) =>
                    entry.value === key ? { ...entry, isOrigin: true } : { ...entry, isOrigin: false }
                );
                submitVariableData(updatedKeys);
                originAssignment(key);
                setAddedClassKeys(updatedKeys);
            }
        }
    };

    const handleDeleteKey = (key: string) => {
        const updatedKeys = classKeyInputObjects.filter((entry) => entry.value !== key);
        setAddedClassKeys(updatedKeys);
        submitVariableData(updatedKeys);
    };

    const handleEditKey = (key: string, newValue: string) => {
        const updatedKeys = classKeyInputObjects.map((entry) =>
            entry.value === key ? { ...entry, value: newValue } : entry
        );
        setAddedClassKeys(updatedKeys);
        submitVariableData(updatedKeys);
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

        toast.success(`Data deleted for ${key} at row ${rowIndex}`);
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

            toast.success(`Updated data for ${key} at row ${rowIndex}`);
        }
    };

    // Will fetch the data from the backend and delete the whole data
    const handleDeleteTableData = () => {
        const confirmation = window.confirm(
            `CAUTION: This will permanently delete all data in the table. Are you sure you want to proceed?`
        );
        if (confirmation) {

        }
    };

    return (
        <div className={styles.wavekeyTable}>
            <div className={styles.header}>
                <h2>Table</h2>

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
            </div>

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
                                    submitVariableData(updatedKeys);
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
                                    submitVariableData([]);
                                    areRowsPopulated(false);
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
                                    handlePermanentOrigin(headerOrigin);
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
                                        originAssignment={handleHeaderOrigin}
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
                                        keyObj: { index: number; value: string; isOrigin: boolean },
                                        rowIndex: number,
                                        rowDataMap: Map<number, Map<string, any>>,
                                        variableRowData: Record<string, any>
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

                                    areRowsPopulated(true);

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