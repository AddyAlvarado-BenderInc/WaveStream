import React, { useState } from 'react';
import styles from './component.module.css';
import { ProductManager } from '../../../../types/productManager';

interface BrickEditorProps {
    field: string;
    value: string | number | null;
    onSave: (field: string, value: string | number) => void;
    onCancel: () => void;
}

const BrickEditor: React.FC<BrickEditorProps> = ({ field, value, onSave, onCancel }) => {
    const [inputValue, setInputValue] = useState(value);

    const handleSave = () => {
        if (inputValue !== null && inputValue !== undefined) {
            onSave(field, inputValue);
        }
    };

    return (
        <div className={styles.brickEditor}>
            <h3>Configure {field}</h3>
            <input
                type="text"
                value={inputValue as string}
                onChange={(e) => setInputValue(e.target.value)}
                className={styles.input}
            />
            <div className={styles.actions}>
                <button onClick={handleSave} className={styles.saveButton}>
                    Save
                </button>
                <button onClick={onCancel} className={styles.cancelButton}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default BrickEditor;