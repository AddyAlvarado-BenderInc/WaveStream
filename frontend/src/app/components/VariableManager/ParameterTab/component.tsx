import React, { useState, useEffect } from 'react';
import {
    addParameter,
    clearParameter,
    setVariableClass,
    addVariableClassArray,
    setParameterBundle,
    clearAllParameters
} from '@/app/store/productManagerSlice';
import {
    cleanedInputValues,
    displayOnlyType,
    displayOnlyValue,
    generateCombinations,
    handleCreateName,
} from './VariableUtility/utility';
import ParameterModal from '../ParameterModal/component';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { RootState } from '@/app/store/store';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';
import { mainKeyString } from '../../../../../types/productManager';

interface ParameterizationTabProps {
    variableClass: object;
    onClose: () => void;
}

interface AddedParameter {
    id: number;
    variable: string;
    name: string;
    value: string;
}

interface BundlizedParameters {
    id: number;
    variable: string;
    parameterName: string;
    addedParameter: string;
}

interface VariablePayload {
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: string;
    }>;
}

interface VariableClasses {
    stringInput: string;
    textareaInput: string;
    integerInput: string;
    task: string;
    type: string;
}

const ParameterizationTab: React.FC<ParameterizationTabProps> = ({ variableClass, onClose }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [intVar, setIntVar] = useState<string[]>([]);
    const [selectedInterpolatedVariables, setSelectedInterpolatedVariables] = useState<string | null>(null);
    const [showParameterModal, setShowParameterModal] = useState(false);
    const [integerOptions, setIntegerOptions] = useState<string | null>(null);
    const [addedParameters, setAddedParameters] = useState<AddedParameter[]>([]);
    const [openNameModal, setOpenNameModal] = useState(false);
    const [localVariableName, setLocalVariableName] = useState<string>('');
    const [localParameter, setLocalParameter] = useState({
        parameterName: '',
        addedParameter: ''
    });
    const globalParameterBundle = useSelector((state: RootState) => state.parameter.parameters);

    const dispatch = useDispatch();

    // TODO: this save function will handle the fetch to the mainKeyString database
    const saveMainKeyString = (payload: { mainKeyString: mainKeyString[] }) => {
        const { mainKeyString } = payload;
    };

    const { value, detectVariables } = cleanedInputValues(variableClass);

    const displayIntegerVariables = (value: object) => {
        const cleanValue = cleanedInputValues(value).value;
        const unallowedKeys = [
            'Text Line',
            'Description',
            'Special Instructions',
            'File Upload',
            'String',
            'Textarea',
            'EscapeSequence',
            'Linked'
        ];

        const keyPattern = new RegExp(
            `\\b(${unallowedKeys.join('|')})\\b`,
            'gi'
        );

        const filteredParts = cleanValue
            .split(keyPattern)
            .filter(part => {
                const isRestricted = part && unallowedKeys.includes(part.trim());
                return isRestricted;
            }).join(' ');

        if (!cleanValue.includes(filteredParts)) {
            return null;
        };

        const setNumberValue = cleanValue.replace("Integer", "").replace("Number", "").trim()
        const numberedValue = parseInt(setNumberValue);
        return (
            <div className='integer-editor'>
                <h1 style={{ textTransform: "uppercase" }}>{numberedValue}</h1>
                <form>
                    <select
                        onChange={(e) => setIntegerOptions(e.target.value)}
                    >
                        <option value={''}>Select an option</option>
                        <option value={'All'}>Make All {numberedValue}</option>
                        <option value={'Increment'}>Increment {numberedValue} with...</option>
                        <option value={'Range'}>Customize Range with Origin of {numberedValue}</option>
                    </select>
                </form>
            </div>
        );
    };

    const handleInterpolatedVariables = (value: string) => {
        setSelectedInterpolatedVariables(value);
    };

    const handleParameterSave = () => {
        if (!selectedInterpolatedVariables || !localParameter.addedParameter) {
            alert('Please enter a parameter value.');
            return;
        }

        dispatch(addParameter({
            id: Date.now(),
            variable: selectedInterpolatedVariables,
            parameterName: localParameter.parameterName ? localParameter.parameterName : localParameter.addedParameter,
            addedParameter: localParameter.addedParameter,
        }));

        setAddedParameters(prev => {
            const existingParameter = prev.findIndex(p =>
                p.variable === selectedInterpolatedVariables &&
                p.name === localParameter.parameterName
            );

            if (existingParameter > -1) {
                const updated = [...prev];
                updated[existingParameter] = {
                    ...updated[existingParameter],
                    value: localParameter.addedParameter
                };
                return updated;
            }

            return [...prev, {
                id: Date.now(),
                variable: selectedInterpolatedVariables,
                name: localParameter.parameterName ? localParameter.parameterName : localParameter.addedParameter,
                value: localParameter.addedParameter
            }];
        });

        setLocalParameter({ parameterName: '', addedParameter: '' });
        setShowParameterModal(false);
    };

    const renderAddedParameters = () => {
        const handleDragStart = (index: number) => {
            setDraggedIndex(index);
        };

        const handleDragOver = (e: React.DragEvent, index: number) => {
            e.preventDefault();
            setDragOverIndex(index);
        };

        const handleDrop = () => {
            if (draggedIndex === null || dragOverIndex === null) return;

            const newParams = [...addedParameters];
            const [draggedItem] = newParams.splice(draggedIndex, 1);
            newParams.splice(dragOverIndex, 0, draggedItem);

            setAddedParameters(newParams);
            setDraggedIndex(null);
            setDragOverIndex(null);
        };

        return (
            <div className="added-parameters">
                <h4>Configured Parameters:</h4>
                <div className="parameter-item">
                    <table className='parameter-table'>
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {addedParameters.map((param, index) => (
                                <tr
                                    key={param.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={handleDrop}
                                    className={`
                                        ${draggedIndex === index ? 'dragged' : ''}
                                        ${dragOverIndex === index ? 'drag-over' : ''}
                                    `}
                                >
                                    <td>{param.variable}</td>
                                    <td>{param.name}</td>
                                    <td>{param.value}</td>
                                    <td className='action-buttons'>
                                        <button
                                            className="edit-button"
                                            onClick={() => {
                                                setSelectedInterpolatedVariables(param.variable);
                                                setLocalParameter({
                                                    parameterName: param.name,
                                                    addedParameter: param.value
                                                });
                                                setShowParameterModal(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="delete-button"
                                            onClick={() => {
                                                setAddedParameters(prev => prev.filter(p => p.id !== param.id));
                                                clearParameter(param.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const configureInterpolatedVariables = (variable: string) => {
        console.log(`Configuring variable: ${variable}`);
        setShowParameterModal(true);
    }

    const displayInterpolatedVariables = (value: string[]) => {
        if (value.length === 0) {
            return null;
        }

        return (
            <div className='interpolated-variable-editor'>
                {value.map((value, index) => {
                    const cleanedValue = value.toString().replace(/\%/g, '');
                    return (
                        <button
                            key={index}
                            className="interpolated-variable-button"
                            onClick={() => handleInterpolatedVariables(cleanedValue)}
                        >
                            <b style={{ textTransform: "uppercase" }}>{cleanedValue}</b>
                        </button>
                    );
                })}
            </div>
        );
    };

    useEffect(() => {
        if (detectVariables.length > 0 && JSON.stringify(detectVariables) !== JSON.stringify(intVar)) {
            setIntVar(detectVariables);
        }
    }, [detectVariables]);

    const handleCloseCleanup = () => {
        dispatch(clearAllParameters());
        onClose();
        setSelectedInterpolatedVariables(null);
        setLocalParameter({ parameterName: '', addedParameter: '' });
        setAddedParameters([]);
        setIntVar([]);
    };

    // TODO: Will work on later once the handleAddVariable function is working
    const handleSaveVariableClass = (object: Object, param: BundlizedParameters[]) => {
        if (!object) {
            toast.error('Key String is empty');
            return;
        }
        toast.success('Key String saved successfully');
        dispatch(setVariableClass(object));

        const mainKeyString: mainKeyString[] = Object.entries(object)
            .filter(([key, value]) => key !== 'task' && key !== 'type' && value)
            .map(([key, value]) => ({
                type: key,
                value: value.toString(),
            }));
        console.log('Main Key String: ', mainKeyString);

        saveMainKeyString({ mainKeyString });

        const transformedParams = param.map((p) => ({
            id: p.id,
            variable: p.variable,
            parameterName: p.parameterName,
            addedParameter: p.addedParameter,
        }));

        dispatch(setParameterBundle(transformedParams));
    };

    const handleAddVariable = (object: object, param: BundlizedParameters[]) => {
        let inputString = "";
        const { task, type, stringInput, textareaInput, integerInput } = object as VariableClasses;

        if (type === "String" && task === "Text Line" || type === "Linked") {
            inputString = stringInput || "";
        } else if (type === "Textarea" && task === "Description") {
            inputString = textareaInput || "";
        } else if (type === "Integer" && task === "Number") {
            inputString = integerInput || "";
        } else if (type === "EscapeSequence" && task === "Special Instructions") {
            inputString = stringInput || "";
        }

        console.log('handleAddVariable - stringInput ', stringInput);
        console.log('handleAddVariable - globalParameterBundle (param): ', JSON.stringify(param, null, 2));

        const detectedVars = inputString.match(/\%\{(.*?)\}/g)?.map(v => v.replace(/[%{}]/g, '')) || [];
        console.log("handleAddVariable - Detected variables in input:", detectedVars);

        const relevantParamsExist = detectedVars.length > 0 && detectedVars.every(v => param.some(p => p.variable === v));
        console.log("handleAddVariable - Relevant parameters exist:", relevantParamsExist);

        let variableData: string[] = [];
        let dataLength = 0;

        if (detectedVars.length > 0 && relevantParamsExist && param.length > 0) {
            console.log("handleAddVariable - Running COMBINATION logic.");

            const groupedParams = param.reduce((acc, item) => {
                if (detectedVars.includes(item.variable)) {
                    if (!acc[item.variable]) {
                        acc[item.variable] = [];
                    }
                    acc[item.variable].push(item.addedParameter);
                }
                return acc;
            }, {} as Record<string, string[]>);

            if (Object.keys(groupedParams).length === 0) {
                console.log("handleAddVariable - No relevant grouped params, treating as single item.");
                variableData = [inputString];
            } else {
                const variables = Object.keys(groupedParams);
                const combinations = generateCombinations(groupedParams);
                console.log("handleAddVariable - Generated Combinations:", JSON.stringify(combinations, null, 2));

                variableData = combinations.map(combo => {
                    let result = inputString;
                    variables.forEach((variable) => {
                        const regex = new RegExp(`\\%\\{${variable}\\}`, 'g');
                        result = result.replace(regex, combo[variable]);
                    });
                    return result;
                });
            }

        } else {
            console.log("handleAddVariable - Running SINGLE item logic.");
            variableData = [inputString];
        }

        dataLength = variableData.length;
        const uniqueDataId = Date.now();

        const payload: VariablePayload = {
            dataId: uniqueDataId,
            name: localVariableName,
            dataLength,
            variableData: variableData.reduce((acc, value, index) => {
                acc[index.toString()] = { 
                    dataId: uniqueDataId,
                    value: value 
                };
                return acc;
            }, {} as Record<string, { dataId: number, value: string; }>),
        };

        console.log("Generated Payload:", JSON.stringify(payload, null, 2));
        dispatch(addVariableClassArray(payload));
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                    className="close-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        handleCloseCleanup();
                        setSelectedInterpolatedVariables(null);
                        setLocalParameter({ parameterName: '', addedParameter: '' });
                        setAddedParameters([]);
                        setIntVar([]);
                    }}
                >
                    ×
                </button>
                {!openNameModal && (
                    <div className="name-modal">
                        <h1>Parameterization Tab</h1>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const cleanedName = handleCreateName(localVariableName);
                                setLocalVariableName(cleanedName);
                                setOpenNameModal(true);
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Name"
                                onChange={(e) => setLocalVariableName(e.target.value)}
                                value={localVariableName}
                            />
                            <button
                                type='submit'
                                className="name-button"
                                onClick={() => {
                                    setLocalParameter({ parameterName: '', addedParameter: '' });
                                }}
                            >
                                Create Name
                            </button>
                        </form>
                    </div>
                )}
                {openNameModal && (
                    <div className='modalContent'>
                        <h2>Parameterization Details</h2>
                        <div>{displayOnlyType(value)}</div>
                        <h3>{localVariableName}</h3>
                        <div>
                            {displayIntegerVariables(variableClass) ?
                                displayIntegerVariables(variableClass) :
                                <div style={{ textAlign: "center", fontSize: "16pt", marginBottom: "10px" }}>
                                    {displayOnlyValue(value)}
                                </div>
                            }
                        </div>
                        {displayInterpolatedVariables(detectVariables)}
                        <button className='send-to-sheet-button'
                            onClick={() => { handleSaveVariableClass(variableClass, globalParameterBundle) }}>
                            Save Key String
                        </button>
                        <button className='send-to-sheet-button'
                            onClick={() => {
                                handleAddVariable(variableClass, globalParameterBundle);
                                handleCloseCleanup();
                            }}>
                            Add Variable
                        </button>
                        <div className="parameterization-details">
                            {addedParameters.length > 0 && renderAddedParameters()}
                            {selectedInterpolatedVariables && (
                                <div className="variable-details">
                                    <p>Configure for <b style={{ textTransform: "uppercase" }}>{selectedInterpolatedVariables}</b></p>
                                    <button className='configure-button'
                                        onClick={() => configureInterpolatedVariables(selectedInterpolatedVariables)}>
                                        Add
                                    </button>
                                    <button className='configure-button'
                                        onClick={() => {
                                            alert('Save functionality will save the parameters of the specified variable to the database and allow users to load it later. If the variable is already saved in the database it will be updated, but paramter names will be in conflict with the existing ones and prompt the user to either ignore or overwrite. Please make sure to use unique parameter names.');
                                        }}>
                                        Save
                                    </button>
                                    <button className='configure-button'
                                        onClick={() => {
                                            alert('Load functionality will grab relevant data (via variable) from the database and allow users to update the parameterization');
                                        }}>
                                        Load
                                    </button>
                                    <button className='configure-button'
                                        onClick={() => {
                                            alert('Select functionality will allow users to choose from the list of parameters that are already saved in the product manager. This will allow users to select a parameter and apply it to the current variable as long as the variableClass is present in the manager. This will also allow users to select multiple parameters and apply them to the current variable.');
                                        }}>
                                        Select
                                    </button>
                                    <button className='configure-button'
                                        onClick={() => setSelectedInterpolatedVariables(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {showParameterModal && (
                    <ParameterModal
                        onSave={handleParameterSave}
                        onCancel={() => {
                            clearParameter();
                            setShowParameterModal(false);
                        }}
                        parameterName={localParameter.parameterName}
                        addedParameter={localParameter.addedParameter}
                        setLocalParameter={setLocalParameter}
                        intVarValue={selectedInterpolatedVariables || ''}
                    />
                )}
            </div>
            <ToastContainer />
        </div>
    );
};

export default ParameterizationTab;