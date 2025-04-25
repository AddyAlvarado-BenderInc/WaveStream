import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { ToastContainer, toast } from 'react-toastify';
import styles from './component.module.css';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';

interface VariableClasses {
    stringInput: string;
    textareaInput: string;
    integerInput: string;
    task: string;
    type: string;
}

interface variableClassProps {
    onSave?: (variableClasses: VariableClasses) => void;
}

const VariableClass: React.FC<variableClassProps> = ({ onSave }) => {
    const [MKSType, setMKSType] = useState<string>('StringMKS');
    const [IntVar, setIntVar] = useState<string[]>([]);

    useEffect(() => {
        setLocalString('');
        setLocalTextarea('');
        setLocalInteger('');
        setLocalIntegerResult(null);
        setLocalEscapeSequence('');
        setLocalFile('');
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
    const [localEscapeSequence, setLocalEscapeSequence] = useState<string>("");
    const [localFile, setLocalFile] = useState<string>("");
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

    const loadVariableClasses = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const handleEscapeSequence = (text: string) => {
        const skipField = text.match(/(!SKIP)/g);
        if (skipField) {
            return "!SKIP";
        }
        return;
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
            try {
                const sanitized = expression
                    .replace(/[^0-9+\-*/().]/g, '')
                    .replace(/(\d)([+\-*/])/g, '$1 $2 ')
                    .trim();

                const value = eval(sanitized);

                if (isNaN(value)) throw new Error('Invalid expression');

                setLocalIntegerResult(Number(value));
                setLocalInteger(value);
                setLocalIntegerError('');
            } catch (err) {
                setLocalIntegerError('Invalid math expression');
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
                <div className={styles.integer}>
                    <input
                        type="text"
                        placeholder="Enter a numerical expression"
                        value={localInteger}
                        onChange={(e) => {
                            setLocalInteger(e.target.value);
                            safeEvaluate(e.target.value);
                        }}
                        className={`${styles.input} ${localIntegerError ? styles.error : ''}`}
                    />
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

    const linkedMKS = () => (
        <div className={styles.containerMKS}>
            <div className={styles.tooltipContainer}>
                <textarea
                    placeholder="Input Filename..."
                    value={localFile}
                    aria-describedby="input-tooltip"
                />
                <div className={styles.customTooltip} id="input-tooltip">
                    Copy and paste icon name from the Property Interfaces
                </div>
            </div>
        </div>
    );

    const handleClear = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalString('');
        setLocalTextarea('');
        setLocalInteger('');
        setLocalIntegerResult(null);
        setLocalEscapeSequence('');
        setLocalFile('');
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
            EscapeSequenceMKS: { task: "Escape Sequence", type: "String" },
            LinkedMKS: { task: "Linked Media", type: "String" },
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
            case 'EscapeSequenceMKS':
                if (!localEscapeSequence) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.stringInput = localEscapeSequence;
                break;
            case 'LinkedMKS':
                if (!localFile) {
                    toast.error("Please fill in the input field!");
                    return;
                }
                dataToSend.stringInput = localFile;
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
                                <button type='submit' onClick={configureVariables}>Configure</button>
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