import React, { useMemo, useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import {
    clearAllVariableClassArray,
    deleteVariableClassArray,
} from '@/app/store/productManagerSlice';
import { mainKeyString, tableSheetData, tableCellData } from '../../../../types/productManager';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import { RootState } from '@/app/store/store';
import { useSelector, useDispatch } from 'react-redux';
import Table from '../Table/component';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface VariableDataState {
    tableSheet: tableSheetData[];
}

type VariableRowDataState = Record <string, tableCellData>;

interface VariableManagerProps {
    variableData: VariableDataState;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
    variableRowData: VariableRowDataState;
    setVariableRowData: React.Dispatch<React.SetStateAction<VariableRowDataState>>;
}

const VariableManager: React.FC<VariableManagerProps> = ({
     variableData, 
     setVariableData,
     variableRowData,
     setVariableRowData, 
    }) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [originAssignment, setOriginAssignment] = useState("");
    const [sendToSheetModal, setSendToSheetModal] = useState(false);
    const [selectedClassKey, setSelectedClassKey] = useState<string>('');
    const [variableClassIdentifier, setVariableClassIdentifier] = useState<number | null | undefined>(null);
    const [rowsPopulated, setRowsPopulated] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    let [addOrSend, setAddOrSend] = useState<string>('send');

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);

    const dispatch = useDispatch();

    React.useEffect(() => {
        setRowsPopulated(Object.keys(variableRowData).length > 0);
    }, [variableRowData]);

    const handleOpenParameterizationTab = (variableClasses: object) => {
        console.log('Open Parameterization Tab', variableClasses);
        setParameterizationData(variableClasses);
        setParameterizationOpen(true);
    };

    const handleSubmitTableData = (tableSheetData: tableSheetData[]) => {
        setVariableData((prevState) => ({
            ...prevState,
            tableSheet: tableSheetData,
        }));
    };

    const handleOriginAssignment = (key: string) => {
        if (originAssignment !== key) {
            setOriginAssignment(key);
        }
    };

    const handleCloseParameterizationTab = () => {
        setParameterizationOpen(false);
    };

    const itemForModal = useMemo(() => {
        if (variableClassIdentifier === null) {
            return null;
        }
        return globalVariableClass.find(item => item?.dataId === variableClassIdentifier);
    }, [variableClassIdentifier, globalVariableClass]);

    const handleSendToSheet = (
        variableDataRecord: Record<string, { dataId: number; value: string; } | null>,
        selectedKey: string,
        id: number | null | undefined
    ) => {
        console.log(`HANDLESENDTOSHEET: Received ID=${id}, Key=${selectedKey}, Data=`, variableDataRecord);
        if (!selectedKey) {
            toast.error('Please select a class key');
            return;
        }
        
        if (id === null) { 
            toast.error('Invalid item ID'); 
            return;
        }

        const dataToAdd: (string | undefined)[] = Object.values(variableDataRecord).map(item => item?.value);

        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);
        if (!selectedKeyObject) {
            toast.error(`Selected class key "${selectedKey}" not found in table headers.`);
            return;
        }

        setVariableRowData(prevData => {
            const updatedData = { ...prevData };

            let nextRowIndex = 0;
            Object.keys(updatedData).forEach(key => {
                const match = key.match(/^(.+)_row_(\d+)$/);
                if (match) {
                    const baseKey = match[1];
                    const rowNum = parseInt(match[2], 10);
                    if (baseKey === selectedKey && !isNaN(rowNum)) {
                       nextRowIndex = Math.max(nextRowIndex, rowNum + 1);
                    }
                }
            });
            console.log(`Next available row index for key "${selectedKey}" is ${nextRowIndex}`);

            if (dataToAdd.length > 0) {
                dataToAdd.forEach((itemValue, index) => {
                    const newRowKey = `${selectedKey}_row_${nextRowIndex + index}`;
                    updatedData[newRowKey] = {
                        index: nextRowIndex + index,
                        value: itemValue || "",
                    };
                    console.log(`Adding to sheet state: Key=${newRowKey}, Value=${itemValue}, RowIndex=${nextRowIndex + index}`);
                });
             } else {
                 console.warn("No data values found in variableDataRecord to add to the sheet.");
             }

            console.log("Updated variableClassData state:", updatedData);
            return updatedData;
        });

        toast.success(`Data sent to sheet under key: ${selectedKey}`);
    };

    const modalOptions = (key: number | null | undefined, object: Record<string, { dataId: number, value: string} | null>) => {
        console.log(`MODALOPTIONS: Received ID=${key}, Data=`, object);
        let name = "";

        if (Array.isArray(object)) {
            const firstValue = object[0];
            if (firstValue && typeof firstValue === 'string') {
                const match = firstValue.match(/^([^\s]+)/);
                name = match ? match[1] : "";
            }
        } else if (object && typeof object === 'object') {
            // if (object.value) {
            //     name = object.name.value;
            // } else {
            //     const values = Object.values(object.value);
            //     for (const value of values) {
            //         if (typeof value === 'string' && value !== '') {
            //             const match = value.match(/^([^\s]+)/);
            //             if (match) {
            //                 name = match[1];
            //                 break;
            //             }
            //         }
            //     }
            // }
            // Commented out for now because I'm afraid of the compiler throwing errors but saving for later because it might be important to reference
        };

        const valuesToDisplay = Object.values(object).map(item => item?.value);

        return (
            <div className={styles.modal}>
                <div className={styles.modalContent}>
                    <h2>Declare The Class Key for {name}</h2>
                    <div className={styles.modalPayload}>
                        <div className={styles.payloadContainer}>
                            <h5>Payload</h5>
                            <DisplayVariableClass
                                object={valuesToDisplay}
                            />
                        </div>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => setSendToSheetModal(false)}
                    >
                        &times;
                    </button>
                    <form>
                        <select
                            value={selectedClassKey}
                            onChange={(e) => setSelectedClassKey(e.target.value)}
                            className={styles.classKeySelect}
                        >
                            <option value="">-- Select a Class Key --</option>
                            {variableData.tableSheet.map((item, index) => (
                                <option key={`class-key-${index}`} value={item.value}>
                                    {item.value}
                                </option>
                            ))}
                        </select>
                        <div className={styles.modalButtons}>
                                <button
                                    type='button'
                                    className={styles.submitButton}
                                    disabled={!selectedClassKey}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSendToSheet(object, selectedClassKey, variableClassIdentifier);
                                        setSendToSheetModal(false);
                                    }}
                                >
                                    Send
                                </button>
                                <button
                                    type='button'
                                    className={styles.submitButton}
                                    disabled={!selectedClassKey}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteVariableClass(key);
                                        setVariableClassIdentifier(-1);
                                        handleSendToSheet(object, selectedClassKey, variableClassIdentifier);
                                        console.log("Deleted variable class with key:", key);
                                        setSendToSheetModal(false);
                                    }}
                                >
                                    Send & Delete
                                </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const handleDeleteVariableClass = (id: number | null | undefined) => {
        dispatch(deleteVariableClassArray(id));
    };

    const handleClearAllVariableClass = () => {
        dispatch(clearAllVariableClassArray());
    };

    const handleEditVariableClass = (object: Record<string, any>) => {
        // Need to reinitialize parameterization details
    }

    const displayVariableClass = (object: Record<string, any>) => {
        const itemsPerPage = 5;

        const displayableEntries = Object.entries(object);
        const totalPages = Math.ceil(displayableEntries.length / itemsPerPage);

        const currentEntries = displayableEntries.slice(
            currentPage * itemsPerPage,
            (currentPage + 1) * itemsPerPage
        );

        const filteredEntries = currentEntries.map(([key, value], index) => {
            let displayValue: string;
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

            if (key === 'variableData' && typeof value === 'object' && value !== null) {
                const innerValues = Object.values(value);
                if (innerValues.length > 0 && innerValues.every(item => typeof item === 'object' && item !== null && 'value' in item)) {
                    displayValue = innerValues.map(item => (item as { value: string }).value).join(", ");
                } else {
                    displayValue = JSON.stringify(value);
                }
            } else if (key === 'dataLength' && typeof value === 'number') {
                 displayValue = value.toString();
            } else if (key === 'dataId' && typeof value === 'number') {
                 displayValue = value.toString();
            } else if (key === 'name' && (value === "" || value === null || value === undefined)) {
                 displayValue = "No Name";
            } else if (typeof value === 'object' && value !== null) {
                 displayValue = JSON.stringify(value);
            } else {
                 displayValue = value !== null && value !== undefined ? value.toString() : "";
            }

            if (displayValue === "" && key !== 'name') {
                return null;
            }

            return (
                <div key={`${currentPage}-${key}-${index}`} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>{capitalizedKey}</b>
                        <br />
                        <span style={{ fontSize: "10pt" }}>{displayValue}</span>
                    </span>
                </div>
            );
        }).filter(Boolean);

        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableItems}>
                    {filteredEntries.length > 0 ? filteredEntries : <span className={styles.noData}>No Data</span>}
                </div>
                {displayableEntries.length > itemsPerPage && (
                    <div className={styles.paginationControls}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className={styles.pageButton}
                        >
                            &lt; Prev
                        </button>

                        <span className={styles.pageIndicator}>
                            Page {currentPage + 1} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className={styles.pageButton}
                        >
                            Next &gt;
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {originAssignment && (
                <div className={styles.formContainer}>
                    <VariableClass
                        onSave={(parameterizationData) => handleOpenParameterizationTab(parameterizationData)}
                    />
                    {parameterizationData && parameterizationOpen && (
                        <ParameterizationTab
                            variableClass={parameterizationData}
                            onClose={handleCloseParameterizationTab}
                        />
                    )}
                    {globalVariableClass.length > 0 && (
                        <div className={styles.variableClassList}>
                            {globalVariableClass.map((currentVariableClassData) => {
                                const variableClassDataId = currentVariableClassData?.dataId;
                                const variableClassData = currentVariableClassData?.variableData || {};
                                console.log(`MAP: Rendering item ID=${variableClassDataId}`, currentVariableClassData?.variableData);
                                console.log("Variable Class Data ID", variableClassDataId);
                                if (sendToSheetModal && variableClassIdentifier === variableClassDataId) {
                                    console.log(`MAP: Modal condition TRUE for ID=${variableClassDataId}, preparing to call modalOptions with:`, variableClassData);
                                }
                                return (
                                <div key={variableClassDataId} className={styles.variableClassRow + `_row_${variableClassDataId}`}>
                                    <div className={styles.variableClassContent}>
                                        {displayVariableClass(currentVariableClassData || [])}
                                        <div className={styles.buttonContainer}>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setVariableClassIdentifier(variableClassDataId);
                                                    setSendToSheetModal(true);
                                                    setAddOrSend('send');
                                                }}
                                                title={`Send to Sheet`}
                                                >
                                                Send To Sheet
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                }}
                                                title={`Edit`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteVariableClass(variableClassDataId);
                                                    if (variableClassIdentifier === variableClassDataId) {
                                                        setVariableClassIdentifier(null);
                                                    }
                                                }}
                                                title={`Delete`}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {sendToSheetModal && itemForModal && (
                                        <div
                                            className={styles.modalOverlay}
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    setSendToSheetModal(false);
                                                    setVariableClassIdentifier(null);
                                                }
                                            }}
                                        >
                                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                                {modalOptions(itemForModal.dataId, itemForModal.variableData )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                            <div className={styles.actionButtons}>
                                <button
                                    className={styles.deleteAllButton}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleClearAllVariableClass();
                                        setVariableClassIdentifier(0);
                                    }}
                                >Delete All
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
            <div className={styles.tableContainer}>
                <Table
                    setVariableClassData={setVariableRowData}
                    variableRowData={variableRowData}
                    selectedClassKey={selectedClassKey}
                    variableData={variableData.tableSheet}
                    originAssignment={handleOriginAssignment}
                    submitTableData={handleSubmitTableData}
                    areRowsPopulated={setRowsPopulated}
                />
            </div>
            <ToastContainer />
        </>
    )
}

const DisplayVariableClass: React.FC<{
    object: Record<string, any>
}> =
    ({ object }) => {
        const [currentPage, setCurrentPage] = useState(0);
        const itemsPerPage = 10;

        const entries = Object.entries(object);
        const totalPages = Math.ceil(entries.length / itemsPerPage);

        const currentEntries = entries.slice(
            currentPage * itemsPerPage,
            (currentPage + 1) * itemsPerPage
        );

        const filteredEntries = currentEntries.map(([key, value], index) => {
            let displayValue: string;

            if (Array.isArray(value)) {
                displayValue = value.join(", ");
            } else if (typeof value === "object" && value !== null) {
                displayValue = JSON.stringify(value);
            } else if (key === "name" && value === "") {
                displayValue = "No Name";
            } else {
                displayValue = value.toString();
            }

            return (
                <div key={`${currentPage}-${index}`} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <span style={{ fontSize: "10pt" }}>{displayValue}</span>
                    </span>
                </div>
            );
        });

        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableItems}>
                    {filteredEntries}
                </div>
                {entries.length > itemsPerPage && (
                    <div className={styles.paginationControls}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className={styles.pageButton}
                        >
                            &lt; Prev
                        </button>
                        <span className={styles.pageIndicator}>
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className={styles.pageButton}
                        >
                            Next &gt;
                        </button>
                    </div>
                )}
            </div>
        );
    };

export default VariableManager;