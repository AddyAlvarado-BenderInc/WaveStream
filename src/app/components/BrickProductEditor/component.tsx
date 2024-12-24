import React, { useState, useEffect } from 'react';
import styles from './component.module.css';
// Should make imports for different settings that are specific to the selected field
// and have these set-ups as a config file within the component.
// Can decide to have it switch/case depending on the selected field

interface BrickEditorProps {
    brickId: string | boolean | number;
    field: string;
    targetValue: string | number | File | null; // Target value is the value the user wants to select from MDSF store
    intentValue: string | number | File | null; // Intent value is the value the user decides to change in the MDSF store
    specifiedIntentRange: number; // Specifies the range of intent and overrides the default if changed
    intentSelectionValue: string; // Specifies the intent selection value
    actionSelectionValue: string; // Specifies the action selection value
}

const BrickEditor: React.FC<BrickEditorProps> = ({
    field,
    targetValue,
    specifiedIntentRange,
    intentSelectionValue,
    actionSelectionValue,
    intentValue,
    brickId,
}) => {
    const [inputTargetValue, setInputTargetValue] = useState(targetValue);
    const [inputIntentValue, setInputIntentValue] = useState(intentValue);
    const [inputSpecifiedIntentRange, setInputSpecifiedIntentRange] = useState(specifiedIntentRange);
    const [inputIntentSelectionValue, setInputIntentSelectionValue] = useState(intentSelectionValue);
    const [inputActionSelectionValue, setInputActionSelectionValue] = useState(actionSelectionValue);

    const renderValue = (value: string | number | File | null): React.ReactNode => {
        if (value instanceof File) {
            return value.name;
        }
        return value !== null && value !== undefined ? value.toString() : "default";
    }

    useEffect(() => {
        const fetchBrickData = async () => {
            try {
                console.log('Fetching data for brickId:', brickId);

                const sanitizedBrickId = encodeURIComponent(
                    typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
                );

                const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch brick data: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Fetched data:', data);
                setInputTargetValue(data.targetValue || '');
                setInputIntentValue(data.intentValue || '');
                setInputSpecifiedIntentRange(data.specifiedIntentRange || 0);
                setInputIntentSelectionValue(data.intentSelectionValue || 'default');
            } catch (error) {
                console.error(error);
            }
        };

        if (brickId) fetchBrickData();
    }, [brickId]);

    const handleSave = async () => {
        const payload = {
            targetValue: inputTargetValue,
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
            } else {
                console.error("Failed to save field data");
            }
        } catch (error) {
            console.error("Error saving field data:", error);
        }
    };

    return (
        <div className={styles.brickEditor}>
            <div className={styles.header}>
                <h1>Brick Editor {field}</h1>
                <h5>{brickId}</h5>
            </div>
            <p>Current value: {renderValue(inputTargetValue)}</p>
            <p>Intent Range: {inputSpecifiedIntentRange ? inputSpecifiedIntentRange : 0}</p>
            <input
                type="number"
                value={inputSpecifiedIntentRange ? inputSpecifiedIntentRange : 0}
                onChange={(e) => setInputSpecifiedIntentRange(Number(e.target.value))}
                className={styles.input}
            />
            <p>Target Value: {renderValue(inputTargetValue)}</p>
            <input
                type="text"
                value={inputTargetValue as string}
                onChange={(e) => setInputTargetValue(e.target.value)}
                className={styles.input}
            />
            <button className={styles.button}>
                Add Target
            </button>
            <button className={styles.button}>
                Add Chart
            </button>
            <p>Selected Intent: {inputIntentSelectionValue}</p>
            <select>
                <option value={"default"}>Select Intent</option>
                <option value={"chronological"}>Chronological</option>
                {/* Add options for other intent types */}
            </select>
            <p>Selected Action: {inputActionSelectionValue}</p>
            <select>
                <option value={"default"}>Select Action</option>
                <option value={"changeTo"}>Change To</option>
                <option value={"makeAll"}>Make All</option>
                <option value={"onlyIf"}>Only If</option>
                <option value={"and"}>And</option>
                {/* Add options for other action types */}
            </select>
            <p>Intent Value: {renderValue(inputIntentValue)}</p>
            <input
                type="text"
                value={inputIntentValue as string}
                onChange={(e) => setInputIntentValue(e.target.value)}
                className={styles.input}
            />
            <div className={styles.actions}>
                <button className={styles.button} onClick={handleSave}>
                    Save
                </button>
                <button className={styles.button}>
                    Exit
                </button>
            </div>
        </div>
    );
};

export default BrickEditor;