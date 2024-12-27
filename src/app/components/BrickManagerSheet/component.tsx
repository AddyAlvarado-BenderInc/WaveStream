import React, { useState, useEffect } from 'react';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface BrickManagerSheetProps {
    brickId: string | boolean | number;
    field: string;
}

const BrickManagerSheet: React.FC<BrickManagerSheetProps> = ({
    brickId,
    field,
}) => {
    const [inputTargets, setInputTargets] = useState<string[]>([]);
    const [inputIntents, setInputIntents] = useState<string[]>([]);

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
        setInputTargets([...inputTargets, ""]);
    }

    const handleAddIntentInput = () => {
        setInputIntents([...inputIntents, ""]);
    }

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
                        <h3>Target(s):</h3>
                        {/* TODO: Values for Initial Target from parent BrickEditor component Located here! */}
                        <button name='target-button' className={styles.button}
                            onClick={handleAddTargetInput}
                        >
                            Add Target
                        </button>
                    </div>
                    {inputTargets.map((target, index) => (
                        <div key={`target-${index}`} className={styles.inputContainer}>
                            <input
                                type="text"
                                value={target}
                                onChange={(e) => handleTargetChange(index, e.target.value)}
                                className={styles.singleInput}
                            />
                            {inputTargets.length > 1 && (
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
                        <h3>Intent(s):</h3>
                        {/* TODO: Values for Initial Intent from parent BrickEditor component Located here! */}
                        <button name='intent-button' className={styles.button}
                            onClick={handleAddIntentInput}
                        >
                            Add Intent
                        </button>
                    </div>
                    {inputIntents.map((intent, index) => (
                        <div key={`intent-${index}`} className={styles.inputContainer}>
                            <input
                                type="text"
                                value={intent}
                                onChange={(e) => handleIntentChange(index, e.target.value)}
                                className={styles.singleInput}
                            />
                            {inputIntents.length > 1 && (
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
            {!inputTargets || !inputIntents && (
                <button name="save-button" className={styles.button} onClick={handleSave}>
                    Save
                </button>
            )}
            <ToastContainer />
        </div>
    );
};

export default BrickManagerSheet;
