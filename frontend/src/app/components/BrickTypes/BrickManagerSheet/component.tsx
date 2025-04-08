import React, { useState, useEffect, useRef } from 'react';
import styles from './component.module.css';
import TargetSection from './BrickComponents/TargetSection';
import IntentSection from './BrickComponents/IntentSection';
import OnlyIfSection from './BrickComponents/ExceptSection';
import { ToastContainer, toast } from 'react-toastify';
import isEqual from 'lodash.isequal';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

interface BrickManagerSheetProps {
    brickId: string | boolean | number;
    field: string;
    targetValue: string | number | File | null;
    intentValue: string | number | File | null;
    onlyIfValue: string;
    actions: string;
    sheetData: { targets: string[]; intents: string[] };
    onSheetDataChange: (data: { targets: string[]; intents: string[] }) => void;
}

const BrickManagerSheet: React.FC<BrickManagerSheetProps> = ({
    field,
    targetValue,
    intentValue,
    onlyIfValue,
    actions,
    sheetData,
    onSheetDataChange,
}) => {
    const [inputTargets, setInputTargets] = useState<string[]>([]);
    const [inputIntents, setInputIntents] = useState<string[]>([]);
    
    const isUserUpdating = useRef(false); 

    useEffect(() => {
        if (!isUserUpdating.current) {
            if (!isEqual(sheetData.targets, inputTargets)) {
                setInputTargets(sheetData.targets || []);
            }
            if (!isEqual(sheetData.intents, inputIntents)) {
                setInputIntents(sheetData.intents || []);
            }
        }
        isUserUpdating.current = false;
    }, [sheetData]);

    const updateParentData = () => {
        onSheetDataChange({ targets: inputTargets, intents: inputIntents });
    };

    const handleAddTargetInput = () => {
        isUserUpdating.current = true;
        setInputTargets((prev) => [...prev, '']);
    };

    const handleAddIntentInput = () => {
        if (inputIntents.length >= inputTargets.length) {
            toast.error('The number of intents cannot exceed the number of targets.');
            return;
        }
        isUserUpdating.current = true;
        setInputIntents((prev) => [...prev, '']);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const parsedData = XLSX.utils.sheet_to_json(sheet);

            console.log("Parsed Excel Data:", parsedData);

        } catch (error) {
            console.error("Error processing Excel file:", error);
            toast.error("Failed to process the Excel file.");
        }
    };

    const handleAddParameter = () => {
        console.log("Parameter button clicked");
        toast.success("Parameter")
    }

    const handleDeleteTarget = (index: number) => {
        isUserUpdating.current = true;
        const updatedTargets = [...inputTargets];
        updatedTargets.splice(index, 1);
        setInputTargets(updatedTargets);
    };

    const handleDeleteIntent = (index: number) => {
        isUserUpdating.current = true;
        const updatedIntents = [...inputIntents];
        updatedIntents.splice(index, 1);
        setInputIntents(updatedIntents);
    };

    const renderActionInterface = () => {
        switch (actions) {
            case 'change-to':
                return (
                    <>
                        <TargetSection
                            targetValue={targetValue}
                            targets={inputTargets}
                            onAddTarget={handleAddTargetInput}
                            onDeleteTarget={handleDeleteTarget}
                            onChangeTarget={(index, value) =>
                                setInputTargets((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            handleFileUpload={handleFileUpload}
                        />
                        <IntentSection
                            intentValue={intentValue}
                            intents={inputIntents}
                            onAddIntent={handleAddIntentInput}
                            onDeleteIntent={handleDeleteIntent}
                            onChangeIntent={(index, value) =>
                                setInputIntents((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            showAddIntent={true}
                        />
                    </>
                );
            case 'make-all':
                return (
                    <>
                        <TargetSection
                            targetValue={targetValue}
                            targets={inputTargets}
                            onAddTarget={handleAddTargetInput}
                            onDeleteTarget={handleDeleteTarget}
                            onChangeTarget={(index, value) =>
                                setInputTargets((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            handleFileUpload={handleFileUpload}
                        />
                        <IntentSection
                            intentValue={intentValue}
                            intents={inputIntents}
                            onDeleteIntent={handleDeleteIntent}
                            onChangeIntent={(index, value) =>
                                setInputIntents((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            showAddIntent={false}
                        />
                    </>
                );
            case 'except':
                return (
                    <>
                        <TargetSection
                            targetValue={targetValue}
                            targets={inputTargets}
                            onAddTarget={handleAddTargetInput}
                            onDeleteTarget={handleDeleteTarget}
                            onChangeTarget={(index, value) =>
                                setInputTargets((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            handleFileUpload={handleFileUpload}
                        />
                        <IntentSection
                            intentValue={intentValue}
                            intents={inputIntents}
                            onAddIntent={handleAddIntentInput}
                            onDeleteIntent={handleDeleteIntent}
                            onChangeIntent={(index, value) =>
                                setInputIntents((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            showAddIntent={true}
                        />
                        <OnlyIfSection value={onlyIfValue} onAddParameter={handleAddParameter}/>
                    </>
                );
            case 'none':
                return (
                    <>
                        <TargetSection
                            targetValue={targetValue}
                            targets={inputTargets}
                            onAddTarget={handleAddTargetInput}
                            onDeleteTarget={handleDeleteTarget}
                            onChangeTarget={(index, value) =>
                                setInputTargets((prev) => prev.map((v, i) => (i === index ? value : v)))
                            }
                            handleFileUpload={handleFileUpload}
                        />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>
                    Brick Manager Sheets_{field}_{actions}
                </h2>
            </div>
            <hr className={styles.divider} />
            <div className={styles.chart}>{renderActionInterface()}</div>
            <hr className={styles.divider} />
            <button name="update-data" className={styles.button} onClick={updateParentData}>
                Update
            </button>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                newestOnTop
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
            />
        </div>
    );
};

export default BrickManagerSheet;
