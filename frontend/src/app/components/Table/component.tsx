import { useState } from "react";
import styles from './component.module.css';

const Table = () => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<string[]>([]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalClassKeyInput(event.target.value);
    };

    const handleImportHeaderSheet = async () => {
        try {
            const fileInput = document.getElementById('class-key-upload') as HTMLInputElement;
            if (fileInput && fileInput.files) {
                const file = fileInput.files[0];
                if (!file || !file.name.endsWith('.csv')) {
                    alert('Please upload a valid CSV file');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csvData = event.target?.result;
                    if (csvData) {
                        const rows = (csvData as string).split('\n').filter(row => row.trim());
                        if (rows.length > 0) {
                            const classKeys = rows[0].split(',').map(key => key.trim());
                            setAddedClassKeys(classKeys);
                        } else {
                            alert('The uploaded CSV file is empty or invalid.');
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                alert('No file selected');
            }
        } catch (error) {
            console.error('Error importing header sheet:', error);
        }
    };

    const handleDeleteKey = (key: string) => {
        setAddedClassKeys(addedClassKeys.filter(k => k !== key));
    };

    return (
        <div className={styles.wavekeyTable}>
            <form>
                <input
                    type="text"
                    value={localClassKeyInput}
                    onChange={handleInputChange}
                    placeholder="Enter Class Key"
                    className={styles.inputField}
                />
                <div className={styles.classKeyButtons}>
                    <button
                        type="button"
                        onClick={() => {
                            if (localClassKeyInput.trim() === '') {
                                alert('Please enter a valid class key');
                                return;
                            }
                            setAddedClassKeys([...addedClassKeys, localClassKeyInput]);
                            setLocalClassKeyInput('');
                        }}
                        className={styles.addButton}
                    >
                        Add Class Key
                    </button>
                    <button
                        type="button"
                        onClick={() => setAddedClassKeys([])}
                        className={styles.deleteButton}
                    >
                        Delete All Class Keys
                    </button>
                    <label>
                        <div className={styles.uploadButton}>Upload Header Sheet</div>
                        <input
                            id="class-key-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleImportHeaderSheet}
                            className={styles.fileInput}
                        />
                    </label>
                </div>
            </form>
            <div className={styles.wavekeyTableForm}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {addedClassKeys.map((key, index) => (
                                <ClassKey key={index} input={key} onDelete={handleDeleteKey} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>No data yet</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ClassKey: React.FC<{ input: string; onDelete: (key: string) => void }> = ({ input, onDelete }) => (
    <th>
        <div className={styles.classKeyContainer}>
            {input}
            <button
                type="button"
                onClick={() => onDelete(input)}
                className={styles.deleteKeyButton}
            >
                ✕
            </button>
        </div>
    </th>
);

export default Table;
