import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTaskName, setTaskType } from "@/app/store/productManagerSlice"
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
    variableData: object;
    onSave?: (variableClasses: VariableClasses) => void;
}

const VariableClass: React.FC<variableClassProps> = ({ onSave, variableData }) => {
    const [MKSType, setMKSType] = useState<string>('StringMKS');
    const [IntVar, setIntVar] = useState<string[]>([]);
    const [loadStringsModal, setLoadStringsModal] = useState(false);
    const dispatch = useDispatch();


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
            case 'EscapeSequenceMKS':
                return escapeSequenceMKS();
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
        setLoadStringsModal(true);
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
                setLocalInteger('');
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
                        placeholder="Enter math expression (e.g., 5+3*2)..."
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

    const escapeSequenceMKS = () => (
        <div>
            <select
                onChange={(e) => handleEscapeSequence(e.target.value)}
            >
                <option value="1">!SKIP</option>
            </select>
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

    const configureVariables = (e?: React.FormEvent) => {
        e?.preventDefault();

        const variableData: Record<string, any> = {
            StringMKS: { stringInput: localString },
            IntegerMKS: { integerInput: localInteger.toString() },
            TextareaMKS: { textareaInput: localTextarea },
            EscapeSequenceMKS: { escapeSequence: localEscapeSequence },
            LinkedMKS: { linkedInput: localFile },
        };

        const selectedData = variableData[MKSType] || { stringInput: localString };

        const hasValidInput = Object.values(selectedData).some(value => value !== "" && value !== false);
        if (!hasValidInput) {
            toast.error("Please fill in at least one field!");
            return;
        }

        const typeMappings: Record<string, { task: string; type: string }> = {
            StringMKS: { task: "Text Line", type: "String" },
            IntegerMKS: { task: "Number", type: "Integer" },
            TextareaMKS: { task: "Description", type: "Textarea" },
            EscapeSequenceMKS: { task: "Special Instructions", type: "EscapeSequence" },
            LinkedMKS: { task: "File Upload", type: "Linked" },
        };

        const { task, type } = typeMappings[MKSType] || { task: "Text Line", type: "String" };
        dispatch(setTaskName(task));
        dispatch(setTaskType(type));

        if (onSave) {
            onSave({
                stringInput: localString,
                textareaInput: localTextarea,
                integerInput: localInteger.toString(),
                task: task,
                type: type,
            })
        };
    };

    {
        return (
            <>
                <div className={styles.variableClassContainer}>
                    <div className={styles.variableClassForm}>
                        <form>
                            <div className={styles.MKSContainer}>
                                {selectMKSType(MKSType)}
                            </div>
                            <div className={styles.configurationTools}>
                                <div className={styles.buttonContainer}>
                                    <button type='submit' onClick={configureVariables}>Configure</button>
                                    <button type='submit' onClick={(e) => { loadVariableClasses(e) }}>Load</button>
                                </div>
                                <select
                                    value={MKSType}
                                    onChange={(e) => setMKSType(e.target.value)}>
                                    <option value='StringMKS'>Single Line</option>
                                    <option value='IntegerMKS'>Math</option>
                                    <option value='TextareaMKS'>Description</option>
                                    <option value='EscapeSequenceMKS'>Escape Sequence</option>
                                    <option value='LinkedMKS'>Linked Media</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <ToastContainer />
                </div>
            </>
        );
    };
};

export default VariableClass;