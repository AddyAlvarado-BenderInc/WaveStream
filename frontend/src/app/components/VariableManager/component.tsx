import React, { useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import Table from '../Table/component';
import styles from './component.module.css';

const VariableManager = () => {
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

    return (
        <>
            {originAssignment ? (
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
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <Table
                        variableClassSheet={variableClassSheet}
                        originAssignment={handleOriginAssignment}
                    />
                </div>
            )}
        </>
    )
}

export default VariableManager;