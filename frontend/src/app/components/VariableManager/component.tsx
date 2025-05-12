import React, { useMemo, useState } from 'react';
import VariableClass from '../VariableManager/VariableClass/component';
import {
    addVariableClassArray,
    clearAllVariableClassArray,
    deleteVariableClassArray,
    addVariablePackage,
    clearAllVariablePackage,
    deleteVariablePackage,
} from '@/app/store/productManagerSlice';
import { tableSheetData, tableCellData, ProductManager, IGlobalVariablePackage, variablePackageArray } from '../../../../types/productManager';
import ParameterizationTab from '../VariableManager/ParameterTab/component';
import { RootState } from '@/app/store/store';
import { useSelector, useDispatch } from 'react-redux';
import Table from '../Table/component';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PackagerTab } from './PackagerTab/component';
import { DisplayPackageClass } from './PackageClass/component';
import { convertToTableFormat } from '@/app/utility/packageDataTransformer';
import SystemLogging from '../SystemLogging/component';

interface VariableDataState {
    tableSheet: tableSheetData[];
}

type VariableRowDataState = Record<string, tableCellData>;

interface PendingPackageData {
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>
}

type VariableDataProp = Record<string, {
    dataId: number;
    value: {
        filename: string[];
        url: string[];
    };
} | null>;

interface VariableManagerProps {
    productManager: ProductManager;
    variableData: VariableDataState;
    setVariableData: React.Dispatch<React.SetStateAction<VariableDataState>>;
    variableRowData: VariableRowDataState;
    setVariableRowData: React.Dispatch<React.SetStateAction<VariableRowDataState>>;
    setApprovedTableCellClear?: React.Dispatch<React.SetStateAction<boolean>>;
    setApprovedTableSheetClear?: React.Dispatch<React.SetStateAction<boolean>>;
    killAutomation: (server: string) => Promise<void>;
    runAutomation: () => Promise<void>;
    automationRunning: boolean;
    setAutomationRunning: (isRunning: boolean) => void;
    selectedServerForAutomation: string;
}

