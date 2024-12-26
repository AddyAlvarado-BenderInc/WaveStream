import React from 'react';
import styles from './component.module.css';

interface BrickManagerSheetProps {
    brickId: string | boolean | number;
}

const BrickManagerSheet: React.FC<BrickManagerSheetProps> = ({
    brickId
}) => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Brick Manager Sheet {brickId}</h2>
            </div>
            <hr className={styles.divider}></hr>
            <div className={styles.chart}>
                <p>Sheet Component (Placeholder)</p>
                <div className={styles.sheets}>
                    <p>Target(s): </p>
                    <p>Intent(s): </p>
                </div>
            </div>
        </div>
    )
};

export default BrickManagerSheet;