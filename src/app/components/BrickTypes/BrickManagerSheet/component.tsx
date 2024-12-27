import React, { useState, useEffect } from 'react';
import styles from './component.module.css';
import { Id, ToastContainer, toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import 'react-toastify/dist/ReactToastify.css';

interface BrickManagerSheetProps {
    brickId: string | boolean | number;
    field: string;
    targetValue: string | number | File | null;
    intentValue: string | number | File | null;
}

const BrickManagerSheet: React.FC<BrickManagerSheetProps> = ({
    brickId,
    field,
    targetValue,
    intentValue
}) => {
    const [inputTargets, setInputTargets] = useState<string[]>([]);
    const [inputIntents, setInputIntents] = useState<string[]>([]);
    const [jiggleError, setJiggleError] = useState(false);

    const renderValue = (value: string | number | File | null): React.ReactNode => {
        if (value instanceof File) {
            return value.name;
        }
        return value !== null && value !== undefined ? value.toString() : "default";
    };

    useEffect(() => {
        const fetchSheetData = async () => {
            try {
                const sanitizedBrickId = encodeURIComponent(
                    typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
                );

                const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Fetched sheet data:', data);

                    setInputTargets(data.targets || []);
                    setInputIntents(data.intents || []);
                } else {
                    console.warn(`Failed to fetch sheet data: ${response.statusText}`);
                }
            } catch (error) {
                console.error('Error fetching sheet data:', error);
            }
        };

        if (brickId) fetchSheetData();
    }, [brickId]);

    const handleAddTargetInput = () => {
        setInputTargets((prev) => [...prev, ""]);
    };

    const handleAddIntentInput = () => {
        if (inputIntents.length >= inputTargets.length) {
            setJiggleError(true);
            setTimeout(() => setJiggleError(false), 300 );
            toast.error("The number of intents cannot exceed the number of targets.");
            return;
        }
        setInputIntents((prev) => [...prev, ""]);
    };    

    const handleTargetChange = (index: number, value: string) => {
        const updatedTargets = [...inputTargets];
        updatedTargets[index] = value;
        setInputTargets(updatedTargets);
    };

    const handleIntentChange = (index: number, value: string) => {
        const updatedIntents = [...inputIntents];
        updatedIntents[index] = value;
        setInputIntents(updatedIntents);
    };

    const handleDeleteTarget = (index: number) => {
        const updatedTargets = [...inputTargets];
        updatedTargets.splice(index, 1);
        setInputTargets(updatedTargets);
    };

    const handleDeleteIntent = (index: number) => {
        const updatedIntents = [...inputIntents];
        updatedIntents.splice(index, 1);
        setInputIntents(updatedIntents);
    };

    const handleTargetFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleIntentFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSave = async () => {
        try {
            const sanitizedBrickId = encodeURIComponent(
                typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
            );

            const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputTargets, inputIntents }),
            });

            if (response.ok) {
                console.log('Saved sheet data successfully');
                toast.success('Sheet saved successfully!', {
                    position: 'bottom-right',
                    autoClose: 5000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: false,
                });
            } else {
                console.error('Error saving sheet data:', response.statusText);
                toast.error('Failed to save sheet data. Please try again.');
            }
        } catch (error) {
            console.error('Error saving sheet data:', error);
            toast.error('Failed to save sheet data. Please try again.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Brick Manager Sheets {field}</h2>
            </div>
            <hr className={styles.divider} />
            <div className={styles.chart}>
                <div className={styles.sheets}>
                    <div className={styles.sheetsHeader}>
                        <h3>Target(s)</h3>
                        <hr className={styles.section}></hr>
                        <h4>Initial Value:
                            <span>
                                {renderValue(targetValue) || (
                                    <text className={styles.noAssignment}>
                                        No Value Assigned
                                    </text>
                                )}
                            </span>
                        </h4>
                        <div className={styles.variableActions}>
                            <button name='target-button' className={styles.button}
                                onClick={handleAddTargetInput}
                            >
                                Add Target
                            </button>
                            <label htmlFor="target-excel-upload" className={styles.button}>
                                Add Target Sheet
                                <input
                                    id="target-excel-upload"
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleTargetFileUpload}
                                />
                            </label>
                        </div>
                    </div>
                    {inputTargets.map((target, index) => (
                        <div key={`target-${index}`} className={styles.inputContainer}>
                            <input
                                type="text"
                                value={target}
                                onChange={(e) => handleIntentChange(index, e.target.value)}
                                className={styles.singleInput}
                            />
                            {inputTargets.length > 0 && (
                                <button
                                    className={styles.button}
                                    onClick={() => handleDeleteTarget(index)}
                                >
                                    ✖
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className={styles.sheets}>
                    <div className={styles.sheetsHeader}>
                        <h3>Intent(s)</h3>
                        <hr className={styles.section}></hr>
                        <h4>Initial Value:
                            <span>
                                {renderValue(intentValue) || (
                                    <text className={styles.noAssignment}>
                                        No Value Assigned
                                    </text>
                                )}
                            </span>
                        </h4>
                        <div className={styles.variableActions}>
                            <button name='intent-button' className={styles.button}
                                onClick={handleAddIntentInput}
                            >
                                Add Intent
                            </button>
                            <label htmlFor="intent-excel-upload" className={styles.button}>
                                Add Intent Sheet
                                <input
                                    id="intent-excel-upload"
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleIntentFileUpload}
                                />
                            </label>
                        </div>
                    </div>
                    {inputIntents.map((intent, index) => (
                        <div key={`intent-${index}`} className={styles.inputContainer}>
                            <input
                                type="text"
                                value={intent}
                                onChange={(e) => handleIntentChange(index, e.target.value)}
                                className={`${styles.singleInput} ${jiggleError ? 'jiggle' : ''}`}
                            />
                            {inputIntents.length > 0 && (
                                <button
                                    className={styles.button}
                                    onClick={() => handleDeleteIntent(index)}
                                >
                                    ✖
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                newestOnTop={true}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
            />
        </div>
    );
};

export default BrickManagerSheet;
