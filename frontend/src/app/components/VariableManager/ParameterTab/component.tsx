import React, { useState, useEffect, useRef } from 'react';
import {
    addParameter,
    clearParameter,
    setVariableClass,
    addVariableClassArray,
    setParameterBundle,
    clearAllParameters,
    deleteVariableClassArray
} from '@/app/store/productManagerSlice';
import {
    cleanedInputValues,
    displayOnlyType,
    displayOnlyValue,
    generateCombinations,
    handleCreateName,
} from './VariableUtility/utility';
import ParameterModal from '../ParameterModal/component';
import TaggingModal from './VariableUtility/tagModule';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { RootState } from '@/app/store/store';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';
import { mainKeyString } from '../../../../../types/productManager';

interface ParameterizationTabProps {
    variableClass: object;
    onClose: () => void;
    editingItemId?: number | null;
    initialName?: string | null;
    initialParams?: BundlizedParameters[] | null;
    variableClassArray?: Array<{
        dataId: number;
        name: string;
        dataLength: number;
        variableData: Record<string, {
            dataId: number;
            value: string;
        } | null>;
    } | null | undefined>
}

interface AddedParameter {
    id: number;
    variable: string;
    name: string;
    value: string;
    tags: string[];
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
    fileInput: string;
    task: string;
    type: string;
}

