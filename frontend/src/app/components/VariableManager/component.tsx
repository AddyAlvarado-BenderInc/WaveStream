import React, { useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import {
    clearAllVariableClassArray,
    deleteVariableClassArray,
    updateVariableClassArray
} from '@/app/store/productManagerSlice';
import { tableSheetData } from '../../../../types/productManager';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import { RootState } from '@/app/store/store';
import { useSelector, useDispatch } from 'react-redux';
import Table from '../Table/component';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface VariableDataState {
    tableSheet: tableSheetData[];
    variableClass: string[];
    mainKeyString: [string, any][];
}

interface VariableManagerProps {
    productManager: any;
    variableData: VariableDataState;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
}

const VariableManager: React.FC<VariableManagerProps> = ({ productManager, variableData, setVariableData }) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [originAssignment, setOriginAssignment] = useState("");
    const [sendToSheetModal, setSendToSheetModal] = useState(false);
    const [selectedClassKey, setSelectedClassKey] = useState<string>('');
    const [variableClassData, setVariableClassData] = useState<Record<string, any>>([]);
    const [currentPage, setCurrentPage] = useState(0);

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

    const handleSaveMainKeyString = (data: Partial<VariableDataState>) => {
        setVariableData((prevState) => ({
            ...prevState,
            mainKeyString: data.mainKeyString ?? prevState.mainKeyString,
        }));
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

        console.log(`Sending data to sheet with key: ${selectedKey}`, variableClassData);


        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);

        if (!selectedKeyObject) {
            toast.error('Selected class key not found');
            return;
        }

        setVariableClassData(prevData => {
            const updatedData = { ...prevData };
            updatedData[selectedKey] = variableClassData;

            console.log("Updated variable class data:", updatedData);
            return updatedData;
        })

        console.log("Variable class data sent to sheet:", variableClassData);
        toast.success(`Data sent to sheet with key: ${selectedKey}`);
    };

    const modalOptions = (key: number, object: Record<string, any>, newVariableData: object) => {
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
                            <button
                                type='button'
                                className={styles.submitButton}
                                disabled={!selectedClassKey}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSendToSheet(newVariableData, selectedClassKey);
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
                                    handleSendToSheet(newVariableData, selectedClassKey);
                                    handleDeleteVariableClass(key);
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
        )
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
                        variableData={variableData}
                        onSave={(parameterizationData) => handleOpenParameterizationTab(parameterizationData)}
                    />
                    {parameterizationData && parameterizationOpen && (
                        <ParameterizationTab
                            saveMainKeyString={handleSaveMainKeyString}
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
                                            <button
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSendToSheetModal(true);
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
                                                {modalOptions(index, variableClassValue.variableData, variableClassValue.variableData)}
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
                    variableRowData={variableClassData}
                    selectedClassKey={selectedClassKey}
                    variableData={variableData.tableSheet}
                    originAssignment={handleOriginAssignment}
                    submitVariableData={handleSubmitTableData}
                />
            </div>
            <ToastContainer />
        </>
    )
}

const DisplayVariableClass: React.FC<{ 
    object: Record<string, any> }> = 
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