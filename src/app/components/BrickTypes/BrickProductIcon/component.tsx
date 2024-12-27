import React, { useState, useEffect } from 'react';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        targetValue ?? formData[field] ?? ''
    );
    const [inputIntentValue, setInputIntentValue] = useState(intentValue);
    const [inputSpecifiedIntentRange, setInputSpecifiedIntentRange] = useState(specifiedIntentRange);
    const [inputIntentSelectionValue, setInputIntentSelectionValue] = useState(intentSelectionValue);
    const [inputActionSelectionValue, setInputActionSelectionValue] = useState(actionSelectionValue);

    const renderValue = (value: string | number | File | null): React.ReactNode => {
        if (value instanceof File) {
            return value.name;
        }
        return value !== null && value !== undefined ? value.toString() : "default";
    };

    const currentValue =
        inputTargetValue === null || inputTargetValue === ''
            ? formData[field] || ''
            : inputTargetValue;

    useEffect(() => {
        const fetchBrickData = async () => {
            try {
                console.log('Fetching data for brickId:', brickId);

                const sanitizedBrickId = encodeURIComponent(
                    typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
                );

                const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`);
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
                } else {
                    console.warn(`Failed to fetch brick data: ${response.statusText}`);
                    setInputTargetValue(formData[field] || inputTargetValue || '');
                }
            } catch (error) {
                console.error('Error fetching brick data:', error);
                setInputTargetValue(formData[field] || inputTargetValue || '');
                setInputIntentValue('');
                setInputSpecifiedIntentRange(0);
                setInputIntentSelectionValue('default');
            }
        };

        if (brickId && field) fetchBrickData();
    }, [brickId, field, formData]);

    const handleSave = async () => {
        const payload = {
            targetValue: inputTargetValue === '' || inputTargetValue === null ? formData[field] : inputTargetValue,
            intentValue: inputIntentValue,
            specifiedIntentRange: inputSpecifiedIntentRange,
            intentSelectionValue: inputIntentSelectionValue,
        };

        try {
            const sanitizedBrickId = encodeURIComponent(brickId);
            const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`, {
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


    return (
        <div className={styles.brickEditor}>
            <div className={styles.header}>
                <h1>Brick Product Icon</h1>
                <h5>{brickId}</h5>
            </div>
            <p>Current value: {renderValue(currentValue)}</p>
            <div className={styles.container}>
                <div className={styles.form}>
                    <p>Target Value: {renderValue(inputTargetValue)}</p>
                    <input
                        type="text"
                        value={inputTargetValue ?? ''}
                        onChange={(e) => setInputTargetValue(e.target.value)}
                        className={styles.input}
                    />
                    <p>Selected Target: {inputIntentSelectionValue}</p>
                    <select
                        value={inputIntentSelectionValue}
                        onChange={(e) => setInputIntentSelectionValue(e.target.value)}
                    >
                        <option value="default">Select Target Option</option>
                        <option value="chronological">Chronological</option>
                        <option value="by-number">By Number</option>
                        <option value="by-alphabet-a-z">By Alphabet [A-Z]</option>
                        <option value="by-alphabet-z-a">By Alphabet [Z-A]</option>
                        <option value="is-repeating">Is Repeating</option>
                    </select>
                    <p>Selected Action: {inputActionSelectionValue}</p>
                    <select
                        value={inputActionSelectionValue}
                        onChange={(e) => setInputActionSelectionValue(e.target.value)}
                    >
                        <option value="default">Select Action Option</option>
                        <option value="change-to">Change To</option>
                        <option value="make-all">Make All</option>
                        <option value="only-if">Only If</option>
                        <option value="and">And</option>
                    </select>
                    <p>Intent Value: {renderValue(inputIntentValue)}</p>
                    <input
                        type="text"
                        value={inputIntentValue instanceof File ? inputIntentValue.name : inputIntentValue ?? ''}
                        onChange={(e) => setInputIntentValue(e.target.value)}
                        className={styles.input}
                    />
                    <p>(Optional) Specified Intent Range: {inputSpecifiedIntentRange ? inputSpecifiedIntentRange : 0}</p>
                    <input
                        type="number"
                        value={inputSpecifiedIntentRange}
                        onChange={(e) => setInputSpecifiedIntentRange(Number(e.target.value))}
                        className={styles.input}
                    />
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