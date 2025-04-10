import React, { useState } from 'react';
import { ProductManager } from '../../../../types/productManager';
import VariableClass from '../VariableManager/VariableClass/component';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import Table from '../Table/component';
import styles from './component.module.css';

interface VariableDataState {
    tableSheet: string[];
    variableClass: string[];
}

interface VariableManagerProps {
    variableData: any;
    productManager: ProductManager;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
}

//TODO: Top-down situation with data, will need to pass variableData and productManager to child components
const VariableManager: React.FC<VariableManagerProps> = ({variableData, productManager, setVariableData}) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [variableClassSheet, setVariableClassSheet] = useState<string[]>([]);
    const [originAssignment, setOriginAssignment] = useState("");

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

    const handleVariableClassData = (object: object) => {
        return object;
    }

    const displayVariableClass = (object: object[]) => {

    }

    return (
        <>
            {originAssignment && (
                <div className={styles.formContainer}>
                    <VariableClass
                        onSave={(parameterizationData) => handleOpenParameterizationTab(parameterizationData)}
                    />
                    {parameterizationData && parameterizationOpen && (
                        <ParameterizationTab
                            variableClassData={handleVariableClassData}
                            variableClass={parameterizationData}
                            onClose={handleCloseParameterizationTab}
                        />
                    )}
                <div className={styles.variableClassContainer}>
                </div>
                </div>
            )}
                <div className={styles.tableContainer}>
                    <Table
                        variableClassSheet={variableClassSheet}
                        originAssignment={handleOriginAssignment}
                    />
                </div>
        </>
    )
}

export default VariableManager;