import React, { useState, useEffect } from 'react';
import styles from './component.module.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import BrickManagerSheet from '../BrickManagerSheet/component';

interface BrickEditorProps {
    brickId: string | boolean | number;
    field: string;
    targetValue: string | number | File | null;
    intentValue: string | number | File | null;
    specifiedIntentRange: number;
    intentSelectionValue: string;
    actionSelectionValue: string;
    formData: Record<string, any>;
    onClose: () => void;
}

const BrickEditor: React.FC<BrickEditorProps> = ({
    field,
    targetValue,
    specifiedIntentRange,
    intentSelectionValue,
    actionSelectionValue,
    intentValue,
    brickId,
    formData,
    onClose
}) => {
    const [inputTargetValue, setInputTargetValue] = useState<string | number | null>(
        targetValue ?? formData[field] ?? 'ANY_VALUE',
    );
    const [inputIntentValue, setInputIntentValue] = useState(intentValue);
    const [inputSpecifiedIntentRange, setInputSpecifiedIntentRange] = useState(specifiedIntentRange);
    const [inputIntentSelectionValue, setInputIntentSelectionValue] = useState(intentSelectionValue);
    const [inputActionSelectionValue, setInputActionSelectionValue] = useState(actionSelectionValue);
    const [sheetData, setSheetData] = useState({
        targets: [] as string[],
        intents: [] as string[],
    });
    const [onlyIfValue, setOnlyIfValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const renderValue = (value: string | number | File | null): React.ReactNode => {
        if (value instanceof File) {
            return value.name;
        }
        return value !== null && value !== undefined ? value.toString() : "default";
    };

    const currentValue =
        inputTargetValue === null || inputTargetValue === ''
            ? formData[field] || 'ANY_VALUE'
            : inputTargetValue;

            useEffect(() => {
                const fetchBrickData = async () => {
                    setIsLoading(true);
                    try {
                        console.log('Fetching data for brickId:', brickId);
        
                        const sanitizedBrickId = encodeURIComponent(
                            typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
                        );

                        const productType = window.location.pathname.split('/')[1];
        
                        const response = await fetch(`/api/productManager/${productType}/brickEditor/${sanitizedBrickId}`);
                        const data = await response.json();
        
                        if (response.ok) {
                            console.log('Fetched data from API:', data);
        
                            setInputTargetValue(
                                data.targetValue !== null && data.targetValue !== ''
                                    ? data.targetValue
                                    : formData[field] || ''
                            );
                            setInputIntentValue(data.intentValue || '');
                            setInputSpecifiedIntentRange(data.specifiedIntentRange || 0);
                            setInputIntentSelectionValue(data.intentSelectionValue || 'default');
                            setSheetData(data.sheetData || { targets: [], intents: [] });
                        } else {
                            console.warn(`Failed to fetch brick data: ${response.statusText}`);
                            resetState();
                        }
                    } catch (error) {
                        console.error('Error fetching brick data:', error);
                        resetState();
                    } finally {
                        setIsLoading(false);
                    }
                };
        
                const resetState = () => {
                    setInputTargetValue('');
                    setInputIntentValue('');
                    setInputSpecifiedIntentRange(0);
                    setInputIntentSelectionValue('default');
                    setSheetData({ targets: [], intents: [] });
                };
        
                if (brickId && field) fetchBrickData();
            }, [brickId, field, formData]);

    const handleSave = async () => {
        const payload = {
            targetValue: inputTargetValue === '' || inputTargetValue === null 
            ? inputTargetValue
            : formData[field] || 'any',
            intentValue: inputIntentValue,
            specifiedIntentRange: inputSpecifiedIntentRange,
            intentSelectionValue: inputIntentSelectionValue,
            actionSelectionValue: inputActionSelectionValue,
            onlyIfValue: inputActionSelectionValue === 'except' ? onlyIfValue : undefined,
            sheetData: sheetData,
        };

        try {
            const sanitizedBrickId = encodeURIComponent(brickId);
            const productType = window.location.pathname.split('/')[1];
            const response = await fetch(`/api/productManager/${productType}/brickEditor/${sanitizedBrickId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log("Field data saved successfully");
                toast.success('Brick saved successfully!');
            } else {
                console.error("Failed to save field data");
                toast.error('Error saving brick data. Please try again.');
            }
        } catch (error) {
            console.error("Error saving field data:", error);
            toast.error('Failed to save the product. Please try again.');
        }
    };

    const renderActionInterface = () => {
        switch (inputActionSelectionValue) {
            case 'change-to':
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue=''
                        actions='change-to'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={inputIntentValue}
                    />
                );
            case 'make-all':
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue=''
                        actions='make-all'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={inputIntentValue}
                    />
                );
            case 'except':
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue={onlyIfValue}
                        actions='except'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={inputIntentValue}
                    />
                );
            case 'and':
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue=''
                        actions='and'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={inputIntentValue}
                    />
                );
            case 'none':
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue=''
                        actions='none'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={null}
                    />
                );
            default:
                return (
                    <BrickManagerSheet
                        sheetData={sheetData}
                        onSheetDataChange={setSheetData}
                        onlyIfValue=''
                        actions='change-to'
                        brickId={brickId}
                        field={field}
                        targetValue={currentValue}
                        intentValue={inputIntentValue}
                    />
                );
        }
    };

    const renderOnlyIfSection = () => {
        if (inputActionSelectionValue === 'except') {
            return (
                <div className={styles.onlyIfSection}>
                    <p>Initial Parameter:</p>
                    <input
                        type="text"
                        value={onlyIfValue}
                        onChange={(e) => setOnlyIfValue(e.target.value)}
                        className={styles.input}
                    />
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    const renderIntentSection = (inputIntentValue: string | File | number | null) => {
        if (inputActionSelectionValue !== 'none' && inputIntentValue !== null) {
            return (
                <>
                    <p>Intent Value: {renderValue(inputIntentValue)}</p>
                    <input
                        type="text"
                        value={inputIntentValue instanceof File ? inputIntentValue.name : inputIntentValue ?? ''}
                        onChange={(e) => setInputIntentValue(e.target.value)}
                        className={styles.input}
                    />
                </>
            );
        }
        return null;
    };

    return (
        <div className={styles.brickEditor}>
            <div className={styles.header}>
                <h1>Brick Info Editor: {field}</h1>
                <h5>{brickId}</h5>
            </div>
            <p>Current value: {renderValue(currentValue)}</p>
            <div className={styles.container}>
                <div className={styles.form}>
                    <p>Target Value: {renderValue(inputTargetValue)}</p>
                    <input
                        type="text"
                        value={inputTargetValue ?? 'ANY VALUE'}
                        onChange={(e) => setInputTargetValue(e.target.value)}
                        className={styles.input}
                    />
                    <p>Selected Target: {inputIntentSelectionValue}</p>
                    <select
                        value={inputIntentSelectionValue}
                        onChange={(e) => setInputIntentSelectionValue(e.target.value)}
                    >
                        <option value="chronological">Chronological</option>
                        <option value="by-number">By Number</option>
                        <option value="by-alphabet-a-z">By Alphabet [A-Z]</option>
                        <option value="by-alphabet-z-a">By Alphabet [Z-A]</option>
                    </select>
                    <p>Selected Action: {inputActionSelectionValue}</p>
                    <select
                        value={inputActionSelectionValue}
                        onChange={(e) => setInputActionSelectionValue(e.target.value)}
                    >
                        <option value="change-to">Change To</option>
                        <option value="make-all">Make All</option>
                        <option value="except">Except</option>
                        <option value="and">And</option>
                        <option value="none">None / Act-As-Selector</option>
                    </select>
                    {renderOnlyIfSection()}
                    {renderIntentSection(inputIntentValue)}
                    <hr className={styles.divider}></hr>
                    <div className={styles.actions}>
                        <button className={styles.button} onClick={handleSave}>
                            Save
                        </button>
                        <button className={styles.button} onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
                <div className={styles.sheetContainer}>
                    {renderActionInterface()}
                </div>
            </div>
            <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false} />
        </div>
    );
};

export default BrickEditor;