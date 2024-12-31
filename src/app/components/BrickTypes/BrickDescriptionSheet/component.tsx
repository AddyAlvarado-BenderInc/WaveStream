import React, { useEffect, useState } from "react";
import styles from './component.module.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface BrickDescriptionSheetProps {
    brickId: string | boolean | number;
    targetValue: string | number | File | null;
    intentValue: string | number | File | null;
    inputTargets: string[];
    inputIntents: string[];
    handleDeleteTarget: (index: number) => void;
    handleDeleteIntent: (index: number) => void;
}

const BrickDescriptionSheet: React.FC<BrickDescriptionSheetProps> = ({
    targetValue,
    intentValue,
    inputTargets,
    inputIntents,
    brickId,
    handleDeleteTarget,
    handleDeleteIntent
}) => {
    const renderTargetInterface = () => (
        <div className={styles.list}>
            {inputTargets.map((target, index) => (
                <div key={index} className={styles.listItem}>
                    <h3>{target}</h3>
                    <button
                        className={styles.button}
                        onClick={() => handleDeleteTarget(index)}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );

    const renderIntentInterface = () => (
        <div className={styles.list}>
            {inputIntents.map((intents, index) => (
                <div key={index} className={styles.listItem}>
                    <h3>{intents}</h3>
                    <button
                        className={styles.button}
                        onClick={() => handleDeleteIntent(index)}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Brick Manager Sheets_{brickId}</h2>
            </div>
            <hr className={styles.divider} />
            <div className={styles.chart}>
                {inputTargets.length > 0 ? (
                    renderTargetInterface()
                ) : (
                    <h3>Select a target first.</h3>
                )}
            </div>
            <hr className={styles.divider} />
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

export default BrickDescriptionSheet;