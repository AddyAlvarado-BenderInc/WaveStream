import React, { useState, useEffect } from 'react';
import { addParameter, clearParameter, setVariableClass, addVariableClassArray, setParameterBundle } from '@/app/store/productManagerSlice';
import ParameterModal from '../ParameterModal/component';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { RootState } from '@/app/store/store';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';

interface VariableDataState {
    mainKeyString: [string, any];
}

interface ParameterizationTabProps {
    saveMainKeyString: (object: VariableDataState) => void;
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

const ParameterizationTab: React.FC<ParameterizationTabProps> = ({ variableClass, onClose, saveMainKeyString }) => {
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

    const handleSaveVariableClass = (object: Object, param: BundlizedParameters[]) => {
        if (!object) {
            toast.error('Key String is empty');
            return;
        }
        toast.success('Key String saved successfully');
        dispatch(setVariableClass(object));

        const mainKeyString = Object.entries(object)
            .filter(([key, value]) => key !== 'task' && key !== 'type' && value);
        console.log('Main Key String: ', mainKeyString);

        const transformedParams = param.map((p) => ({
            id: p.id,
            variable: p.variable,
            parameterName: p.parameterName,
            addedParameter: p.addedParameter,
        }));

        dispatch(setParameterBundle(transformedParams));
    };


    const cleanedInputValues = (object: any) => {
        if (!object || typeof object !== 'object') {
            return { value: '', detectVariables: [] };
        }

        const taskValue = object.task || '';
        const typeValue = object.type || '';

        const taskToKeys: Record<string, string[]> = {
            'Text Line': ['stringInput'],
            'Number': ['integerInput'],
            'Description': ['textareaInput'],
            'Special Instructions': ['escapeSequence'],
            'File Upload': ['linkedInput'],
        };

        const allowedKeys = taskToKeys[taskValue] || [];

        const filteredEntries = Object.entries(object)
            .filter(([key, value]) => {
                if (key === 'task' || key === 'type') return false;
                const isKeyAllowed = allowedKeys.includes(key);
                const isValueValid = value !== "" && value !== "0" && value !== false;
                return isKeyAllowed && isValueValid;
            });

        let value = `${taskValue}\n${typeValue}`;

        if (filteredEntries.length > 0) {
            const filteredObject = Object.fromEntries(filteredEntries);
            const otherValues = JSON.stringify(filteredObject, null, 2)
                .replace(/[{},"]/g, '')
                .trim();

            value += `\n\n${otherValues}`;
        }

        const inputNames = ['stringInput', 'integerInput', 'textareaInput', 'escapeSequence', 'linkedInput'];
        inputNames.forEach(name => {
            value = value.replace(new RegExp(`${name}:\\s?`, 'g'), '');
        });

        const detectVariables = value.match(/\%\w+/g) || [];
        return { value, detectVariables };
    };

    const { value, detectVariables } = cleanedInputValues(variableClass);

    const displayOnlyType = (value: string) => {
        const allowedKeys = [
            'Text Line',
            'Number',
            'Description',
            'Special Instructions',
            'File Upload',
            'String',
            'Integer',
            'Textarea',
            'EscapeSequence',
            'Linked'
        ];

        const keyPattern = new RegExp(
            `\\b(${allowedKeys.join('|')})\\b`,
            'gi'
        );

        const filteredParts = value
            .split(keyPattern)
            .filter(part => {
                const isAllowed = part && allowedKeys.includes(part.trim());
                return isAllowed;
            });

        return filteredParts.length > 0
            ? `${filteredParts[0]}${filteredParts.slice(1).map((p, i) =>
                i === 0 ? ` | ${p}` : ` ${p}`).join('')}`
            : '';
    };

    const displayOnlyValue = (value: string) => {
        const removeKeys = [
            'Text Line',
            'Number',
            'Description',
            'Special Instructions',
            'File Upload',
            'String',
            'Integer',
            'Textarea',
            'EscapeSequence',
            'Linked'
        ];
        const keyPattern = new RegExp(
            `\\b(${removeKeys.join('|')})\\b`,
            'gi'
        );

        const filteredParts = value
            .split(keyPattern)
            .filter(part => {
                const isAllowed = part && removeKeys.includes(part.trim());
                return !isAllowed;
            });
        return filteredParts;
    };

    // TODO: will work on later, use integerOptions as an argument
    const handleIntegerOptions = (value: string) => {
        switch (value) {
            case 'All':
                break;
            case 'Increment':
                break;
            case 'Range':
                break;
            default:
                break;
        };
    };

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
        if (!selectedInterpolatedVariables || !localParameter.parameterName || !localParameter.addedParameter) {
            alert('Please fill all fields');
            return;
        }

        dispatch(addParameter({
            id: Date.now(),
            variable: selectedInterpolatedVariables,
            parameterName: localParameter.parameterName,
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
                name: localParameter.parameterName,
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

    const generateCombinations = (groupedParams: Record<string, string[]>) => {
        const keys = Object.keys(groupedParams);
        const values = keys.map((key) => groupedParams[key]);
        const combinations = cartesianProduct(values);

        return combinations.map((combo) => {
            const result: Record<string, string> = {};
            keys.forEach((key, index) => {
                result[key] = combo[index];
            });
            return result;
        });
    };

    const cartesianProduct = (arrays: string[][]): string[][] => {
        return arrays.reduce(
            (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
            [[]] as string[][]
        );
    };

    const handleAddVariable = (object: object, param: BundlizedParameters[]) => {
        const { stringInput } = object as Record<string, string>;

        const groupedParams = param.reduce((acc, item) => {
            if (!acc[item.variable]) {
                acc[item.variable] = [];
            }
            acc[item.variable].push(item.addedParameter);
            return acc;
        }, {} as Record<string, string[]>);

        const variables = Object.keys(groupedParams);
        const combinations = generateCombinations(groupedParams);

        const variableData = combinations.map((combo) => {
            let result = stringInput;
            variables.forEach((variable) => {
                result = result.replace(`%{${variable}}`, combo[variable]);
            });
            return result;
        });

        const index = variableData.length;

        const payload = {
            name: localVariableName,
            index,
            variableData,
        };

        console.log("Generated Payload:", JSON.stringify(payload, null, 2));
        dispatch(addVariableClassArray(payload));
        onClose();
    };

    const handleCreateName = (name: string) => {
        const cleanedName = name.replace(/[^a-zA-Z0-9]/g, '');
        return cleanedName;
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                    className="close-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
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
                            onClick={() => { handleAddVariable(variableClass, globalParameterBundle) }}>
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