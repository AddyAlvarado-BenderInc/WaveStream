import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addVariablePackage } from '@/app/store/productManagerSlice';
import { variablePackageArray } from '../../../../../types/productManager';
import { handleCreateName } from '../ParameterTab/VariableUtility/utility';
import styles from './component.module.css';
import { RootState } from '@/app/store/store';

interface PackagerTabProps {
    initialName?: string | null;
    pendingData: {
        variableData: Record<string, {
            dataId: number;
            value: {
                filename: string[];
                url: string[];
            };
        } | null>
    };
    onClose: () => void;
}

interface VariablePackageItem {
    dataId: number;
}

export const PackagerTab: React.FC<PackagerTabProps> = ({ initialName, pendingData, onClose }) => {
    const [localVariableName, setLocalVariableName] = useState<string>(initialName || '');
    const [openNameModal, setOpenNameModal] = useState(false);

    const dispatch = useDispatch();
    const currentVariableClassPackage = useSelector((state: RootState) => state.variables.variableIconPackage as VariablePackageItem[]);
    const filename = pendingData.variableData && Object.values(pendingData.variableData).map(item => item?.value.filename).flat() || [];
    const url = pendingData.variableData && Object.values(pendingData.variableData).map(item => item?.value.url).flat() || [];

    console.log(`Filename: ${filename}`);
    console.log(`URL: ${url}`);

    const handleCloseCleanup = () => {
        onClose();
    };

    const handleAddIconData = () => {
        if (!localVariableName) {
            console.error('Variable name is missing');
            return;
        }

        const currentFilenamesInput = filename || [];
        const currentUrlsInput = url || [];

        const validFilenames = currentFilenamesInput.filter((name): name is string => name !== undefined);
        const validUrls = currentUrlsInput.filter((link): link is string => link !== undefined);

        if (!pendingData || validFilenames.length === 0) {
            console.error('Pending data is missing or invalid (no valid filenames)');
            return;
        }

        if (validUrls.length !== validFilenames.length) {
            console.warn(`Mismatch between valid filename count (${validFilenames.length}) and valid URL count (${validUrls.length}).`);
        }

        const currentPackageArray = Array.isArray(currentVariableClassPackage) ? currentVariableClassPackage : [];
        const maxId = currentPackageArray.reduce((max, item) => {
            const currentId = (item && typeof item.dataId === 'number') ? item.dataId : 0;
            return Math.max(max, currentId);
        }, 0);
        const nextDataId = maxId + 1;

        const payload: variablePackageArray = {
            dataId: nextDataId,
            name: localVariableName,
            dataLength: validFilenames.length,
            variableData: {
                "package_content": {
                    dataId: nextDataId,
                    value: {
                        filename: validFilenames,
                        url: validUrls
                    }
                }
            }
        };
        console.log(`Dispatching Payload for "${localVariableName}" (ID: ${nextDataId}):`, JSON.stringify(payload, null, 2));
        dispatch(addVariablePackage(payload));
        handleCloseCleanup();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button onClick={handleCloseCleanup} className={styles.closeButton}>✕</button>
                <div className={styles.packagerTab}>
                    {!openNameModal ? (
                        <div className={styles.nameModal}>
                            <h1>Icon Packager</h1>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (localVariableName.trim()) {
                                        const cleanedName = handleCreateName(localVariableName);
                                        setLocalVariableName(cleanedName);
                                        setOpenNameModal(true);
                                    } else {
                                        console.warn("Please enter a package name.");
                                    }
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Variable Package Name"
                                    onChange={(e) => setLocalVariableName(e.target.value)}
                                    value={localVariableName}
                                />
                                <button type='submit'>
                                    Set Name
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.parameterEntry}>
                            <h2>Package Name: {localVariableName}</h2>
                            <p>Click below to package the {filename.length} selected item(s) under this name.</p>
                            <div className={styles.buttonGroup}>
                                <button
                                    className={styles.actionButton}
                                    onClick={handleAddIconData}
                                >
                                    Create Variable Package
                                </button>
                                <button
                                    className={styles.actionButton}
                                    onClick={() => setOpenNameModal(false)}
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};