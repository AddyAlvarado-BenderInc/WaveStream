import { useState, useEffect } from 'react';
import { addParameter, clearParameter, setVariableClass } from '@/store/slice';
import ParameterModal from '../ParameterModal/component';
import { useDispatch } from 'react-redux';
import React from 'react';
import './style.css';

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

const ParameterizationTab: React.FC<ParameterizationTabProps> = ({ variableClass, onClose }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [intVar, setIntVar] = useState<string[]>([]);
    const [selectedInterpolatedVariables, setSelectedInterpolatedVariables] = useState<string | null>(null);
    const [showParameterModal, setShowParameterModal] = useState(false);
    const [integerOptions, setIntegerOptions] = useState<string | null>(null);
    const [addedParameters, setAddedParameters] = useState<AddedParameter[]>([]);
    const [localParameter, setLocalParameter] = useState({
        parameterName: '',
        addedParameter: ''
    });

    const dispatch = useDispatch();

    const handleSaveVariableClass = (object: Object) => {
        if (!object) {
            alert('Variable class is empty');
            return;
        }
        alert('Variable class saved successfully');
        dispatch(setVariableClass(object));
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

    // const handleSendToSheet = (object: object) => {
        // Take current variable class as an object, separate from other task/types by extracting type and task.
        // Parsed data must match task/type, for example if type is string, accept only stringInput with intVar string parameters...

        // For any String values with Text Line task | String type or Description task | Textarea type, the below will occur:
        // Will take the param.value from the renderedAddedParameters then creates an array of strings based off of the cleanedInputValue
        // The detectVariables variable will be replaced by the mapped param.value and append to the original value of the string creating
        // an array of strings with the original value and the individual param.value and distinguishing sets with param.variable

        // For example, if param.variable = color and param.value = [red, blue, green] and the original value = Bender %color, the sheetValue will be:
        // [Bender red, Bender blue, Bender green]. This can occur if the original value with the intVar [A string with a percentage sign infront of it]
        // also has multiple of the intVar. 
        // Original = Bender %brand %color %size
        // param.variable = [brand, color, size]
        // param.value = [Nike, Adidas, Puma, red, blue, green, S, M, L, XL]
        // Established mapped variable and value assignment = [brand: "Nike", brand: "Adidas", brand: "Puma", color: "red", color: "blue"... etc.]
        // Expected sheetValue = [Bender Nike red S, Bender Nike blue S, Bender Nike green S... etc.]
        // Values must be unique and cannot match another value in the sheetValue, and sheeValue must iterate through all possible varieties
        // Values must also be contained within the variable parameters so nothing like [Bender Nike Adidas Puma red blue green S M L XL] or 
        // like varieties will occur.

        // This function will handle the object and convert it into an array of strings which will be sent as a prop to the table component
        // Table component will prompt user to choose which column to send the array and convert the array into strings
        // Table component must have an origin column/class key header, if none are present, the first class key the user sends data 
        // to will be assigned as the origin class key header
    // }    

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
                <h2>Parameterization Details</h2>
                <div>{displayOnlyType(value)}</div>
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
                    onClick={() => { handleSaveVariableClass(variableClass) }}>
                    Save Variable Class
                </button>
                <button className='send-to-sheet-button'
                    onClick={() => null}>
                    Send To Sheet
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
        </div>
    );
};

export default ParameterizationTab;