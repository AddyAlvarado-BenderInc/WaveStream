import React, { useState } from 'react';
import styles from './config.module.css';

interface ConfigModalProps {
    field: string | null;
    value: string | number;
    onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ field, value, onClose }) => {
    const [inputValue, setInputValue] = useState(value);

    const handleSave = () => {
        console.log(`Saving config for ${field}:`, inputValue);
        onClose();
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modal}>
                <h3>Configure {field}</h3>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={styles.input}
                />
                <div className={styles.actions}>
                    <button onClick={handleSave} className={styles.button}>
                        Save
                    </button>
                    <button onClick={onClose} className={styles.button}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;
