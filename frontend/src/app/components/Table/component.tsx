import { useState } from "react";
import styles from './component.module.css';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

interface TableProps {
    variableData: string[];
    variableClassSheet: string[];
    originAssignment: (key: string) => void;
}

const Table: React.FC<TableProps> = ({ variableData, variableClassSheet, originAssignment }) => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<string[]>([]);
    const [headerOrigin, setHeaderOrigin] = useState("");
    const [permanentOrigin, setPermanentOrigin] = useState("");

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
                            toast.error('The uploaded CSV file is empty or invalid.');
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

    const handleHeaderOrigin = (key: string) => {
        if (permanentOrigin) {
            return null;
        }

        if (headerOrigin !== key) {
            setHeaderOrigin(key);
        }
    };

    const handlePermanentOrigin = (key: string) => {
        if (headerOrigin === key && !permanentOrigin) {
            const confirmation = window.confirm(
                `Are you sure you want to set "${key}" as the permanent origin?\nMake sure that this class key has a wide range of variable classes`
            );
            if (confirmation) {
                setPermanentOrigin(key);
                originAssignment(key);
            }
        }
    };

    const handleDeleteKey = (key: string) => {
        setAddedClassKeys(addedClassKeys.filter(k => k !== key));
    };

    const handleEditKey = (key: string, newValue: string) => {
        setAddedClassKeys((prevKeys) =>
            prevKeys.map((k) => (k === key ? newValue : k))
        );
    };

    // TODO: Will have variable sheet data entered here
    const handleVariableRows = (row: string[]) => {
        if (row.length === 0) {
            return null;
        }
        const filteredMap = row.map(([key, value]) => {

        })
        return (
            <td></td>
        )
    };

    return (
        <div className={styles.wavekeyTable}>
            <div className={styles.header}>
                <h2>Table</h2>
            </div>
            <form>
                {!permanentOrigin && (
                    <input
                        type="text"
                        value={localClassKeyInput}
                        onChange={handleInputChange}
                        placeholder="Enter Class Key"
                        className={styles.inputField}
                    />
                )}
                <div className={styles.rowContainer}>
                    {!permanentOrigin && (
                        <div className={styles.classKeyButtons}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (localClassKeyInput.trim() === '') {
                                        toast.error('Please enter a valid class key');
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
                    )}
                    {headerOrigin && !permanentOrigin ? (
                        <div className={styles.currentOriginContainer}>
                            <h4>Current Origin {" "}
                                <span style={{ color: "black", backgroundColor: "yellow", padding: "5px", borderRadius: "5px" }}>
                                    {headerOrigin}
                                </span>
                            </h4>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePermanentOrigin(headerOrigin);
                                }}
                            >
                                Set As Origin
                            </button>
                        </div>
                    ) : (
                        <div className={styles.currentOriginContainer}>
                            {permanentOrigin ? (
                                <h4 style={{ color: "black", backgroundColor: "yellow", padding: "5px", borderRadius: "5px" }}>
                                    {permanentOrigin}
                                </h4>
                            ) : (
                                null
                            )}
                        </div>
                    )}
                </div>
            </form>
            <div className={styles.wavekeyTableForm}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {addedClassKeys.map((key, index) => (
                                <ClassKey
                                    key={index}
                                    input={key}
                                    onDelete={handleDeleteKey}
                                    onEdit={handleEditKey}
                                    originAssignment={handleHeaderOrigin}
                                    permanentOrigin={permanentOrigin}
                                    headerOrigin={headerOrigin}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
            {addedClassKeys.length === 0 && (
                <em>No Data Found</em>
            )}
            <ToastContainer />
        </div>
    );
};

const ClassKey: React.FC<{
    input: string;
    onDelete: (key: string) => void;
    onEdit: (key: string, newValue: string) => void;
    originAssignment: (key: string) => void;
    permanentOrigin: string;
    headerOrigin: string;
}> = ({ input, onDelete, onEdit, originAssignment, permanentOrigin, headerOrigin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(input);

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEdit(input, editValue);
        setIsEditing(false);
    };

    return (
        <th
            className={styles.classKeyHeader}
            onClick={(e) => {
                e.preventDefault();
                originAssignment(input);
            }}
        >
            {
                headerOrigin === input ?
                    <div className={styles.headerOriginDisplay}>
                        {headerOrigin.replace(headerOrigin, "ORIGIN")}
                    </div>
                    : ''}
            <div className={styles.classKeyContainer}>
                {isEditing ? (
                    <form onSubmit={handleEditSubmit}>
                        <input
                            type="text"
                            value={editValue || ""}
                            onChange={(e) => setEditValue(e.target.value)}
                        />
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => {
                            setIsEditing(false);
                        }}>
                            Cancel
                        </button>
                    </form>
                ) : (
                    <>
                        {input}
                        <div
                            className={styles.keyButtons}
                        >
                            {!permanentOrigin ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className={styles.editKeyButton}
                                >
                                    Edit
                                </button>
                            ) : ("")}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(input)
                                }}
                                className={styles.deleteKeyButton}
                            >
                                ✕
                            </button>
                        </div>
                    </>
                )}
            </div>
        </th>
    );
};


export default Table;