const VariableManager: React.FC<VariableManagerProps> = ({
    productManager,
    variableData,
    setVariableData,
    variableRowData,
    setVariableRowData,
    setApprovedTableCellClear,
    setApprovedTableSheetClear,
    killAutomation,
    runAutomation,
    automationRunning,
    setAutomationRunning,
    selectedServerForAutomation,
}) => {
    const [parameterizationOpen, setParameterizationOpen] = useState(false);
    const [parameterizationData, setParameterizationData] = useState<object | null>(null);
    const [pendingPackageData, setPendingPackageData] = useState<PendingPackageData | null>(null);
    const [packagerOpen, setPackagerOpen] = useState(false);
    const [originAssignment, setOriginAssignment] = useState("");
    const [sendToSheetModal, setSendToSheetModal] = useState(false);
    const [selectedClassKey, setSelectedClassKey] = useState<string>('');
    const [variableClassIdentifier, setVariableClassIdentifier] = useState<number | null | undefined>(null);
    const [rowsPopulated, setRowsPopulated] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hideButton, setHideButton] = useState(false);
    const [concatModal, setConcatModal] = useState(false);
    const [concatOption, setConcatOption] = useState<string>('');
    const [hideVariableClass, setHideVariableClass] = useState(false);
    const [hidePackageClass, setHidePackageClass] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editPrefillData, setEditPrefillData] = useState<{ name: string, params: any[] } | null>(null);
    const [packageIdentifier, setPackageIdentifier] = useState<number | null | undefined>(null);
    let [addOrSend, setAddOrSend] = useState<string>('send');

    const globalVariableClass = useSelector((state: RootState) => state.variables.variableClassArray);
    const globalPackageClass = useSelector((state: RootState) => state.variables.variableIconPackage);

    const dispatch = useDispatch();

    React.useEffect(() => {
        setRowsPopulated(Object.keys(variableRowData).length > 0);
    }, [variableRowData]);

    const handleOpenParameterizationTab = (variableClasses: object) => {
        console.log('Open Parameterization Tab', variableClasses);
        setParameterizationData(variableClasses);
        setParameterizationOpen(true);
        setEditingItemId(null);
        setEditPrefillData(null);
    };

    const handlePackagedData = (dataFromVariableClass: PendingPackageData) => {
        console.log('Packaged Data received from VariableClass:', dataFromVariableClass);
        if (!dataFromVariableClass || !dataFromVariableClass.variableData || Object.values(dataFromVariableClass.variableData).length === 0) {
            toast.error("No files selected to package.");
            return;
        }
        setPendingPackageData(dataFromVariableClass);
        setPackagerOpen(true);
    }

    const handleSubmitTableData = (tableSheetData: tableSheetData[]) => {
        setVariableData((prevState) => ({
            ...prevState,
            tableSheet: tableSheetData,
        }));
    };

    const handleOriginAssignment = (key: string) => {
        if (originAssignment !== key) {
            setOriginAssignment(key);
        }
    };

    const handleCloseParameterizationTab = () => {
        setParameterizationOpen(false);
        setEditingItemId(null);
        setEditPrefillData(null);
    };

    const handleClosePackagerTab = () => {
        setPackagerOpen(false);
        setPendingPackageData(null);
    };

    const itemForModal = useMemo(() => {
        if (variableClassIdentifier === null || variableClassIdentifier === undefined) {
            return null;
        }
        const sourceArray = Array.isArray(globalVariableClass) ? globalVariableClass : [];
        return sourceArray.find(item => item?.dataId === variableClassIdentifier);
    }, [variableClassIdentifier, globalVariableClass]);

    const packageItemForModal = useMemo(() => {
        if (packageIdentifier === null || packageIdentifier === undefined) {
            return null;
        }
        const sourceArray = Array.isArray(globalPackageClass) ? globalPackageClass : [];
        return sourceArray.find(item => item?.dataId === packageIdentifier);
    }, [packageIdentifier, globalPackageClass]);

    const handleSendToSheet = (
        variableDataRecord: Record<string, { dataId: number; value: string; } | null>,
        selectedKey: string,
        id: number | null | undefined
    ) => {
        console.log(`HANDLESENDTOSHEET: Received ID=${id}, Key=${selectedKey}, Data=`, variableDataRecord);
        if (!selectedKey) {
            toast.error('Please select a class key');
            return;
        }

        if (id === null) {
            toast.error('Invalid item ID');
            return;
        }

        const dataToAdd: (string | undefined)[] = Object.values(variableDataRecord).map(item => item?.value);

        const selectedKeyObject = variableData.tableSheet.find(item => item.value === selectedKey);
        if (!selectedKeyObject) {
            toast.error(`Selected class key "${selectedKey}" not found in table headers.`);
            return;
        }

        setVariableRowData(prevData => {
            const updatedData = { ...prevData };

            let nextRowIndex = 0;
            Object.keys(updatedData).forEach(key => {
                const match = key.match(/^(.+)_row_(\d+)$/);
                if (match) {
                    const baseKey = match[1];
                    const rowNum = parseInt(match[2], 10);
                    if (baseKey === selectedKey && !isNaN(rowNum)) {
                        nextRowIndex = Math.max(nextRowIndex, rowNum + 1);
                    }
                }
            });
            console.log(`Next available row index for key "${selectedKey}" is ${nextRowIndex}`);

            if (dataToAdd.length > 0) {
                dataToAdd.forEach((itemValue, index) => {
                    const newRowKey = `${selectedKey}_row_${nextRowIndex + index}`;
                    updatedData[newRowKey] = {
                        classKey: selectedClassKey,
                        index: nextRowIndex + index,
                        value: itemValue || "",
                        isComposite: false,
                        isPackage: false,
                        isDisabled: false,
                    };
                    console.log(`Adding to sheet state: Key=${newRowKey}, Value=${itemValue}, RowIndex=${nextRowIndex + index}`);
                });
            } else {
                console.warn("No data values found in variableDataRecord to add to the sheet.");
            }
            console.log("Updated variableClassData state:", updatedData);
            return updatedData;
        });
        setSendToSheetModal(false);
        setVariableClassIdentifier(null);
    };

    const handleSendComposite = (
        variableDataRecord: Record<string, { dataId: number; value: string; } | null>,
        selectedKey: string,
        id: number | null | undefined
    ) => {
        console.log(`handleSendComposite: Received ID=${id}, Key=${selectedKey}, Data=`, variableDataRecord);
        if (!selectedKey) {
            toast.error('Please select a class key for the composite');
            return;
        }
        if (id === null || id === undefined) {
            toast.error('Invalid source item ID for composite');
            return;
        }

        const compositeValues: string[] = Object.values(variableDataRecord)
            .filter(item => item !== null && item.value !== undefined && item.value !== null)
            .map(item => item!.value);

        if (compositeValues.length === 0) {
            toast.warn("No data values found in the source to create a composite.");
            return;
        }

        setVariableRowData(prevData => {
            const updatedData = { ...prevData };

            let nextRowIndex = 0;
            Object.keys(updatedData).forEach(key => {
                const match = key.match(/^(.+)_row_(\d+)$/);
                if (match) {
                    const baseKey = match[1];
                    const rowNum = parseInt(match[2], 10);
                    if (baseKey === selectedKey && !isNaN(rowNum)) {
                        nextRowIndex = Math.max(nextRowIndex, rowNum + 1);
                    }
                }
            });
            console.log(`Next available row index for composite key "${selectedKey}" is ${nextRowIndex}`);

            const newRowKey = `${selectedKey}_row_${nextRowIndex}`;

            updatedData[newRowKey] = {
                classKey: selectedKey,
                index: nextRowIndex,
                value: compositeValues,
                isComposite: true,
                isPackage: false,
                isDisabled: false,
            };
            console.log(`Adding composite to sheet state: Key=${newRowKey}, Values=${JSON.stringify(compositeValues)}, RowIndex=${nextRowIndex}`);

            console.log("Updated variableRowData state (after composite add):", updatedData);
            return updatedData;
        });

        setSendToSheetModal(false);
        setVariableClassIdentifier(null);
        toast.success(`Composite data added under key "${selectedKey}"`);
    };

    const handleSendPackage = (
        selectedKey: string,
        key: number | null | undefined 
    ) => {
        const sourcePackageObject: variablePackageArray | null | undefined = packageItemForModal;
    
        console.log(`handleSendPackage: Attempting to send Package ID=${key} to column Key=${selectedKey}`);
    
        if (!selectedKey) {
            toast.error('Please select a class key (column) for the package.');
            return;
        }
        if (key === null || key === undefined) {
            toast.error('Invalid source package ID provided.');
            console.error("handleSendPackage: Received invalid package ID (null or undefined).");
            return;
        }
    
        if (!sourcePackageObject || sourcePackageObject.dataId !== key) {
            toast.error("Internal error: Could not find the package data object to send.");
            console.error(`handleSendPackage: Mismatch or missing packageItemForModal. Expected ID: ${key}, Found:`, sourcePackageObject);
            return;
        }
    
        const packageToSend: IGlobalVariablePackage | null = convertToTableFormat(sourcePackageObject);
    
        if (!packageToSend) {
            toast.error("Internal error: Failed to prepare package data for the table.");
            console.error(`handleSendPackage: convertToTableFormat returned null for source package ID ${key}`);
            return;
        }
        if (!sourcePackageObject.variableData || Object.keys(sourcePackageObject.variableData).length === 0) {
            console.warn(`handleSendPackage: Source Package ID ${key} had no variableData content. Sending converted structure anyway.`);
        }
    
        setVariableRowData(prevData => {
            const updatedData = { ...prevData };
    
            let nextRowIndex = 0;
            Object.keys(updatedData).forEach(dataKey => {
                const match = dataKey.match(/^(.+)_row_(\d+)$/);
                if (match) {
                    const baseKey = match[1];
                    const rowNum = parseInt(match[2], 10);
                    if (baseKey === selectedKey && !isNaN(rowNum)) {
                        nextRowIndex = Math.max(nextRowIndex, rowNum + 1);
                    }
                }
            });
            console.log(`Next available row index for package key "${selectedKey}" is ${nextRowIndex}`);
    
            const newRowKey = `${selectedKey}_row_${nextRowIndex}`;
    
            updatedData[newRowKey] = {
                classKey: selectedKey,
                index: nextRowIndex,
                value: packageToSend,
                isComposite: false,
                isPackage: true,
                isDisabled: false,
            };
    
            console.log(`Adding package OBJECT (Table format) to sheet state: CellKey=${newRowKey}, PackageID=${key}, RowIndex=${nextRowIndex}, Value=`, packageToSend);
            console.log("New variableRowData state (after package add):", updatedData);
            return updatedData;
        });
    
        setSendToSheetModal(false);
        setPackageIdentifier(null);
        console.log(`Package object reference (Table format) added to table state under column "${selectedKey}"`);
    };

    const handleConcatOption = (
        e: React.MouseEvent<HTMLButtonElement>,
        object: Record<string, { dataId: number; value: string; } | null>,
        selectedClassKey: string,
        variableClassIdentifier: number | null | undefined,
    ) => {
        e.preventDefault();
        if (!concatOption) {
            alert("Please choose a run option.");
            return;
        }
        handleConcatenateToSheet(object, selectedClassKey, variableClassIdentifier, concatOption);
    }

    const handleConcatenateToSheet = (
        variableDataRecord: Record<string, { dataId: number; value: string; } | null>,
        selectedKey: string,
        id: number | null | undefined,
        option: string
    ) => {
        console.log("Concatenate to sheet triggered");
        setConcatModal(false);
        setSendToSheetModal(false);
    }

    const modalOptionsVariableClass = (
        key: number | null | undefined,
        object: any,
    ) => {
        let name = "";

        if (Array.isArray(object)) {
            const firstValue = object[0];
            if (firstValue && typeof firstValue === 'string') {
                const match = firstValue.match(/^([^\s]+)/);
                name = match ? match[1] : "";
            }
        }

        let valuesToDisplay: any[] = [];

        if (object && typeof object === 'object') {
            const variableRecord = object as Record<string, { dataId: number, value: string } | null>;
            valuesToDisplay = Object.values(variableRecord).map(item => item?.value);
        }

        return (
            <div className={styles.modal}>
                <div className={styles.modalContent}>
                    <h2>Declare The Class Key for {name}</h2>
                    <div className={styles.modalPayload}>
                        <div className={styles.payloadContainer}>
                            <h5>Payload</h5>
                            <DisplayVariableClass
                                object={valuesToDisplay}
                            />
                        </div>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => {
                            setSendToSheetModal(false)
                            setPackageIdentifier(null);
                        }}
                    >
                        &times;
                    </button>
                    <form>
                        <select
                            value={selectedClassKey}
                            onChange={(e) => setSelectedClassKey(e.target.value)}
                            className={styles.classKeySelect}
                        >
                            <option value="">-- Select a Class Key --</option>
                            {variableData.tableSheet.map((item, index) => (
                                <option key={`class-key-${index}`} value={item.value}>
                                    {item.value}
                                </option>
                            ))}
                        </select>
                        <div className={styles.modalButtons}>
                            <button
                                type='button'
                                className={styles.submitButton}
                                disabled={!selectedClassKey}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSendToSheet(object, selectedClassKey, variableClassIdentifier);
                                    setSendToSheetModal(false);
                                }}
                            >
                                Send
                            </button>
                            <button
                                type='button'
                                className={styles.submitButton}
                                disabled={!selectedClassKey}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSendComposite(object, selectedClassKey, variableClassIdentifier);
                                }}
                            >
                                Send As Composite
                            </button>

                            <>
                                <button
                                    type='button'
                                    className={styles.submitButton}
                                    disabled={!selectedClassKey}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteVariableClass(key);
                                        setVariableClassIdentifier(-1);
                                        handleSendToSheet(object, selectedClassKey, variableClassIdentifier);
                                        console.log("Deleted variable class with key:", key);
                                        setSendToSheetModal(false);
                                    }}
                                >
                                    Send & Delete
                                </button>
                                <button
                                    type='button'
                                    className={styles.submitButton}
                                    disabled={!selectedClassKey}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setConcatModal(true);
                                    }}
                                >
                                    Concat
                                </button>
                            </>
                        </div>
                        {concatModal && (
                            <div className={styles.concatModal}>
                                <h2>Concatenate Options</h2>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setConcatModal(false)}
                                >
                                    &times;
                                </button>
                                <form>
                                    <select
                                        value={concatOption}
                                        onChange={(e) => setConcatOption(e.target.value)}
                                        className={styles.concatSelect}
                                    >
                                        <option value="" disabled>-- Select a Concatenate Option --</option>
                                        <option value="front">Send to Front</option>
                                        <option value="back">Send to Back</option>
                                    </select>
                                    <button
                                        type='button'
                                        className={styles.submitButton}
                                        disabled={!concatOption}
                                        onClick={(e) => handleConcatOption(e, object, selectedClassKey, variableClassIdentifier)}
                                    >
                                        Concatenate
                                    </button>
                                </form>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    };

    const modalOptionsVariablePackage = (
        key: number | null | undefined,
        object: VariableDataProp,
    ) => {
        let name = packageItemForModal?.name || "";
        let valuesToDisplay: string[] = [];

        if (object && typeof object === 'object') {
            const firstEntryKey = Object.keys(object).find(k => object[k] !== null);
            const firstEntry = firstEntryKey ? object[firstEntryKey] : null;

            if (firstEntry?.value?.filename) {
                valuesToDisplay = firstEntry.value.filename.filter((fname): fname is string => fname !== undefined);
            }
        }
        console.log("Values to display:", valuesToDisplay);

        return (
            <div className={styles.modal}>
                <div className={styles.modalContent}>
                    <h2>Declare The Class Key for {name}</h2>
                    <div className={styles.modalPayload}>
                        <div className={styles.payloadContainer}>
                            <h5>Payload (Filenames)</h5>
                            <DisplayVariableClass
                                object={valuesToDisplay}
                            />
                        </div>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => {
                            setSendToSheetModal(false)
                            setPackageIdentifier(null);
                        }}
                    >
                        &times;
                    </button>
                    <form>
                        <select
                            value={selectedClassKey}
                            onChange={(e) => setSelectedClassKey(e.target.value)}
                            className={styles.classKeySelect}
                        >
                            <option value="">-- Select a Class Key --</option>
                            {variableData.tableSheet.map((item, index) => (
                                <option key={`class-key-${index}`} value={item.value}>
                                    {item.value}
                                </option>
                            ))}
                        </select>
                        <div className={styles.modalButtons}>
                            <button
                                type='button'
                                className={styles.submitButton}
                                disabled={!selectedClassKey}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!object || Object.keys(object).length === 0) {
                                        toast.error("Cannot send empty package data.");
                                        return;
                                    }
                                    handleSendPackage(selectedClassKey, key);
                                }}
                            >
                                Send Package
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const handleDeleteVariableClass = (id: number | null | undefined) => {
        dispatch(deleteVariableClassArray(id));
    };

    const handleDeletePackage = (id: number | null | undefined) => {
        if (id === null || id === undefined) return;
        console.log("Dispatching deleteVariablePackage with ID:", id);
        dispatch(deleteVariablePackage(id));
        if (packageIdentifier === id) {
            setPackageIdentifier(null);
            setSendToSheetModal(false);
        }
    };

    const handleClearAllVariableClass = () => {
        window.confirm("Are you sure you want to delete all variable classes?")
            ? dispatch(clearAllVariableClassArray())
            : toast.error("Deletion cancelled.");
    };

    const handleClearAllPackages = () => {
        if (window.confirm("Are you sure you want to delete all variable packages?")) {
            console.log("Dispatching clearAllVariablePackages");
            dispatch(clearAllVariablePackage());
            setPackageIdentifier(null);
        } else {
            toast.error("Deletion cancelled.");
        }
    };

    /* const handleEditVariableClass = ( itemToEdit: VariableClassPayload | null | undefined ) => {
        if (!itemToEdit) {
            toast.error("No item to edit");
            return;
        }
        setParameterizationData({ name: itemToEdit.name });
        setEditPrefillData({ name: itemToEdit.name, params: [] });
        setEditingItemId(itemToEdit.dataId);
        setParameterizationOpen(true);
    } */

    const displayVariableClass = (object: Record<string, any>) => {
        const itemsPerPage = 5;

        const displayableEntries = Object.entries(object);
        const totalPages = Math.ceil(displayableEntries.length / itemsPerPage);

        const currentEntries = displayableEntries.slice(
            currentPage * itemsPerPage,
            (currentPage + 1) * itemsPerPage
        );

        const filteredEntries = currentEntries.map(([key, value], index) => {
            let displayValue: React.ReactNode;
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

            if (key === 'variableData' && typeof value === 'object' && value !== null) {
                const innerValues = Object.values(value);
                if (innerValues.length > 0 && innerValues.every(item => typeof item === 'object' && item !== null && 'value' in item)) {
                    const joinedValues = innerValues.map(item => (item as { value: string }).value).join(", ");
                    if (joinedValues.length > 100) {
                        return (
                            <div style={{ maxHeight: '100px', overflowY: 'auto', padding: '4px', whiteSpace: 'normal', wordBreak: 'break-word', marginRight: '35px' }}>
                                {joinedValues}
                            </div>
                        )
                    } else {
                        displayValue = joinedValues;
                    }
                } else {
                    displayValue = (
                        <pre style={{
                            maxHeight: '100px',
                            overflowY: 'auto',
                            border: '1px solid #eee',
                            padding: '4px',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {JSON.stringify(value, null, 2)}
                        </pre>
                    );
                }
            } else if (key === 'dataLength' && typeof value === 'number') {
                displayValue = value.toString();
            } else if (key === 'dataId' && typeof value === 'number') {
                displayValue = value.toString();
            } else if (key === 'name' && (value === "" || value === null || value === undefined)) {
                displayValue = "No Name";
            } else if (typeof value === 'object' && value !== null) {
                displayValue = (
                    <pre style={{
                        maxHeight: '100px',
                        overflowY: 'auto',
                        border: '1px solid #eee',
                        padding: '4px',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {JSON.stringify(value, null, 2)}
                    </pre>
                );
            } else {
                displayValue = value !== null && value !== undefined ? value.toString() : "";
            }

            if (displayValue === "" && key !== 'name') {
                return null;
            }

            return (
                <div key={`${currentPage}-${key}-${index}`} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>{capitalizedKey}</b>
                        <br />
                        <span style={{ fontSize: "10pt" }}>{displayValue}</span>
                    </span>
                </div>
            );
        }).filter(Boolean);

        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableItems}>
                    {filteredEntries.length > 0 ? filteredEntries : <span className={styles.noData}>No Data</span>}
                </div>
                {displayableEntries.length > itemsPerPage && (
                    <div className={styles.paginationControls}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className={styles.pageButton}
                        >
                            &lt; Prev
                        </button>

                        <span className={styles.pageIndicator}>
                            Page {currentPage + 1} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className={styles.pageButton}
                        >
                            Next &gt;
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleHideVariableClass = () => {
        setHideButton(true);
        if (hideButton) {
            setHideButton(false);
        }
    }

    const handleHidePackageClass = () => {
        setHidePackageClass(!hidePackageClass);
    }

    const toggleVariableClass = () => {
        setHideVariableClass(true);
        if (hideVariableClass) {
            setHideVariableClass(false);
        }
    };

    return (
        <>
            {originAssignment && (
                <div className={styles.formContainer}>
                    <VariableClass
                        productManager={productManager}
                        onSave={handleOpenParameterizationTab}
                        onPackage={handlePackagedData}
                    />
                    {parameterizationData && parameterizationOpen && (
                        <ParameterizationTab
                            variableClassArray={globalVariableClass}
                            variableClass={parameterizationData}
                            onClose={handleCloseParameterizationTab}
                            editingItemId={editingItemId}
                            initialName={editPrefillData?.name}
                            initialParams={editPrefillData?.params}
                        />
                    )}
                    {packagerOpen && pendingPackageData && (
                        <PackagerTab
                            pendingData={pendingPackageData}
                            onClose={handleClosePackagerTab}
                        />
                    )}
                    {globalVariableClass.length > 0 && (
                        <div className={styles.variableClassList}>
                            <div className={styles.hideButtonContainer}>
                                <button
                                    className={styles.hideButton}
                                    onClick={handleHideVariableClass}
                                    title={`hide`}
                                >
                                    <h2>VariableClass | </h2>
                                    <span>{globalVariableClass.length} total rows | {hideButton ? "Show" : "Hide"}</span>
                                </button>
                            </div>
                            {!hideButton && (
                                <>
                                    {globalVariableClass.map((currentVariableClassData) => {
                                        const variableClassDataId = currentVariableClassData?.dataId;
                                        const variableClassData = currentVariableClassData?.variableData || {};
                                        console.log(`MAP: Rendering item ID=${variableClassDataId} at ${Date.now()}`, currentVariableClassData?.variableData);
                                        console.log("Variable Class Data ID", variableClassDataId);
                                        if (sendToSheetModal && variableClassIdentifier === variableClassDataId) {
                                            console.log(`MAP: Modal condition TRUE for ID=${variableClassDataId}, preparing to call modalOptions with:`, variableClassData);
                                        }
                                        return (
                                            <div key={variableClassDataId} className={styles.variableClassRow + `_row_${variableClassDataId}`}>
                                                <div
                                                    className={styles.variableClassContent}
                                                    onClick={() => {
                                                        toggleVariableClass();
                                                    }}
                                                >
                                                    {displayVariableClass(currentVariableClassData || [])}
                                                    <div className={styles.buttonContainer}>
                                                        <button
                                                            className={styles.actionButton}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setVariableClassIdentifier(variableClassDataId);
                                                                setSendToSheetModal(true);
                                                                setAddOrSend('send');
                                                            }}
                                                            title={`Send to Sheet`}
                                                        >
                                                            Send To Sheet
                                                        </button>
                                                        {/* Decided that adding the edit button is probably not worth the trouble 
                                                            because I could just work on saving params and mks in database. Maybe
                                                            I'll reconsider this again in the future. */}
                                                        {/* <button
                                                            className={styles.deleteButton}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleEditVariableClass(currentVariableClassData);
                                                            }}
                                                            title={`Edit Class`}
                                                        >
                                                            Edit Class
                                                        </button> */}
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleDeleteVariableClass(variableClassDataId);
                                                                if (variableClassIdentifier === variableClassDataId) {
                                                                    setVariableClassIdentifier(null);
                                                                }
                                                            }}
                                                            title={`Delete`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div className={styles.actionButtons}>
                                        <button
                                            className={styles.deleteAllButton}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleClearAllVariableClass();
                                                setVariableClassIdentifier(0);
                                            }}
                                        >Delete All
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {globalPackageClass.length > 0 && (
                        <div className={styles.variableClassList}>
                            <div className={styles.hideButtonContainer}>
                                <button className={styles.hideButton} onClick={handleHidePackageClass} title={`Toggle Package List`}>
                                    <h2>Variable Packages | </h2>
                                    <span>{globalPackageClass.length} total | {hidePackageClass ? "Show" : "Hide"}</span>
                                </button>
                            </div>
                            {!hidePackageClass && (
                                <>
                                    {globalPackageClass.map((currentPackageData) => {
                                        const packageDataId = currentPackageData?.dataId;
                                        return (
                                            <div key={`pkg-${packageDataId}`} className={styles.variableClassRow}>
                                                <div className={styles.variableClassContent}>
                                                    <DisplayPackageClass packageItem={currentPackageData} />
                                                    <div className={styles.buttonContainer}>
                                                        <button
                                                            className={styles.actionButton}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setPackageIdentifier(packageDataId);
                                                                setVariableClassIdentifier(null);
                                                                setSendToSheetModal(true);
                                                            }}
                                                            title={`Send Package to Sheet`}
                                                        >
                                                            Send To Sheet
                                                        </button>
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleDeletePackage(packageDataId);
                                                            }}
                                                            title={`Delete Package`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className={styles.actionButtons}>
                                        <button className={styles.deleteAllButton} onClick={(e) => { e.preventDefault(); handleClearAllPackages(); }}>
                                            Delete All Packages
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div>
                {sendToSheetModal && itemForModal && !packageItemForModal && (
                    <div
                        className={styles.modalOverlay}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setSendToSheetModal(false);
                                setVariableClassIdentifier(null);
                                setPackageIdentifier(null);
                            }
                        }}
                    >
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            {modalOptionsVariableClass(itemForModal.dataId, itemForModal.variableData)}
                        </div>
                    </div>
                )}
                {sendToSheetModal && packageItemForModal && !itemForModal && (
                    <div
                        className={styles.modalOverlay}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setSendToSheetModal(false);
                                setVariableClassIdentifier(null);
                                setPackageIdentifier(null);
                            }
                        }}
                    >
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            {modalOptionsVariablePackage(packageItemForModal.dataId, packageItemForModal.variableData)}
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.tableContainer}>
                <Table
                    productManager={productManager}
                    setApprovedTableSheetClear={setApprovedTableSheetClear}
                    setApprovedTableCellClear={setApprovedTableCellClear}
                    setVariableClassData={setVariableRowData}
                    variableRowData={variableRowData}
                    selectedClassKey={selectedClassKey}
                    variableData={variableData.tableSheet}
                    originAssignment={handleOriginAssignment}
                    submitTableData={handleSubmitTableData}
                    areRowsPopulated={setRowsPopulated}
                    killAutomation={killAutomation}
                    runAutomation={runAutomation}
                    automationRunning={automationRunning}
                    setAutomationRunning={setAutomationRunning}
                    selectedServerForAutomation={selectedServerForAutomation}
                />
                <SystemLogging />
            </div>
            <ToastContainer />
        </>
    )
}

const DisplayVariableClass: React.FC<{
    object: Record<string, any>
}> =
    ({ object }) => {
        const [currentPage, setCurrentPage] = useState(0);
        const itemsPerPage = 10;

        const entries = Object.entries(object);
        const totalPages = Math.ceil(entries.length / itemsPerPage);

        const currentEntries = entries.slice(
            currentPage * itemsPerPage,
            (currentPage + 1) * itemsPerPage
        );

        const filteredEntries = currentEntries.map(([key, value], index) => {
            let displayValue: string;

            if (Array.isArray(value)) {
                displayValue = value.join(", ");
            } else if (typeof value === "object" && value !== null) {
                displayValue = JSON.stringify(value);
            } else if (key === "name" && value === "") {
                displayValue = "No Name";
            } else {
                displayValue = value.toString();
            }

            return (
                <div key={`${currentPage}-${index}`} className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <span style={{ fontSize: "10pt" }}>{displayValue}</span>
                    </span>
                </div>
            );
        });

        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableItems}>
                    {filteredEntries}
                </div>
                {entries.length > itemsPerPage && (
                    <div className={styles.paginationControls}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className={styles.pageButton}
                        >
                            &lt; Prev
                        </button>
                        <span className={styles.pageIndicator}>
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className={styles.pageButton}
                        >
                            Next &gt;
                        </button>
                    </div>
                )}
            </div>
        );
    };

export default VariableManager;