import React, { useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import {
    clearAllVariableClassArray,
    deleteVariableClassArray,
    updateVariableClassArray
} from '@/app/store/productManagerSlice';
import { mainKeyString, tableSheetData } from '../../../../types/productManager';
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

interface VariableManagerProps {
    variableData: VariableDataState;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
}

const VariableManager: React.FC<VariableManagerProps> = ({ variableData, setVariableData }) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [originAssignment, setOriginAssignment] = useState("");
    const [sendToSheetModal, setSendToSheetModal] = useState(false);
    const [selectedClassKey, setSelectedClassKey] = useState<string>('');
    const [variableClassData, setVariableClassData] = useState<Record<string, any>>([]);
    const [rowsPopulated, setRowsPopulated] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    let [addOrSend, setAddOrSend] = useState<string>('send');

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);

    const dispatch = useDispatch();

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

    const handleSendToSheet = (object: Record<string, any>, selectedKey: string) => {
        if (!selectedKey) {
            toast.error('Please select a class key');
            return;
        }
    
        let variableClassData: object;
        if (object.variableData) {
            variableClassData = object.variableData;
        } else if (Array.isArray(object)) {
            variableClassData = object;
        } else {
            variableClassData = object;
        }
    
        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);
    
        if (!selectedKeyObject) {
            toast.error('Selected class key not found');
            return;
        }
        
        setVariableClassData(prevData => {
            const updatedData = { ...prevData };
            
            // Handle different data structure types
            if (Array.isArray(variableClassData)) {
                // Convert array to row-specific entries
                variableClassData.forEach((item, index) => {
                    updatedData[`${selectedKey}_row_${index}`] = {
                        value: item,
                        __rowIndex: index
                    };
                });
            } else if (typeof variableClassData === 'object' && variableClassData !== null) {
                // Check if object already has row structure (from ParameterizationTab)
                if (Object.keys(variableClassData).some(key => key.startsWith('row_'))) {
                    // Already has row structure - maintain it with proper key naming
                    Object.entries(variableClassData).forEach(([rowKey, value]) => {
                        const rowIndex = rowKey.replace('row_', '');
                        updatedData[`${selectedKey}_row_${rowIndex}`] = {
                            ...(typeof value === 'object' ? value : { value }),
                            __rowIndex: parseInt(rowIndex)
                        };
                    });
                } else {
                    // No row structure - add as row 0
                    updatedData[`${selectedKey}_row_0`] = {
                        ...(Object.keys(variableClassData).length === 1 ? 
                            { value: Object.values(variableClassData)[0] } : 
                            variableClassData),
                        __rowIndex: 0
                    };
                }
            } else {
                // Primitive value - add as row 0
                updatedData[`${selectedKey}_row_0`] = {
                    value: variableClassData,
                    __rowIndex: 0
                };
            }
            
            return updatedData;
        });
        
        toast.success(`Data sent to sheet with key: ${selectedKey}`);
    };

    const handleAddToSheet = (object: Record<string, any>, selectedKey: string) => {
        if (!selectedKey) {
            toast.error('Please select a class key');
            return;
        }
        
        let dataToAdd: object;
        if (object.variableData) {
            dataToAdd = object.variableData;
        } else if (Array.isArray(object)) {
            dataToAdd = object;
        } else {
            dataToAdd = object;
        }
        
        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);
        
        if (!selectedKeyObject) {
            toast.error('Selected class key not found');
            return;
        }
        
        setVariableClassData(prevData => {
            const updatedData = { ...prevData };
            
            // Find the next available row index for this key
            let nextRowIndex = 0;
            Object.keys(updatedData).forEach(key => {
                if (key.startsWith(`${selectedKey}_row_`)) {
                    const rowNum = parseInt(key.replace(`${selectedKey}_row_`, ''));
                    nextRowIndex = Math.max(nextRowIndex, rowNum + 1);
                }
            });
            
            // Handle different data structures when adding
            if (Array.isArray(dataToAdd)) {
                dataToAdd.forEach((item, index) => {
                    updatedData[`${selectedKey}_row_${nextRowIndex + index}`] = {
                        value: item,
                        __rowIndex: nextRowIndex + index
                    };
                });
            } else if (typeof dataToAdd === 'object' && dataToAdd !== null) {
                // Check if object already has row structure
                if (Object.keys(dataToAdd).some(key => key.startsWith('row_'))) {
                    Object.entries(dataToAdd).forEach(([rowKey, value]) => {
                        const rowIndex = parseInt(rowKey.replace('row_', ''));
                        updatedData[`${selectedKey}_row_${nextRowIndex + rowIndex}`] = {
                            ...(typeof value === 'object' ? value : { value }),
                            __rowIndex: nextRowIndex + rowIndex
                        };
                    });
                } else {
                    // No row structure - add as next available row
                    updatedData[`${selectedKey}_row_${nextRowIndex}`] = {
                        ...(Object.keys(dataToAdd).length === 1 ? 
                            { value: Object.values(dataToAdd)[0] } : 
                            dataToAdd),
                        __rowIndex: nextRowIndex
                    };
                }
            } else {
                // Primitive value - add as next available row
                updatedData[`${selectedKey}_row_${nextRowIndex}`] = {
                    value: dataToAdd,
                    __rowIndex: nextRowIndex
                };
            }
            
            return updatedData;
        });
        
        toast.success(`Data added to existing sheet with key: ${selectedKey}`);
    };

    const modalOptions = (key: number, object: Record<string, any>, newVariableData: object, addOrSend: string) => {
        let name = "";

        if (Array.isArray(object)) {
            const firstValue = object[0];
            if (firstValue && typeof firstValue === 'string') {
                const match = firstValue.match(/^([^\s]+)/);
                name = match ? match[1] : "";
            }
        } else if (object && typeof object === 'object') {
            if (object.name) {
                name = object.name;
            } else {
                const values = Object.values(object);
                for (const value of values) {
                    if (typeof value === 'string' && value.trim() !== '') {
                        const match = value.match(/^([^\s]+)/);
                        if (match) {
                            name = match[1];
                            break;
                        }
                    }
                }
            }
        };

        const filteredObject = Object.entries(object)
            .map((value) => {
                return value[1];
            });

        const dataInstanceId = `data_instance_${key}_${Date.now()}`;

        const prepareDataForOperation = () => {
            let preparedData: Record <string, any>;

            if (newVariableData && typeof newVariableData === 'object') {
                if ('variableData' in newVariableData) {
                    const variableData = (newVariableData as any).variableData;

                    if (Array.isArray(variableData)) {
                        preparedData = {};
                        variableData.forEach((item, index) => {
                            preparedData[`${dataInstanceId}_row_${index}`] = {
                                value: item,
                                __rowIndex: index,
                                _dataInstanceId: `${dataInstanceId}_row_${index}`
                            };
                        });
                        return preparedData;
                    } else {
                        return {
                            ...variableData,
                            _dataInstanceId: dataInstanceId
                        };
                    }
                } else {
                    const processed = { ...newVariableData,  dataInstanceId: dataInstanceId };
                    return processed;
                }
            }

            return {
                value: newVariableData,
                _dataInstanceId: dataInstanceId
            };
        };

        return (
            <div className={styles.modal}>
                <div className={styles.modalContent}>
                    <h2>Declare The Class Key for {name}</h2>
                    <div className={styles.modalPayload}>
                        <div className={styles.payloadContainer}>
                            <h5>Payload</h5>
                            <DisplayVariableClass
                                object={filteredObject}
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
                            {addOrSend === 'add' ? (
                                <button
                                    type='button'
                                    className={styles.submitButton}
                                    disabled={!selectedClassKey}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        // Use prepared data with unique instance ID
                                        const preparedData = prepareDataForOperation();
                                        handleAddToSheet(preparedData, selectedClassKey);
                                        setSendToSheetModal(false);
                                    }}
                                >
                                    Add
                                </button>
                            ) : (
                                <>
                                    <button
                                        type='button'
                                        className={styles.submitButton}
                                        disabled={!selectedClassKey}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // Use prepared data with unique instance ID
                                            const preparedData = prepareDataForOperation();
                                            handleSendToSheet(preparedData, selectedClassKey);
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
                                            // Use prepared data with unique instance ID
                                            const preparedData = prepareDataForOperation();
                                            handleSendToSheet(preparedData, selectedClassKey);
                                            handleDeleteVariableClass(key);
                                            console.log("Deleted variable class with key:", key);
                                            setSendToSheetModal(false);
                                        }}
                                    >
                                        Send & Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const handleDeleteVariableClass = (id: number) => {
        dispatch(deleteVariableClassArray(id));
    };

    const handleClearAllVariableClass = () => {
        dispatch(clearAllVariableClassArray());
    };


    const handleEditVariableClass = (id: number) => {
        // Need to reinitialize parameterization details
    }

    const displayVariableClass = (object: Record<string, any>) => {
        const itemsPerPage = 5;

        const entries = Object.entries(object);
        const totalPages = Math.ceil(entries.length / itemsPerPage);

        const currentEntries = entries.slice(
            currentPage * itemsPerPage,
            (currentPage + 1) * itemsPerPage
        );

        const filteredEntries = Object.entries(object).map(([key, value], index) => {
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

            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

            return (
                <div key={`${currentPage}-${index}`} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>{capitalizedKey}</b>
                        <br />
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
                    {Object.keys(globalVariableClass).length > 0 && (
                        <div className={styles.variableClassList}>
                            {Object.entries(globalVariableClass).map(([variableClassKey, variableClassValue], index) => (
                                <div key={variableClassKey} className={styles.variableClassRow}>
                                    <div className={styles.variableClassContent}>
                                        {displayVariableClass(variableClassValue)}
                                        <div className={styles.buttonContainer}>
                                            {rowsPopulated && (
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSendToSheetModal(true);
                                                        setAddOrSend('add');
                                                    }}
                                                    title={`Delete ${variableClassKey}`}
                                                >
                                                    Add To Sheet
                                                </button>
                                            )}
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSendToSheetModal(true);
                                                    setAddOrSend('send');
                                                }}
                                                title={`Delete ${variableClassKey}`}
                                            >
                                                Send To Sheet
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleEditVariableClass(index);
                                                }}
                                                title={`Delete ${variableClassKey}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteVariableClass(index);
                                                }}
                                                title={`Delete ${variableClassKey}`}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {sendToSheetModal && (
                                        <div
                                            className={styles.modalOverlay}
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    setSendToSheetModal(false);
                                                }
                                            }}
                                        >
                                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                                {modalOptions(index, variableClassValue.variableData, variableClassValue.variableData, addOrSend)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className={styles.actionButtons}>
                                <button
                                    className={styles.deleteAllButton}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleClearAllVariableClass();
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
                    setVariableClassData={setVariableClassData}
                    variableRowData={variableClassData}
                    selectedClassKey={selectedClassKey}
                    variableData={variableData.tableSheet}
                    originAssignment={handleOriginAssignment}
                    submitVariableData={handleSubmitTableData}
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