const ParameterizationTab: React.FC<ParameterizationTabProps> = ({ variableClass, onClose, initialName, initialParams, editingItemId, variableClassArray }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [intVar, setIntVar] = useState<string[]>([]);
    const [selectedInterpolatedVariables, setSelectedInterpolatedVariables] = useState<string | null>(null);
    const [showParameterModal, setShowParameterModal] = useState(false);
    const [integerOptions, setIntegerOptions] = useState<string | null>(null);
    const [selectVariables, setSelectVariables] = useState<boolean>(false);
    const [selectModalValue, setSelectModalValue] = useState<string>('');
    const [showTaggingModal, setShowTaggingModal] = useState(false);
    const [taggingParameter, setTaggingParameter] = useState<AddedParameter | null>(null);
    const [addedParameters, setAddedParameters] = useState<AddedParameter[]>(() => {
        if (initialParams && initialParams.length > 0) {
            return initialParams.map(p => ({
                id: p.id,
                variable: p.variable,
                name: p.parameterName,
                value: p.addedParameter,
                tags: [],
            }));
        }
        return [];
    });
    const [openNameModal, setOpenNameModal] = useState(!!editingItemId);
    const [localVariableName, setLocalVariableName] = useState<string>(initialName || '');
    const [localParameter, setLocalParameter] = useState({
        parameterName: '',
        addedParameter: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const globalParameterBundle = useSelector((state: RootState) => state.parameter.parameters);
    const currentVariableClassArray = useSelector((state: RootState) => state.variables.variableClassArray);

    const dispatch = useDispatch();

    const { value, detectVariables } = cleanedInputValues(variableClass);

    useEffect(() => {
        if (editingItemId && initialName) {
            setLocalVariableName(initialName);
            setOpenNameModal(true);
        }
        if (editingItemId && initialParams) {
            setAddedParameters(initialParams.map(p => ({
                id: p.id,
                variable: p.variable,
                name: p.parameterName,
                value: p.addedParameter,
                tags: [],
            })));
        }
    }, [editingItemId, initialName, initialParams]);

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

    const handleAddParameterVariable = () => {
        if (!selectedInterpolatedVariables || !localParameter.addedParameter) {
            alert('Please enter a parameter value.');
            return;
        }

        const parameterName = localParameter.parameterName ? localParameter.parameterName : localParameter.addedParameter;
        const parameterValue = localParameter.addedParameter;

        const existingParamIndex = addedParameters.findIndex(p =>
            p.variable === selectedInterpolatedVariables &&
            p.name === parameterName
        );

        if (existingParamIndex > -1) {
            setAddedParameters(prev => {
                const updated = [...prev];
                updated[existingParamIndex] = {
                    ...updated[existingParamIndex],
                    value: parameterValue
                };
                return updated;
            });
            toast.info(`Updated parameter value for %{${selectedInterpolatedVariables}} - ${parameterName}`);
        } else {
            const newParam: AddedParameter = {
                id: Date.now(),
                variable: selectedInterpolatedVariables,
                name: parameterName,
                value: parameterValue,
                tags: []
            };
            setAddedParameters(prev => [...prev, newParam]);
            dispatch(addParameter({ ...newParam, parameterName: newParam.name, addedParameter: newParam.value }));
        }

        setLocalParameter({ parameterName: '', addedParameter: '' });
        setShowParameterModal(false);
    };

    const handleTagging = (parameterToTag: AddedParameter) => {
        console.log("Opening tagging for:", parameterToTag);
        setTaggingParameter(parameterToTag);
        setShowTaggingModal(true);
    };

    const handleSaveTags = (newTags: string[]) => {
        if (!taggingParameter) return;

        setAddedParameters(prev =>
            prev.map(p =>
                p.id === taggingParameter.id
                    ? { ...p, tags: newTags }
                    : p
            )
        );
        setShowTaggingModal(false);
        setTaggingParameter(null);
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
                                <th>Tags</th>
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
                                    <td className='parameter-tags-display'>
                                        {param.tags && param.tags.length > 0
                                            ? param.tags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="tag-badge">
                                                    {tag}
                                                </span>
                                            ))
                                            : <i>Untagged</i>
                                        }
                                    </td>
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
                                            Edit Value
                                        </button>
                                        <button
                                            className='tag-button'
                                            onClick={() => handleTagging(param)}
                                        >
                                            Edit Tags
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
        setShowTaggingModal(false);
        setTaggingParameter(null);
    };

    
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
        const { task, type, stringInput, textareaInput, integerInput, fileInput } = object as VariableClasses;

        if (type === "String" && task === "Text Line" || type === "Linked") {
            inputString = stringInput || "";
        } else if (type === "Textarea" && task === "Description") {
            inputString = textareaInput || "";
        } else if (type === "Integer" && task === "Number") {
            inputString = integerInput || "";
        } else if (type === "String" && task === "Linked Media") {
            inputString = fileInput || "";
        }

        else if (stringInput) {
            inputString = stringInput;
        }

        console.log('handleAddVariable - Determined Input String:', inputString);
        console.log('handleAddVariable - Parameters Received (param):', JSON.stringify(param, null, 2));


        const detectedVars = inputString.match(/\%\{(.*?)\}/g)?.map(v => v.replace(/[%{}]/g, '')) || [];
        console.log("handleAddVariable - Detected variables in inputString:", detectedVars);

        const relevantParams = addedParameters.filter(p => detectedVars.includes(p.variable));
        const relevantParamsExist = detectedVars.length > 0 && relevantParams.length > 0;
        console.log("handleAddVariable - Relevant parameters from state (with tags):", JSON.stringify(relevantParams, null, 2));
        console.log("handleAddVariable - Relevant parameters exist:", relevantParamsExist);

        let variableData: string[] = [];
        let dataLength = 0;

        if (detectedVars.length > 0 && relevantParamsExist) {
            console.log("handleAddVariable - Running COMBINATION logic.");

            const groupedParamsWithTags = relevantParams.reduce((acc, item) => {
                if (!acc[item.variable]) {
                    acc[item.variable] = [];
                }                
                acc[item.variable].push({ value: item.value, tags: item.tags || [] });
                return acc;
            }, {} as Record<string, { value: string; tags: string[] }[]>); 
            console.log("handleAddVariable - Grouped Relevant Params (with tags):", JSON.stringify(groupedParamsWithTags, null, 2));

            const hasValuesForAllDetectedVars = detectedVars.every(v => groupedParamsWithTags[v] && groupedParamsWithTags[v].length > 0);

            if (!hasValuesForAllDetectedVars) {
                console.warn("handleAddVariable - Missing parameter values for some detected variables. Treating as single item.");
                variableData = [inputString];
            } else {
                const combinations = generateCombinations(groupedParamsWithTags);
                console.log("handleAddVariable - Generated Combinations (from tagged logic):", JSON.stringify(combinations, null, 2));

                if (!combinations || combinations.length === 0) {
                    console.warn("handleAddVariable - generateCombinations returned empty or invalid result. Treating as single item.");
                    variableData = [inputString];
                } else {
                    variableData = combinations.map(combo => {
                        let result = inputString;
                        detectedVars.forEach((variableKey) => {
                            if (combo.hasOwnProperty(variableKey)) {
                                const replacementValue = combo[variableKey];
                                const regex = new RegExp(String.raw`\%\{${variableKey}\}`, 'g');
                                console.log(`---> Replacing '%{${variableKey}}' with '${replacementValue}' in: '${result}'`); 
                                result = result.replace(regex, String(replacementValue));
                                console.log(`---> Result after replace: '${result}'`); 
                            } else {
                                console.warn(`---> Combo object missing expected key from inputString: ${variableKey}`, combo);
                            }
                         });
                        return result;
                    });
                    console.log("handleAddVariable - Final Generated variableData array:", variableData);
                }
            }
        } else {
            console.log("handleAddVariable - Running SINGLE item logic (no vars or no params).");
            variableData = [inputString];
        }

        dataLength = variableData.length;
        const maxId = currentVariableClassArray.reduce((max, item) => {
            const currentId = (item && typeof item.dataId === 'number') ? item.dataId : 0;
            if (editingItemId && currentId === editingItemId) {
                return max;
            }
            return Math.max(max, currentId);
        }, 0);
        const uniqueDataId = maxId + 1;

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

        if (editingItemId !== null && editingItemId !== undefined) {
            console.log(`Editing: Deleting old item with ID ${editingItemId}`);
            dispatch(deleteVariableClassArray(editingItemId));
        }
        console.log(`Dispatching addVariableClassArray with ID ${uniqueDataId}`);
        console.log("Final Payload:", JSON.stringify(payload, null, 2));
        dispatch(addVariableClassArray(payload));
        onClose();
    };

    
    const handleVariableSave = async (id: number, item: Record<string, any>): Promise<void> => {
        alert('Save functionality will save the parameters of the specified variable to the database and allow users to load it later. If the variable is already saved in the database it will be updated, but parameter names with similar values will be in conflict with the existing ones and prompt the user to either ignore or overwrite.');
        const uniqueId = id * Date.now();
        const idString = uniqueId.toString();
        const response = await fetch('http://localhost:3000/api/productManager/interpolatedVariables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: idString,
                item: item,
            }),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Save successful:', data);
        } else {
            const error = await response.json();
            console.error('Save failed:', error);
            toast.error('Failed to save variable.');
        }
    };

    
    const handleVariableLoad = () => {
        alert('Load functionality will grab relevant data (via variable) from the database and allow users to update the parameterization');
        try {
            const response = fetch('http://localhost:3000/api/productManager/interpolatedVariables', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
        } catch (error) {
            console.error('Load failed:', error);
            toast.error('Failed to load variable.');
        } finally {
            console.log('Load completed');
        }
    };

    
    const displayLoadedVariables = () => {

    };

    const handleImportVariables = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (!selectedInterpolatedVariables) {
            toast.warn("Please select a variable placeholder (like %{...}) first before loading parameters.");
            return;
        }
        fileInputRef.current?.click();
    }

    const parseCsvForImport = (content: string): string[] => {
        const lines = content.split(/[\r\n]+/).filter(line => line.trim() !== '');
        if (lines.length < 1) return [];
        return lines.slice(1).map(line => {
            const columns = line.split(',');
            return columns[0]?.trim();
        }).filter((value): value is string => !!value);
    };

    const parseTxtForImport = (content: string): string[] => {
        return content.split(/[\r\n]+/)
            .map(line => line.trim())
            .filter(line => line !== '');
    };

    const parseJsonForImport = (content: string): string[] => {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                return parsed.filter(item => item.trim() !== '');
            } else {
                throw new Error('JSON structure invalid. Expected an array of strings.');
            }
        } catch (e) {
            console.error("JSON parse error:", e);
            throw new Error("Invalid JSON format.");
        }
    };

    const addImportedParameters = (values: string[], variable: string) => {
        const newParameters: AddedParameter[] = values.map(valueStr => ({
            id: Date.now() + Math.random(),
            variable: variable,
            name: valueStr,
            value: valueStr,
            tags: []
        }));

        setAddedParameters(prevParams => {
            const existingSignatures = new Set(prevParams.map(p => `${p.variable}|${p.name}|${p.value}`));
            const uniqueNewParams = newParameters.filter(newP => !existingSignatures.has(`${newP.variable}|${newP.name}|${newP.value}`));

            if (uniqueNewParams.length === 0) {
                toast.info(`All imported values for %{${variable}} are already present.`);
                return prevParams;
            }
            return [...prevParams, ...uniqueNewParams];
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (event.target) {
            event.target.value = '';
        }

        if (!file) {
            return;
        }

        if (!selectedInterpolatedVariables) {
            toast.error("Internal error: No variable selected for import.");
            return;
        }

        const fileName = file.name.toLowerCase();
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content === null || content === undefined) {
                toast.error("Could not read file content.");
                return;
            }

            try {
                let importedValues: string[] = [];

                if (fileName.endsWith('.csv')) {
                    importedValues = parseCsvForImport(content);
                } else if (fileName.endsWith('.txt')) {
                    importedValues = parseTxtForImport(content);
                } else if (fileName.endsWith('.json')) {
                    importedValues = parseJsonForImport(content);
                } else {
                    toast.error("Unsupported file type. Please use .csv, .txt, or .json");
                    return;
                }

                if (importedValues.length === 0) {
                    toast.warn("No valid values extracted from the file.");
                    return;
                }

                addImportedParameters(importedValues, selectedInterpolatedVariables);
            } catch (error: any) {
                console.error("Error processing file:", error);
                toast.error(`Failed to process file: ${error.message || 'Unknown error'}`);
            }
        };

        reader.onerror = () => {
            toast.error("Error reading file.");
        };

        reader.readAsText(file);
    };

    const handleVariableSelect = (selectedValue: string) => {
        console.log(`Handling selection for: ${selectedValue}`);

        if (!selectedInterpolatedVariables) {
            toast.warn('Please select a placeholder (like %{item}) to configure before adding parameters.');
            return;
        }

        if (!selectedValue) {
            console.warn('No selected value provided.');
            toast.warn('Please select a variable.');
            return;
        }

        const selectedItem = currentVariableClassArray.find(item => item?.name === selectedValue);

        if (!selectedItem) {
            console.warn(`Could not find item in currentVariableClassArray with name: ${selectedValue}`);
            toast.error(`Selected variable "${selectedValue}" not found.`);
            return;
        }

        const variableData = selectedItem.variableData;

        if (variableData && typeof variableData === 'object') {
            const extractedValues = Object.values(variableData)
                .map(valueObj => valueObj?.value)
                .filter((value): value is string => typeof value === 'string');

            console.log('Extracted Values to Add:', extractedValues);

            if (extractedValues.length === 0) {
                toast.info(`No values found in the selected variable "${selectedValue}".`);
                return;
            }

            const firstValue = extractedValues[0];
            setLocalParameter({
                parameterName: firstValue,
                addedParameter: firstValue
            });

            const newParametersToAdd: AddedParameter[] = extractedValues.map((valueStr) => ({
                id: Date.now() + Math.random(),
                variable: selectedInterpolatedVariables,
                name: valueStr,
                value: valueStr,
                tags: [],
            }));

            setAddedParameters(prevParams => {
                const existingSignatures = new Set(prevParams.map(p => `${p.variable}|${p.name}|${p.value}`));
                const uniqueNewParams = newParametersToAdd.filter(newP => !existingSignatures.has(`${newP.variable}|${newP.name}|${newP.value}`));

                if (uniqueNewParams.length === 0) {
                    toast.info(`Values from "${selectedValue}" are already present for %{${selectedInterpolatedVariables}}.`);
                    return prevParams;
                }
                return [...prevParams, ...uniqueNewParams];
            });

        } else {
            console.warn(`Variable data object not found or invalid for the selected item: ${selectedValue}`);
            toast.warn(`Data structure issue for ${selectedValue}.`);
        }
    };

    
    const saveMainKeyString = (payload: { mainKeyString: mainKeyString[] }) => {
        const { mainKeyString } = payload;
        const response = fetch('http://localhost:3000/api/productManager/mainKeyString', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mainKeyString: mainKeyString,
            }),
        });
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
                {selectVariables && (
                    <div className="select-variable-modal">
                        <h1>Select Variables</h1>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!selectModalValue) {
                                    toast.warn('Please select a variable.');
                                    return;
                                }
                                handleVariableSelect(selectModalValue);
                                setSelectVariables(false);
                                setSelectModalValue('');
                            }}
                        >
                            <select
                                value={selectModalValue}
                                onChange={(e) => setSelectModalValue(e.target.value)}
                                required
                            >
                                <option value="" disabled>-- Select a variable --</option>
                                {Array.isArray(variableClassArray) && variableClassArray.map((item) => (
                                    item ? (
                                        <option key={item.dataId} value={item.name}>
                                            {item.name}
                                        </option>
                                    ) : null
                                ))}
                            </select>
                            <div className="modal-buttons">
                                <button type="submit" className="select-button">
                                    Select
                                </button>
                                <button
                                    type="button"
                                    className="close-button"
                                    onClick={() => {
                                        setSelectVariables(false);
                                        setSelectModalValue('');
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                <div className={selectVariables ? `tool-modals-overlay` : `tool-modals-overlay-no-select`} />
                {(openNameModal || editingItemId) && (
                    <div className='modalContent'>
                        <h2>{editingItemId ? 'Edit Parameterization' : 'Parameterization Details'}</h2>
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
                        {/* <button className='send-to-sheet-button'
                            onClick={() => { handleSaveVariableClass(variableClass, globalParameterBundle) }}>
                            Save Key String
                        </button> */}
                        <button className='send-to-sheet-button'
                            onClick={() => {
                                handleAddVariable(variableClass, globalParameterBundle);
                                handleCloseCleanup();
                            }}>
                            {editingItemId ? 'Update Variable' : 'Add Variable'}
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
                                        onClick={handleImportVariables}>
                                        Import
                                    </button>
                                    <button className='configure-button'
                                        onClick={() => {
                                            setSelectVariables(true);
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
                        onSave={handleAddParameterVariable}
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
                {showTaggingModal && taggingParameter && (
                    <TaggingModal
                        isOpen={showTaggingModal}
                        onClose={() => {
                            setShowTaggingModal(false);
                            setTaggingParameter(null);
                        }}
                        parameterName={taggingParameter.name}
                        parameterValue={taggingParameter.value}
                        currentTags={taggingParameter.tags || []}
                        onSaveTags={handleSaveTags}
                    />
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.txt,.json"
                    style={{ display: 'none' }}
                />
            </div>
            <ToastContainer />
        </div>
    );
};

export default ParameterizationTab;