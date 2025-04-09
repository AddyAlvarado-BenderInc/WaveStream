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
    const [integerOptions, setIntegerOptions] = useState(false);
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
    const numberedValue = cleanedInputValues(variableClass).value.replace("Integer", "").replace("Number", "").trim();

    // TODO: Currently adjusting the numbered value before manipulation
    const displayIntegerVariables = (value: string) => {
        if (value.length === 0) {
            return null;
        }
        return (
            <div className='interpolated-variable-editor'>
                <b style={{ textTransform: "uppercase" }}>{value}</b>
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

        dispatch(clearParameter());

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
                <pre>{value}</pre>
                {displayIntegerVariables(numberedValue)}
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