import React, { useState, useEffect, useRef } from 'react';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import BrickDescriptionSheet from '../BrickDescriptionSheet/component';
import 'react-toastify/dist/ReactToastify.css';

interface BrickEditorProps {
    brickId: string | boolean | number;
    field: string;
    targetValue: string | number | File | null;
    intentValue: string;
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
    const [inputTargetValue, setInputTargetValue] = useState<string>(
        targetValue ?? formData[field] ?? ''
    );
    const [inputTargets, setInputTargets] = useState<string[]>([]);
    const [inputIntents, setInputIntents] = useState<string[]>([]);
    const [inputIntentValue, setInputIntentValue] = useState(intentValue);
    const [isLoading, setIsLoading] = useState(false)

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const updateIframeContent = () => {
        if (iframeRef.current && typeof intentValue === 'string') {
            iframeRef.current.srcdoc = intentValue;
        }
    };

    useEffect(() => {
        updateIframeContent();
    }, [inputTargetValue, inputIntentValue]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                console.log('Fetching data for brickId:', brickId);

                const sanitizedBrickId = encodeURIComponent(
                    typeof brickId === 'string' ? brickId.trim().replace(/\s+/g, '_') : brickId
                );

                const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`);
                const data = await response.json();

                if (response.ok) {
                    console.log('Fetched data:', data);

                    setInputTargetValue(
                        data.targetValue !== null && data.targetValue !== ''
                            ? data.targetValue
                            : formData[field] || ''
                    );
                    setInputIntentValue(data.intentValue || 'none');
                } else {
                    console.warn(`Failed to fetch data: ${response.statusText}`);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load brick data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (brickId) fetchData();
    }, [brickId, field, formData]);

    const handleSave = async () => {
        const payload = {
            targetValue: inputTargetValue === '' || inputTargetValue === null ? formData[field] : inputTargetValue,
            intentValue: inputIntentValue,
            specifiedIntentRange,
            intentSelectionValue,
            actionSelectionValue,
        };

        try {
            const sanitizedBrickId = encodeURIComponent(brickId);
            const response = await fetch(`/api/brickEditor/${sanitizedBrickId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log('Field data saved successfully');
                toast.success('Brick saved successfully!');
            } else {
                console.error('Failed to save field data');
                toast.error('Error saving brick data. Please try again.');
            }
        } catch (error) {
            console.error('Error saving field data:', error);
            toast.error('Failed to save the product. Please try again.');
        }
    };

    const handleAddTarget = () => {
        if (!inputTargetValue) {
            toast.error('Please select a target value before adding.');
            return;
        }
        setInputTargets((prevTargets) => {
            if (prevTargets.includes(inputTargetValue)) {
                toast.error('Target value already exists.');
                return prevTargets;
            }
            return [...prevTargets, inputTargetValue];
        });
        setInputTargetValue('');
    };

    const handleDeleteTarget = (index: number) => {
        setInputTargets((prevTargets) => {
            const updatedTargets = [...prevTargets];
            updatedTargets.splice(index, 1);
            return updatedTargets;
        });
    };

    const handleDeleteIntent = (index: number) => {
        setInputIntents((prevIntents) => {
            const updatedIntents = [...prevIntents];
            updatedIntents.splice(index, 1);
            return updatedIntents;
        });
    };

    return (
        <div className={styles.brickEditor}>
            <div className={styles.header}>
                <h1>Brick Advanced Description</h1>
                <h5>{brickId}</h5>
            </div>
            <div className={styles.container}>
                <div className={styles.form}>
                    <p>Target Value: </p>
                    <select
                        value={inputTargetValue}
                        onChange={(e) => {
                            setInputTargetValue(e.target.value);
                        }}
                    >
                        <option value="default">Select Target(s)</option>
                        <option value="brief-description">Brief Description</option>
                        <option value="long-description">Long Description</option>
                    </select>
                    <button className={styles.button} onClick={handleAddTarget}>
                        Add Target to Sheet
                    </button>
                    <hr className={styles.divider}></hr>
                    <p>Intent Value:</p>
                    <select
                        value={inputIntentValue}
                        onChange={(e) => {
                            setInputIntentValue(e.target.value);
                        }}>
                        <option value="none">None</option>
                        <option value="description">Advanced Description</option>
                    </select>
                    {inputIntentValue === "description" ? (
                        <>
                            <iframe
                                ref={iframeRef}
                                title="Preview"
                                className={styles.iframe}
                                style={{ border: '1px solid var(--button-primary-hover)', width: '100%', height: '200px' }}
                            />
                            <button className={styles.button}> {/* Adds intent to description sheet */}
                                Add Intent to Sheet
                            </button>
                        </>
                    ) : null}
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
                    <BrickDescriptionSheet
                        intentValue={inputIntentValue}
                        targetValue={inputTargetValue}
                        inputTargets={inputTargets}
                        inputIntents={inputIntents}
                        brickId={brickId}
                        handleDeleteTarget={handleDeleteTarget}
                        handleDeleteIntent={handleDeleteIntent}
                    />
                </div>
            </div>
            {isLoading && <p>Loading...</p>}
            <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
            />
        </div>
    );
};

export default BrickEditor;
