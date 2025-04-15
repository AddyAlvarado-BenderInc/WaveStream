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
    
    const handleSendToSheet = (object: Record<string, any>) => {

    }

    const handleMakeVariableClassOrigin = () => {

    }
    
    const handleDeleteVariableClass = (id: number) => {
        dispatch(deleteVariableClassArray(id));
    };

    const handleClearAllVariableClass = () => {
        dispatch(clearAllVariableClassArray());
    };

    
    const handleEditVariableClass = (name: string, id: number, variableData: string[]) => {
        dispatch(updateVariableClassArray({ name, index: id, variableData }));
    }

    const displayVariableClass = (object: Record<string, any>) => {
        const filteredEntries = Object.entries(object).map(([key, value], index) => {
            let displayValue: string;

            if (Array.isArray(value)) {
                displayValue = value.join(", ");
            } else if (typeof value === "object" && value !== null) {
                displayValue = JSON.stringify(value);
            } else {
                displayValue = value.toString();
            }

            console.log("Display Value:", displayValue);

            return (
                <div key={index} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>{displayValue}</span>
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
                            ))}
                            <div className={styles.actionButtons}>
                                <button
                                    className={styles.sendToSheetButton}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSendToSheet(globalVariableClass);
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
        </>
    )
}

export default VariableManager;