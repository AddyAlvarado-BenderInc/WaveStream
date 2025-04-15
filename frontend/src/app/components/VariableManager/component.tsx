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

    // TODO: Change this to a global state
    const [selectedClassKey, setSelectedClassKey] = useState<string>('');

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

        console.log(`Sending data to sheet with key: ${selectedKey}`);

        // Find the selected key in tableSheet
        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);

        if (!selectedKeyObject) {
            toast.error('Selected class key not found');
            return;
        }

        // Here you would implement the actual logic to send the variable class data 
        // to the sheet using the selected class key

        // Example: Update variableData with the new association
        const updatedData = {
            ...variableData,
            // Add your logic here to associate the global variable class with the selected key
        };

        setVariableData(updatedData);
        toast.success(`Data sent to sheet with key: ${selectedKey}`);
    };

    const modalOptions = () => {
        return {
            content: (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Declare The Class Key</h2>
                        <button
                            className={styles.closeButton}
                            onClick={() => setSendToSheetModal(false)}
                        >
                            &times;
                        </button>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendToSheet(variableData, selectedClassKey);
                                setSendToSheetModal(false);
                            }}
                        >
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
                            <button
                                type='submit'
                                className={styles.submitButton}
                                disabled={!selectedClassKey}
                            >
                                Send to Sheet
                            </button>
                        </form>
                    </div>
                </div>
            )
        };
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
        const filteredEntries = Object.entries(object).map(([key, value], index) => {
            let displayValue: string;
            let keyValue: string;

            if (Array.isArray(value)) {
                displayValue = value.join(", ");
            } else if (typeof value === "object" && value !== null) {
                displayValue = JSON.stringify(value);
            } else if (key === "name" && value === "") {
                displayValue = "No Name";
            } else {
                displayValue = value.toString();
            }

            console.log("Display Value:", displayValue);

            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

            return (
                <div key={index} className={styles.variableClassItem}>
                    <span className={styles.variableValue}><b>{capitalizedKey}</b><br /> {displayValue}</span>
                </div>
            );
        });

        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableItems}>
                    {filteredEntries}
                </div>
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
                                </div>
                            ))}
                            <div className={styles.actionButtons}>
                                <button
                                    className={styles.sendToSheetButton}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSendToSheetModal(true);
                                    }}
                                >Send To Sheet
                                </button>
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
                    productManagerID={productManager}
                    variableData={variableData.tableSheet}
                    originAssignment={handleOriginAssignment}
                    submitVariableData={handleSubmitTableData}
                />
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
                        {modalOptions().content}
                    </div>
                </div>
            )}
            <ToastContainer />
        </>
    )
}

export default VariableManager;