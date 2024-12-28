import React, { useEffect, useState, useRef } from "react";
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import isEqual from 'lodash.isequal';
import 'react-toastify/dist/ReactToastify.css';
import exp from "constants";

interface BrickDescriptionSheetProps {
    brickId: string | boolean | number;
    targetValue: string | number | File | null;
    intentValue: string | number | File | null;
}

const BrickDescriptionSheet: React.FC<BrickDescriptionSheetProps> = ({
    targetValue,
    intentValue,
    brickId
}) => {
    const [inputTargets, setInputTargets] = useState<string[]>([]);
    const [inputIntents, setInputIntents] = useState<string[]>([]);
    const isUserUpdating = useRef(false);

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

    const renderTargetInterface = () => {

    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>
                    Brick Manager Sheets_{brickId}
                </h2>
            </div>
            <hr className={styles.divider} />
            <div className={styles.chart}>{"WIP"}</div>
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
    )
};


export default BrickDescriptionSheet;