import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { ToastContainer, toast } from 'react-toastify';
import { ProductManager } from "../../../../../types/productManager";
import ImageMagnifier from "./utility/ImageMagnifier";
import styles from './component.module.css';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';

interface VariableClasses {
    stringInput: string;
    textareaInput: string;
    integerInput: string;
    fileInput: string;
    task: string;
    type: string;
}

interface IconPackageClass {
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>
}

interface SelectedFile {
    url: string;
    filename: string;
    type: 'icon' | 'pdf';
}

interface variableClassProps {
    onPackage?: (iconVariableClass: IconPackageClass) => void;
    onSave?: (variableClasses: VariableClasses) => void;
    productManager: ProductManager
}


const VariableClass: React.FC<variableClassProps> = ({ onSave, productManager, onPackage }) => {
    const [MKSType, setMKSType] = useState<string>('StringMKS');
    const [IntVar, setIntVar] = useState<string[]>([]);
    const [showImageName, setShowImageName] = useState(false);

    useEffect(() => {
        setLocalString('');
        setLocalTextarea('');
        setLocalInteger('');
        setLocalIntegerResult(null);
        setLocalFile([]);
        setLocalIntegerError('');
        setIntVar([]);
    }, [MKSType]);

    const { stringInput, textareaInput, integerInput } = useSelector(
        (state: RootState) => state.variables
    );

    const [localString, setLocalString] = useState<string>(stringInput);
    const [localTextarea, setLocalTextarea] = useState<string>(textareaInput);
    const [localInteger, setLocalInteger] = useState<string>(integerInput);
    const [localIntegerResult, setLocalIntegerResult] = useState<number | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [localFilename, setLocalFilename] = useState<string[]>([]);
    const [localFile, setLocalFile] = useState<string[]>([]);
    const [localIntegerError, setLocalIntegerError] = useState('');


    const selectMKSType = (type: string) => {
        switch (type) {
            case 'StringMKS':
                return stringMKS();
            case 'IntegerMKS':
                return integerMKS();
            case 'TextareaMKS':
                return textareaMKS();
            case 'LinkedMKS':
                return linkedMKS();
            default:
                return stringMKS();
        }
    };

    function detectInterpolatedVariables(text: string) {
        const detectVariable = text.match(/\%\{(.*?)\}/g);
        if (detectVariable) {
            const cleanVariable = detectVariable.map((variable) =>
                variable.replace(/^\%\{|\}$/g, '')
            );
            setIntVar(cleanVariable);
        } else {
            setIntVar([]);
        }
    };

    const handleInterpolatedVariables = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (MKSType === 'StringMKS') {
            const newText = e.target.value;
            setLocalString(newText);
            detectInterpolatedVariables(newText);
        } else if (MKSType === 'TextareaMKS') {
            const newText = e.target.value;
            setLocalTextarea(newText);
            detectInterpolatedVariables(newText);
        }
    };

    const highlightInterVar = (text: string) => {
        return text.split(/(\%\{.*?\})/g).map((word, index) => {
            if (word.match(/^\%\{.*?\}$/)) {
                word.replace(/^\%\{|\}$/g, '');
                return <span key={index} className={styles.highlightedInterpolatedVariables}>{word}</span>;
            } else {
                return <span key={index}>{word}</span>;
            }
        });
    };

    // TODO: eventually add this function
    const loadVariableClasses = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const stringMKS = () => (
        <div className={styles.containerMKS}>
            {localString.length !== 0 ? (
                <div className={styles.highlightTextContent}>
                    {highlightInterVar(localString)}
                </div>
            ) : null}
            <div className={styles.tooltipContainer}>
                <textarea
                    placeholder="Input Main Key String Here..."
                    value={localString}
                    onChange={handleInterpolatedVariables}
                    aria-describedby="input-tooltip"
                />
                <div className={styles.customTooltip} id="input-tooltip">
                    Type your variable text like {" "}
                    <span style={{
                        color: "black",
                        backgroundColor: "yellow",
                        padding: "2px 4px",
                        borderRadius: "3px"
                    }}>
                        %{"{this}"}
                    </span>
                </div>
            </div>
        </div>
    );

    const integerMKS = () => {
        const safeEvaluate = (expression: string) => {
            if (expression.trim() === '') {
                setLocalIntegerResult(null);
                setLocalIntegerError('');
                return;
            }

            const segments = expression.split('|');
            let evaluated = false;

            for (const segment of segments) {
                const trimmedSegment = segment.trim();
                if (trimmedSegment === '') continue;

                try {
                    const sanitizedSegment = trimmedSegment
                        .replace(/[^0-9+\-*/().]/g, '')
                        .replace(/(\d)([+\-*/])/g, '$1 $2 ')
                        .trim();

                    if (sanitizedSegment === '') continue;

                    const value = new Function(`return ${sanitizedSegment}`)();

                    if (typeof value !== 'number' || isNaN(value)) {
                        continue;
                    }

                    setLocalIntegerResult(Number(value));
                    setLocalIntegerError('');
                    evaluated = true;
                    break;
                } catch (err) {
                }
            }

            if (!evaluated) {
                setLocalIntegerError('Invalid or no evaluable math expression segment found');
                setLocalIntegerResult(null);
            }
        };

        return (
            <div className={styles.containerMKS}>
                {localIntegerError && <div className={styles.errorMessage}>{localIntegerError}</div>}
                {localIntegerResult !== null && (
                    <div className={styles.resultPreview}>
                        Result: {localIntegerResult}
                    </div>
                )}
                <div className={styles.integerInputContainer}>
                    <input
                        type="text"
                        placeholder="e.g., 10*2 | 100/4 | 5+5"
                        value={localInteger}
                        onChange={(e) => {
                            setLocalInteger(e.target.value);
                            safeEvaluate(e.target.value);
                        }}
                        className={`${styles.input} ${localIntegerError ? styles.error : ''}`}
                        aria-describedby="integer-tooltip"
                    />
                    <div className={styles.customTooltip} id="integer-tooltip" style={{ textAlign: 'left', marginTop: '5px' }}>
                        Enter numerical expressions. Use " | " to separate multiple numbers or expressions (e.g., 10 | 20+5 | 30). The result of the first valid segment will be shown.
                    </div>
                </div>
            </div>
        );
    };

    const textareaMKS = () => (
        <div className={styles.descriptionMKS}>
            <textarea
                className={styles.textareaMKS}
                placeholder="Enter text..."
                value={localTextarea}
                onChange={handleInterpolatedVariables}
                aria-describedby="input-tooltip"
            />
            <div className={styles.customTooltip} id="input-tooltip">
                Type your variable text like {" "}
                <span style={{
                    color: "black",
                    backgroundColor: "yellow",
                    padding: "2px 4px",
                    borderRadius: "3px"
                }}>
                    %{"{this}"}
                </span>
            </div>
            <div className={styles.extractedVariablesList}>
                <h6>Extracted Variables</h6>
                {IntVar.length > 0 ? (
                    <ul>
                        {IntVar.map((v, index) => (
                            <li key={index}>{v}</li>
                        ))}
                    </ul>
                ) : (
                    <p>No variables detected.</p>
                )}
            </div>
        </div>
    );

    const linkedMKS = () => {

        const handleFileSelectionChange = (
            e: React.ChangeEvent<HTMLInputElement>,
            fileInfo: { url: string; filename: string; type: 'icon' | 'pdf' }
        ) => {
            const isChecked = e.target.checked;

            setSelectedFiles((prevSelected) => {
                if (isChecked) {
                    const canAdd = prevSelected.length === 0 || prevSelected[0].type === fileInfo.type;

                    if (canAdd) {
                        if (!prevSelected.some(f => f.url === fileInfo.url)) {
                            return [...prevSelected, fileInfo];
                        }
                        return prevSelected;
                    } else {
                        toast.info(`Selection cleared. Cannot mix Icon and PDF files. Selecting only ${fileInfo.filename}.`, { autoClose: 3500 });
                        return [fileInfo];
                    }
                } else {
                    return prevSelected.filter((file) => file.url !== fileInfo.url);
                }
            });
        };

        const isFileSelected = (url: string): boolean => {
            return selectedFiles.some(f => f.url === url);
        };

        const getDisabledState = (currentType: 'icon' | 'pdf'): boolean => {
            return selectedFiles.length > 0 && selectedFiles[0].type !== currentType;
        };

        const icons = Array.isArray(productManager.icon) ? productManager.icon : [];
        const pdfs = Array.isArray(productManager.pdf) ? productManager.pdf : [];

        return (
            <div className={styles.fileList}>
                {icons.length > 0 || pdfs.length > 0 ? (
                    <>
                        {icons.length > 0 && (
                            <div className={styles.fileListContainer}>
                                <h4>Available Icon Files</h4>
                                <ul>
                                    {icons.map((icon) => {
                                        const isDisabled = getDisabledState('icon');
                                        return (
                                            <li key={icon.filename} className={`${styles.checkboxItem} ${isDisabled ? styles.disabledItem : ''}`}>
                                                <label className={isDisabled ? styles.disabledLabel : ''}>
                                                    <input
                                                        type="checkbox"
                                                        value={icon.url}
                                                        onChange={(e) => handleFileSelectionChange(e, { ...icon, type: 'icon' })}
                                                        checked={isFileSelected(icon.url)}
                                                        disabled={isDisabled}
                                                    />
                                                    {icon.filename}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        {pdfs.length > 0 && (
                            <div className={styles.fileListContainer}>
                                <h4>Available PDF Files</h4>
                                <ul>
                                    {pdfs.map((pdf) => {
                                        const isDisabled = getDisabledState('pdf');
                                        return (
                                            <li key={pdf.filename} className={`${styles.checkboxItem} ${isDisabled ? styles.disabledItem : ''}`}>
                                                <label className={isDisabled ? styles.disabledLabel : ''}>
                                                    <input
                                                        type="checkbox"
                                                        value={pdf.url}
                                                        onChange={(e) => handleFileSelectionChange(e, { ...pdf, type: 'pdf' })}
                                                        checked={isFileSelected(pdf.url)}
                                                        disabled={isDisabled}
                                                    />
                                                    {pdf.filename}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        {selectedFiles.length > 0 && (
                            <div className={styles.filePreviewContainer}>
                                <h4>Selected File Previews</h4>
                                <div className={styles.filePreview}>
                                    {selectedFiles.map((file) => (
                                        <div key={file.url} className={styles.previewItemContainer}>
                                            {file.type === 'pdf' ? (
                                                <embed
                                                    src={file.url}
                                                    type="application/pdf"
                                                    className={styles.fileEmbed}
                                                    width="400"
                                                    height="600"
                                                />
                                            ) : (
                                                <ImageMagnifier
                                                    src={file.url}
                                                    alt={`Preview ${file.filename}`}
                                                    imgClassName={styles.fileImage}
                                                    magnifierRadius={100}
                                                    zoomLevel={2.5}
                                                />
                                            )}
                                            <div className={styles.previewFilename}>
                                                {file.filename}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p>No files available for this product. Open the Property Interfaces tab to upload images</p>
                )}
            </div>
        )
    };

    const handleClear = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalString('');
        setLocalTextarea('');
        setLocalInteger('');
        setLocalIntegerResult(null);
        setSelectedFiles([]);
        setLocalIntegerError('');
        setIntVar([]);
        toast.info("Inputs cleared");
    };

    const configureVariables = (e?: React.FormEvent) => {
        e?.preventDefault();

        const typeMappings: Record<string, { task: string; type: string }> = {
            StringMKS: { task: "Text Line", type: "String" },
            IntegerMKS: { task: "Number", type: "Integer" },
            TextareaMKS: { task: "Description", type: "Textarea" },
        };

        const { task, type } = typeMappings[MKSType] || { task: "Text Line", type: "String" };

        let dataToSend: Partial<VariableClasses> = { task, type };

        switch (MKSType) {
            case 'StringMKS':
                if (!localString) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.stringInput = localString;
                break;
            case 'IntegerMKS':
                if (!localInteger) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.integerInput = localInteger.toString();
                break;
            case 'TextareaMKS':
                if (!localTextarea) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.textareaInput = localTextarea;
                break;
            default:
                if (!localString) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.stringInput = localString;
        }


        if (onSave) {
            onSave(dataToSend as VariableClasses);
        }
    };

    const packageVariables = (e?: React.FormEvent) => {
        e?.preventDefault();

        if (selectedFiles.length === 0) {
            toast.error("Please select at least one file to package!");
            return;
        }

        const fileType = selectedFiles[0].type;
        const dataValue = fileType;

        const selectedFilenames = selectedFiles.map(file => file.filename);
        const selectedUrls = selectedFiles.map(file => file.url);

        const dataToSend = {
            variableData: {
                [`package_content_${dataValue}`]: {
                    dataId: 0,
                    value: {
                        filename: selectedFilenames,
                        url: selectedUrls
                    }
                }
            }
        };

        console.log("Packaging variables:", dataToSend);

        if (onPackage) {
            onPackage(dataToSend as unknown as IconPackageClass);
        } else {
            console.warn("onPackage function not provided.");
            toast.warn("Packaging function not available.");
        }
    };

    {
        return (
            <div className={styles.variableClassContainer}>
                <div className={styles.variableClassForm}>
                    <form>
                        <div className={styles.MKSContainer}>
                            {selectMKSType(MKSType)}
                        </div>
                        <div className={styles.configurationTools}>
                            <div className={styles.buttonContainer}>
                                {MKSType === 'LinkedMKS' ? (
                                    <button type='submit' onClick={packageVariables}>Package</button>
                                ) : (
                                    <button type='submit' onClick={configureVariables}>Configure</button>
                                )}
                                <button type='submit' onClick={(e) => { handleClear(e) }}>Clear</button>
                                {/* <button type='submit' onClick={(e) => { loadVariableClasses(e) }}>Load</button> */}
                            </div>
                            <select
                                value={MKSType}
                                onChange={(e) => setMKSType(e.target.value)}>
                                <option value='StringMKS'>Single Line</option>
                                <option value='IntegerMKS'>Number</option>
                                <option value='TextareaMKS'>Description</option>
                                <option value='LinkedMKS'>Linked Media</option>
                            </select>
                        </div>
                    </form>
                </div>
                <ToastContainer />
            </div>
        );
    };
};

export default VariableClass;