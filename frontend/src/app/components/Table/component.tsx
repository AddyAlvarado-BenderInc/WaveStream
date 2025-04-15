import { useState } from "react";
import styles from './component.module.css';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

interface tableSheetData {
    index: number;
    value: string;
    isOrigin: boolean;
}

interface TableProps {
    productManagerID: any;
    variableData: tableSheetData[];
    originAssignment: (key: string) => void;
    submitVariableData: (values: tableSheetData[]) => void;
}

const Table: React.FC<TableProps> = ({ productManagerID, variableData, originAssignment, submitVariableData }) => {
    const [localClassKeyInput, setLocalClassKeyInput] = useState<string>('');
    const [addedClassKeys, setAddedClassKeys] = useState<tableSheetData[]>([]);
    const [headerOrigin, setHeaderOrigin] = useState<string>("");
    const [permanentOrigin, setPermanentOrigin] = useState<string>("");

    const classKeyInputObjects = addedClassKeys.length > 0 ? addedClassKeys : variableData;
    console.log("Class Key Input Objects:", classKeyInputObjects);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalClassKeyInput(event.target.value);
    };

    const duplicate = classKeyInputObjects.some(keyObj => keyObj.value === localClassKeyInput.trim());
    if (duplicate) {
        toast.error('Class key already exists');
        return;
    }

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
                            const classKeyObjects = rows[0].split(',').map((key, idx) => ({
                                index: idx,
                                value: key.trim(),
                                isOrigin: false,
                            }));
                            setAddedClassKeys(classKeyObjects);
                            submitVariableData(classKeyObjects);
                            setLocalClassKeyInput('');
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
                const updatedKeys = classKeyInputObjects.map((entry) =>
                    entry.value === key ? { ...entry, isOrigin: true } : { ...entry, isOrigin: false }
                );
                submitVariableData(updatedKeys);
                originAssignment(key);
                setAddedClassKeys(updatedKeys);
            }
        }
    };

    const handleDeleteKey = async (classKey: string) => {
        const updatedKeys = classKeyInputObjects.filter(k => k.value !== classKey);

        try {
            const response = await fetch(`/api/productManager/${productManagerID.productType}/${productManagerID._id}?field=${encodeURIComponent(classKey)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setAddedClassKeys(updatedKeys);
            } else {
                const errorData = await response.json();
                toast.error(`Error deleting class key: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting class key:', error);
            toast.error('Error deleting class key');
        }
    };

    const handleDeleteAllKeys = async () => {
        try {
            const response = await fetch(`/api/productManager/${productManagerID.productType}/${productManagerID._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setAddedClassKeys([]);
                setHeaderOrigin("");
            } else {
                const errorData = await response.json();
                toast.error(`Error deleting all class keys: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting all class keys:', error);
            toast.error('Error deleting all class keys');
        }
    };

    const handleEditKey = (key: string, newValue: string) => {
        const updatedKeys = classKeyInputObjects.map((entry) =>
            entry.value === key ? { ...entry, value: newValue } : entry
        );
        setAddedClassKeys(updatedKeys);
        submitVariableData(updatedKeys);
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
                                    const newKey: tableSheetData = {
                                        index: classKeyInputObjects.length,
                                        value: localClassKeyInput.trim(),
                                        isOrigin: false,
                                    };
                                    const updatedKeys = [...classKeyInputObjects, newKey];
                                    setAddedClassKeys(updatedKeys);
                                    submitVariableData(updatedKeys);
                                    setLocalClassKeyInput('');
                                }}
                                className={styles.addButton}
                            >
                                Add Class Key
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAddedClassKeys([]);
                                    submitVariableData([]);
                                    // handleDeleteAllKeys();
                                }}
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
                            {classKeyInputObjects.map((keyObj) => (
                                <>
                                    <ClassKey
                                        key={keyObj.index}
                                        input={keyObj.value}
                                        onDelete={handleDeleteKey}
                                        onEdit={handleEditKey}
                                        originAssignment={handleHeaderOrigin}
                                        permanentOrigin={permanentOrigin}
                                        headerOrigin={headerOrigin}
                                    />
                                </>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
            {classKeyInputObjects.length === 0 && (
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
                        ORIGIN
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
                        <span>{input}</span>
                        <div className={styles.keyButtons}>
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
                                    onDelete(input);
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