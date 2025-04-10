import React, { useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import { RootState } from '@/app/store/store';
import { useSelector } from 'react-redux';
import Table from '../Table/component';
import styles from './component.module.css';

interface VariableDataState {
    tableSheet: object;
    variableClass: string[];
    mainKeyString: [string, any][];
}

interface VariableManagerProps {
    variableData: any;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
}

//TODO: Top-down situation with data, will need to pass variableData and productManager to child components
const VariableManager: React.FC<VariableManagerProps> = ({variableData, setVariableData}) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [variableClassSheet, setVariableClassSheet] = useState<string[]>([]);
    const [originAssignment, setOriginAssignment] = useState("");

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);

    const handleOpenParameterizationTab = (variableClasses: object) => {
        console.log('Open Parameterization Tab', variableClasses);
        setParameterizationData(variableClasses);
        setParameterizationOpen(true);
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
      

    const handleVariableClassData = (object: object) => {
        Object.entries(object).map(([key, value]) => {
            
        })
    };

    const displayVariableClass = (object: Record<string, any>) => {
        const filteredEntries = Object.entries(object).map(([key, value], index) => {
            if (value === null) {
                return !key;
            }
            return (
          <div key={index} className={styles.variableClassItem}>
            <span className={styles.variableKey}>{key}:</span>{" "}
            <span className={styles.variableValue}>{value.toString()}</span>
          </div>
        )});
      
        return (
          <div className={styles.variableClassContainer}>
            {filteredEntries}
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
                            variableClassData={handleVariableClassData}
                            variableClass={parameterizationData}
                            onClose={handleCloseParameterizationTab}
                        />
                    )}
                    {globalVariableClass && (
                        <>
                        {displayVariableClass(globalVariableClass)}
                        </>
                    )}
                </div>
            )}
                <div className={styles.tableContainer}>
                    <Table
                        variableData={variableData}
                        variableClassSheet={variableClassSheet}
                        originAssignment={handleOriginAssignment}
                    />
                </div>
        </>
    )
}

export default VariableManager;